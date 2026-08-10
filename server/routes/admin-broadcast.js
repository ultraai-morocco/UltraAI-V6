const express = require("express");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const router = express.Router();

const auth = require("../auth");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const GLOBAL_FILE =
    path.join(
        __dirname,
        "..",
        "data",
        "global-chat.json"
    );


function isAdmin(user) {

    return (
        user &&
        String(user.id) ===
        String(process.env.ULTRAAI_ADMIN_ID)
    );

}


function adminOnly(req, res, next) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول."
        });

    }

    const user =
        auth.verifyToken(token);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "رمز الدخول غير صالح."
        });

    }

    if (!isAdmin(user)) {

        return res.status(403).json({
            success: false,
            message: "غير مسموح. هذه العملية خاصة بالإدارة."
        });

    }

    req.admin = user;

    next();

}


function loadMessages() {

    try {

        return JSON.parse(
            fs.readFileSync(
                GLOBAL_FILE,
                "utf8"
            ) || "[]"
        );

    } catch {

        return [];

    }

}


function saveMessages(messages) {

    fs.writeFileSync(
        GLOBAL_FILE,
        JSON.stringify(
            messages,
            null,
            2
        )
    );

}


/*
 * =========================================
 * ADMIN BROADCAST
 * =========================================
 *
 * POST /admin-broadcast
 *
 * Admin يرسل رسالة واحدة لجميع المستخدمين.
 *
 * الرسالة الأصلية بالعربية،
 * وGroq يقوم بإنشاء:
 *
 * ar
 * fr
 * en
 *
 */

router.post("/", adminOnly, async (req, res) => {

    try {

        const message =
            String(
                req.body.message || ""
            ).trim();


        if (!message) {

            return res.status(400).json({
                success: false,
                message: "كتب الرسالة أولاً."
            });

        }


        if (message.length > 2000) {

            return res.status(400).json({
                success: false,
                message: "الرسالة طويلة بزاف. الحد الأقصى 2000 حرف."
            });

        }


        console.log(
            "📢 ADMIN BROADCAST:",
            message
        );


        /*
         * ترجمة الرسالة
         */

        let translations = {

            ar: message,

            fr: message,

            en: message

        };


        try {

            const completion =
                await groq.chat.completions.create({

                    model:
                        "llama-3.3-70b-versatile",

                    temperature:
                        0.2,

                    messages: [

                        {
                            role: "system",

                            content:
                                `
أنت مترجم داخل تطبيق UltraAI.

ترجم النص العربي إلى الفرنسية والإنجليزية.

مهم جداً:
- لا تضف شرحاً.
- لا تضف عناوين.
- لا تغير المعنى.
- حافظ على الإيموجي.
- أرجع JSON صالح فقط بهذا الشكل:

{
  "fr": "الترجمة الفرنسية",
  "en": "الترجمة الإنجليزية"
}
`
                        },

                        {
                            role: "user",

                            content:
                                message

                        }

                    ]

                });


            const raw =
                completion
                    ?.choices?.[0]
                    ?.message
                    ?.content
                    ?.trim();


            if (raw) {

                let cleaned = raw
                    .replace(/^```json/i, "")
                    .replace(/^```/i, "")
                    .replace(/```$/i, "")
                    .trim();


                const translated =
                    JSON.parse(cleaned);


                if (
                    translated.fr &&
                    translated.en
                ) {

                    translations.fr =
                        String(
                            translated.fr
                        ).trim();

                    translations.en =
                        String(
                            translated.en
                        ).trim();

                }

            }

        } catch (translationError) {

            /*
             * إذا فشلت الترجمة،
             * الرسالة العربية تبقى صالحة.
             */

            console.error(
                "BROADCAST TRANSLATION ERROR:",
                translationError.message
            );

        }


        const messages =
            loadMessages();


        const broadcast = {

            id:
                Date.now(),

            userId:
                req.admin.id,

            username:
                "UltraAI",

            message:
                message,

            isAdminBroadcast:
                true,

            translations,

            time:
                new Date()
                    .toLocaleString("ar-MA")

        };


        messages.push(
            broadcast
        );


        /*
         * الاحتفاظ بآخر 500 رسالة
         */

        if (
            messages.length > 500
        ) {

            messages.splice(
                0,
                messages.length - 500
            );

        }


        saveMessages(messages);


        console.log(
            "📢 BROADCAST SENT:",
            broadcast.id
        );


        return res.json({

            success: true,

            message:
                "تم إرسال الرسالة لجميع المستخدمين.",

            broadcast: {

                id:
                    broadcast.id,

                translations

            }

        });


    } catch (error) {

        console.error(
            "ADMIN BROADCAST ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "تعذر إرسال رسالة الإدارة."

        });

    }

});


module.exports = router;
