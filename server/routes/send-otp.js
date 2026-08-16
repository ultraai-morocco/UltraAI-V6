const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { sendOTP } = require("../email");

/*
 * OTP SECURITY
 *
 * Deno Deploy:
 *   Deno KV
 *
 * Termux / Node:
 *   RAM fallback
 *
 * Security:
 *   - cryptographically secure OTP
 *   - 10 minute expiration
 *   - maximum verification attempts
 *   - resend cooldown
 */

const codes = {};
let kvPromise = null;

const OTP_TTL = 10 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;
const MAX_ATTEMPTS = 5;

async function getKV() {
    if (
        typeof Deno === "undefined" ||
        typeof Deno.openKv !== "function"
    ) {
        return null;
    }

    if (!kvPromise) {
        kvPromise = Deno.openKv();
    }

    return await kvPromise;
}

function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

async function saveOTP(email, data) {
    const kv = await getKV();

    if (kv) {
        await kv.set(
            ["ultraai", "otp", email],
            data
        );
        return;
    }

    codes[email] = data;
}

async function getOTP(email) {
    const kv = await getKV();

    if (kv) {
        const result = await kv.get(
            ["ultraai", "otp", email]
        );

        return result.value || null;
    }

    return codes[email] || null;
}

async function deleteOTP(email) {
    const kv = await getKV();

    if (kv) {
        await kv.delete(
            ["ultraai", "otp", email]
        );
        return;
    }

    delete codes[email];
}

router.post("/", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "البريد الإلكتروني مطلوب"
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "البريد الإلكتروني غير صالح"
            });
        }

        const existing = await getOTP(email);

        /*
         * Prevent repeated OTP requests.
         */
        if (
            existing &&
            existing.createdAt &&
            Date.now() - existing.createdAt < RESEND_COOLDOWN
        ) {
            const remaining = Math.ceil(
                (
                    RESEND_COOLDOWN -
                    (Date.now() - existing.createdAt)
                ) / 1000
            );

            return res.status(429).json({
                success: false,
                message: `انتظر ${remaining} ثانية قبل طلب رمز جديد`
            });
        }

        const code = createOTP();

        const data = {
            code,
            createdAt: Date.now(),
            expires: Date.now() + OTP_TTL,
            attempts: 0
        };

        await saveOTP(email, data);

        try {
            await sendOTP(email, code);
        } catch (error) {
            await deleteOTP(email);

            console.error(
                "SEND OTP EMAIL ERROR:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message: "فشل إرسال البريد"
            });
        }

        return res.json({
            success: true,
            message: "تم إرسال رمز التحقق"
        });

    } catch (error) {
        console.error(
            "SEND OTP ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء إرسال رمز التحقق"
        });
    }
});

module.exports = {
    router,
    codes,
    getOTP,
    saveOTP,
    deleteOTP,
    MAX_ATTEMPTS
};
