const express = require("express");
const router = express.Router();

const auth = require("../auth");
const db = require("../database");

function getUser(req) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token)
        return null;

    return auth.verifyToken(token);
}


/*
   جلب إعدادات المستخدم
*/
router.get("/", (req, res) => {

    const user = getUser(req);

    if (!user) {

        return res.json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }

    const settings =
        db.loadSettings();

    const userSettings =
        settings[user.id] || {};

    res.json({

        success: true,

        settings: {

            saveConversations:
                userSettings.saveConversations !== false,

            language:
                userSettings.language || "ar"

        }

    });

});


/*
   تغيير إعدادات المستخدم
*/
router.post("/", (req, res) => {

    const user = getUser(req);

    if (!user) {

        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });

    }

    const settings =
        db.loadSettings();

    if (!settings[user.id])
        settings[user.id] = {};


    /*
       حفظ المحادثات
    */

    if (
        typeof req.body.saveConversations !==
        "undefined"
    ) {

        settings[user.id].saveConversations =
            req.body.saveConversations !== false;

    }


    /*
       اللغة
    */

    if (req.body.language) {

        const allowedLanguages =
            ["ar", "fr", "en"];

        if (
            !allowedLanguages.includes(
                req.body.language
            )
        ) {

            return res.json({

                success: false,

                message:
                    "اللغة غير مدعومة"

            });

        }

        settings[user.id].language =
            req.body.language;

    }


    db.saveSettings(settings);


    res.json({

        success: true,

        settings:
            settings[user.id]

    });

});


/*
   حذف جميع محادثات المستخدم
*/
router.delete("/conversations", (req, res) => {

    const user = getUser(req);

    if (!user) {

        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });

    }

    const chats =
        db.loadChats();

    const conversations =
        db.loadConversations();


    const userChats =
        chats.filter(
            c => c.userId === user.id
        );

    const userConversations =
        conversations.filter(
            c => c.userId === user.id
        );


    db.saveChats(
        chats.filter(
            c => c.userId !== user.id
        )
    );


    db.saveConversations(
        conversations.filter(
            c => c.userId !== user.id
        )
    );


    res.json({

        success: true,

        deletedChats:
            userChats.length,

        deletedConversations:
            userConversations.length,

        message:
            "تم حذف جميع محادثاتك بنجاح"

    });

});


module.exports = router;
