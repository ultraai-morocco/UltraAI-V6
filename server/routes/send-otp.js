const express = require("express");
const router = express.Router();

const { sendOTP } = require("../email");

/*
 * OTP storage
 *
 * Deno Deploy:
 *   Deno KV
 *
 * Termux / Node:
 *   RAM fallback
 */

const codes = {};

let kvPromise = null;

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

        const email =
            String(req.body.email || "")
                .trim()
                .toLowerCase();

        if (!email) {

            return res.json({
                success: false,
                message: "البريد الإلكتروني مطلوب"
            });

        }

        const code =
            Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

        const data = {

            code,

            expires:
                Date.now() +
                10 * 60 * 1000

        };

        await saveOTP(email, data);

        try {

            await sendOTP(email, code);

        } catch (e) {

            await deleteOTP(email);

            throw e;
        }

        return res.json({

            success: true,

            message: "تم إرسال رمز التحقق"

        });

    } catch (e) {

        console.error(
            "SEND OTP ERROR:",
            e
        );

        return res.json({

            success: false,

            message: "فشل إرسال البريد"

        });

    }

});


module.exports = {

    router,

    codes,

    getOTP,

    deleteOTP

};
