const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const kvUsers = require("../kv-users");
const auth = require("../auth");

const {
    parsePhoneNumberFromString
} = require("libphonenumber-js");

const {
    getOTP,
    saveOTP,
    deleteOTP,
    MAX_ATTEMPTS
} = require("./send-otp");

/*
 * COUNTRY DETECTION
 */
function detectCountry(phone) {
    try {
        const parsed = parsePhoneNumberFromString(
            String(phone).trim()
        );

        return parsed && parsed.isValid()
            ? parsed.country
            : null;

    } catch (error) {
        console.error(
            "Country detection error:",
            error.message
        );

        return null;
    }
}

/*
 * USERNAME VALIDATION
 */
function isValidUsername(username) {
    return /^[a-zA-Z0-9_.-]{2,30}$/.test(username);
}

/*
 * EMAIL VALIDATION
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/*
 * PASSWORD VALIDATION
 *
 * Minimum 8 characters.
 */
function isValidPassword(password) {
    return (
        typeof password === "string" &&
        password.length >= 8 &&
        password.length <= 128
    );
}

/*
 * RANDOM USERNAME
 */
router.get(
    "/random-username",
    async (req, res) => {
        try {
            const prefixes = [
                "Ultra",
                "Nova",
                "Pixel",
                "Smart",
                "Future",
                "Vision",
                "Cyber",
                "Alpha",
                "Quantum",
                "Digital"
            ];

            for (
                let attempt = 0;
                attempt < 30;
                attempt++
            ) {
                const prefix =
                    prefixes[
                        crypto.randomInt(
                            0,
                            prefixes.length
                        )
                    ];

                const number =
                    crypto.randomInt(
                        1000,
                        10000
                    );

                const username =
                    `${prefix}${number}`;

                let existing = null;

                try {
                    existing =
                        await kvUsers.findUserByUsername(
                            username
                        );
                } catch (error) {
                    console.error(
                        "RANDOM USERNAME CHECK ERROR:",
                        error.message
                    );

                    continue;
                }

                if (!existing) {
                    return res.json({
                        success: true,
                        username
                    });
                }
            }

            return res.status(503).json({
                success: false,
                message:
                    "تعذر إنشاء اسم عشوائي، حاول مرة أخرى"
            });

        } catch (error) {
            console.error(
                "RANDOM USERNAME ERROR:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "تعذر إنشاء اسم عشوائي"
            });
        }
    }
);

/*
 * REGISTER
 */
router.post("/", async (req, res) => {
    try {
        const {
            username,
            email,
            phone,
            password,
            otp
        } = req.body || {};

        if (
            !username ||
            !email ||
            !phone ||
            !password ||
            !otp
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "جميع الحقول مطلوبة"
            });
        }

        const cleanUsername =
            String(username)
                .trim();

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        const cleanPhone =
            String(phone)
                .trim();

        const cleanOTP =
            String(otp)
                .trim();

        /*
         * USERNAME
         */
        if (!isValidUsername(cleanUsername)) {
            return res.status(400).json({
                success: false,
                message:
                    "اسم المستخدم يجب أن يكون بين 2 و30 حرفاً ويحتوي فقط على الحروف والأرقام و _ . -"
            });
        }

        /*
         * EMAIL
         */
        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message:
                    "البريد الإلكتروني غير صالح"
            });
        }

        /*
         * PASSWORD
         */
        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "كلمة المرور يجب أن تكون بين 8 و128 حرفاً"
            });
        }

        /*
         * OTP FORMAT
         */
        if (!/^\d{6}$/.test(cleanOTP)) {
            return res.status(400).json({
                success: false,
                message:
                    "رمز التحقق غير صالح"
            });
        }

        /*
         * PHONE
         */
        const parsedPhone =
            parsePhoneNumberFromString(
                cleanPhone
            );

        if (
            !parsedPhone ||
            !parsedPhone.isValid()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "رقم الهاتف غير صالح، استعمل الصيغة الدولية مثل +212..."
            });
        }

        const normalizedPhone =
            parsedPhone.number;

        const country =
            detectCountry(normalizedPhone);

        if (!country) {
            return res.status(400).json({
                success: false,
                message:
                    "تعذر تحديد الدولة من رقم الهاتف"
            });
        }

        /*
         * OTP
         */
        const saved =
            await getOTP(cleanEmail);

        if (!saved) {
            return res.status(400).json({
                success: false,
                message:
                    "أرسل رمز التحقق أولاً"
            });
        }

        if (
            !saved.expires ||
            Date.now() > saved.expires
        ) {
            await deleteOTP(cleanEmail);

            return res.status(400).json({
                success: false,
                message:
                    "انتهت صلاحية رمز التحقق"
            });
        }

        const attempts =
            Number(saved.attempts || 0);

        if (attempts >= MAX_ATTEMPTS) {
            await deleteOTP(cleanEmail);

            return res.status(429).json({
                success: false,
                message:
                    "تم تجاوز عدد محاولات رمز التحقق، أرسل رمزاً جديداً"
            });
        }

        if (saved.code !== cleanOTP) {
            saved.attempts = attempts + 1;

            await saveOTP(
                cleanEmail,
                saved
            );

            const remaining =
                Math.max(
                    0,
                    MAX_ATTEMPTS -
                    saved.attempts
                );

            return res.status(400).json({
                success: false,
                message:
                    remaining > 0
                        ? `رمز التحقق غير صحيح. بقيت ${remaining} محاولات`
                        : "تم تجاوز عدد محاولات رمز التحقق، أرسل رمزاً جديداً"
            });
        }

        /*
         * CHECK EXISTING USERNAME
         */
        const existingUsernameUser =
            await kvUsers.findUserByUsername(
                cleanUsername
            );

        if (existingUsernameUser) {
            return res.status(409).json({
                success: false,
                message:
                    "اسم المستخدم مستعمل، اختار اسم آخر"
            });
        }

        /*
         * CHECK EXISTING EMAIL
         */
        const existingUser =
            await kvUsers.findUserByEmail(
                cleanEmail
            );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "البريد الإلكتروني مستعمل"
            });
        }

        /*
         * CHECK EXISTING PHONE
         */
        const existingPhoneUser =
            await kvUsers.findUserByPhone(
                normalizedPhone
            );

        if (existingPhoneUser) {
            return res.status(409).json({
                success: false,
                message:
                    "رقم الهاتف مستعمل"
            });
        }

        /*
         * SECURE USER ID
         */
        const userId =
            crypto.randomUUID();

        /*
         * CREATE USER
         */
        const user = {
            id: userId,
            username: cleanUsername,
            email: cleanEmail,
            phone: normalizedPhone,
            country,
            avatar: "",
            password:
                auth.hashPassword(password),
            createdAt:
                new Date().toISOString()
        };

        await kvUsers.saveUser(user);

        console.log(
            "🟢 REGISTER SAVED:",
            {
                userId: user.id,
                username: user.username
            }
        );

        /*
         * OTP CAN BE USED ONLY ONCE
         */
        await deleteOTP(cleanEmail);

        return res.status(201).json({
            success: true,
            message:
                "تم إنشاء الحساب بنجاح",
            user: {
                id: user.id,
                username: user.username,
                country: user.country
            }
        });

    } catch (error) {
        console.error(
            "REGISTER ERROR:",
            error.message
        );

        if (
            error.message ===
            "USERNAME_TAKEN"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "اسم المستخدم مستعمل، اختار اسم آخر"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "تعذر إنشاء الحساب"
        });
    }
});

module.exports = router;
