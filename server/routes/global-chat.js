const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../auth");
const db = require("../database");

let globalChatKvPromise = null;

async function getGlobalChatKV() {
    if (
        typeof Deno === "undefined" ||
        typeof Deno.openKv !== "function"
    ) {
        return null;
    }

    if (!globalChatKvPromise) {
        globalChatKvPromise = Deno.openKv();
    }

    return await globalChatKvPromise;
}

const GLOBAL_CHAT_KEY = ["ultraai", "global-chat", "messages"];

async function loadGlobalMessages() {
    const kv = await getGlobalChatKV();

    if (kv) {
        const result = await kv.get(GLOBAL_CHAT_KEY);

        if (Array.isArray(result.value)) {
            return result.value;
        }

        return [];
    }

    // Fallback لـ Termux / Node
    try {
        return JSON.parse(
            fs.readFileSync(FILE, "utf8")
        );
    } catch {
        return [];
    }
}

async function saveGlobalMessages(data) {
    const kv = await getGlobalChatKV();

    if (kv) {
        await kv.set(GLOBAL_CHAT_KEY, data);
        return;
    }

    // Fallback لـ Termux / Node
    fs.writeFileSync(
        FILE,
        JSON.stringify(data, null, 2)
    );
}

const FILE =
    path.join(
        __dirname,
        "..",
        "data",
        "global-chat.json"
    );


function load() {

    try {

        return JSON.parse(
            fs.readFileSync(
                FILE,
                "utf8"
            )
        );

    } catch {

        return [];

    }

}


function save(data) {

    fs.writeFileSync(
        FILE,
        JSON.stringify(
            data,
            null,
            2
        )
    );

}


/*
 * =========================================
 * فلتر الكلام المسيء
 * =========================================
 *
 * مهم:
 * ما كنستعملوش AI هنا.
 * الفحص محلي وسريع جداً.
 *
 */

const BAD_WORDS = [

    "نيك",
    "ناك",
    "منيك",
    "منيكة",
    "قحبة",
    "قحاب",
    "شرموط",
    "شرموطة",
    "زامل",
    "ديوث",
    "كس",
    "طيز",
    "خرا",
    "زب",
    "متناك"

];


function normalizeText(text) {

    return String(text || "")
        .toLowerCase()
        .normalize("NFKC")
        .replace(
            /[\u064B-\u065F\u0670]/g,
            ""
        )
        .replace(
            /[\s\-_.,!?،؛:()[\]{}"'`~@#$%^&*+=|\\/<>]+/g,
            ""
        );

}


function containsBadWords(text) {

    const normalized =
        normalizeText(text);

    return BAD_WORDS.some(
        word =>
            normalized.includes(
                normalizeText(word)
            )
    );

}


/* =========================================
   قراءة الشات العالمي
========================================= */

router.get("/", async (req, res) => {

    /*
     * لغة المستخدم الحالي
     * Admin Broadcast يملك ar/fr/en
     */

    const token =
        req.headers.authorization?.split(" ")[1];

    let currentUser = null;

    if (token) {
        currentUser =
            auth.verifyToken(token);
    }

    const users =
        db.loadUsers();

    /*
     * لغة المستخدم محفوظة في settings.json
     * وليس داخل users.json.
     */
    const settings =
        db.loadSettings();

    const currentUserSettings =
        currentUser
            ? (
                settings[currentUser.id] ||
                {}
            )
            : {};

    const language =
        ["ar", "fr", "en"].includes(
            currentUserSettings.language
        )
            ? currentUserSettings.language
            : "ar";


    const messages =
        (await loadGlobalMessages())
            .filter(message =>
                !message.isAdminBroadcast
            )
            .sort(
                (a, b) =>
                    a.id - b.id
            );

        const result =
        messages.map(message => {

            const user =
                users.find(
                    u =>
                        String(u.id) ===
                        String(message.userId)
                );


            /*
             * رسالة Admin:
             * كل مستخدم يشوف اللغة الخاصة به.
             */

            let displayMessage =
                message.message;


            if (
                message.isAdminBroadcast &&
                message.translations
            ) {

                displayMessage =
                    message.translations[language] ||
                    message.translations.ar ||
                    message.message;

            }


            return {

                ...message,

                message:
                    displayMessage,

                username:
                    message.isAdminBroadcast
                        ? "UltraAI"
                        : (
                            user?.username ||
                            message.username ||
                            "مستخدم"
                        ),

                avatar:
                    user?.avatar ||
                    ""

            };

        });


    res.json({

        success: true,

        messages: result

    });

});


router.post("/", async (req, res) => {

    const token =
        req.headers.authorization
            ?.split(" ")[1];


    if (!token) {

        return res.json({

            success: false,

            message:
                "يجب تسجيل الدخول"

        });

    }


    const user =
        auth.verifyToken(token);


    if (!user) {

        return res.json({

            success: false,

            message:
                "رمز الدخول غير صالح"

        });

    }


    const message =
        String(
            req.body.message || ""
        ).trim();


    if (!message) {

        return res.json({

            success: false,

            message:
                "الرسالة فارغة"

        });

    }


    /*
     * فحص الكلام المسيء
     */

    if (containsBadWords(message)) {

        console.log(
            "🚫 BAD MESSAGE BLOCKED:",
            user.id
        );


        return res.json({

            success: false,

            blocked: true,

            message:
                "🚫 هاد الرسالة فيها كلام غير مناسب وما يمكنش نشرها."

        });

    }


    const messages =
        await loadGlobalMessages();


    messages.push({

        id:
            Date.now(),

        userId:
            user.id,

        username:
            user.username,

        message,

        time:
            new Date()
                .toLocaleString(
                    "ar-MA"
                )

    });


    /*
     * الاحتفاظ بآخر 500 رسالة فقط
     */

    if (
        messages.length >
        500
    ) {

        messages.splice(
            0,
            messages.length - 500
        );

    }


    await saveGlobalMessages(messages);


    res.json({

        success: true

    });

});


module.exports = router;
