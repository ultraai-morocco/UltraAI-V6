const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const auth = require("../auth");

const file =
    path.join(__dirname, "../data/conversations.json");


function load() {

    if (!fs.existsSync(file)) {
        return [];
    }

    try {

        return JSON.parse(
            fs.readFileSync(file, "utf8") || "[]"
        );

    } catch (error) {

        console.error(
            "Conversations load error:",
            error
        );

        return [];
    }
}


function save(data) {

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2)
    );

}


function getUser(req) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return null;
    }

    return auth.verifyToken(token);
}


/* =========================
   GET - جميع المحادثات
========================= */

router.get("/", async (req, res) => {

    const user = await getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }


    const list =
        load().filter(
            c => c.userId === user.id
        );


    res.json({

        success: true,

        conversations: list

    });

});


/* =========================
   POST - إنشاء محادثة
========================= */

router.post("/", async (req, res) => {

    const user = await getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }


    const data = load();


    const conv = {

        id: Date.now(),

        userId: user.id,

        title:
            String(
                req.body.title ||
                "محادثة جديدة"
            )
            .trim()
            .substring(0, 100),

        createdAt:
            new Date().toISOString()

    };


    data.push(conv);

    save(data);


    res.json({

        success: true,

        conversation: conv

    });

});


/* =========================
   PATCH - تعديل اسم المحادثة
========================= */

router.patch("/:id", async (req, res) => {

    const user = await getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }


    const id =
        Number(req.params.id);


    const title =
        String(
            req.body.title || ""
        )
        .replace(/\s+/g, " ")
        .trim();


    if (!title) {

        return res.json({

            success: false,

            message:
                "اكتب اسم المحادثة"

        });

    }


    if (title.length > 100) {

        return res.json({

            success: false,

            message:
                "اسم المحادثة طويل جداً"

        });

    }


    const data = load();


    const conversation =
        data.find(c =>
            Number(c.id) === id &&
            c.userId === user.id
        );


    if (!conversation) {

        return res.status(404).json({

            success: false,

            message:
                "المحادثة غير موجودة"

        });

    }


    conversation.title = title;


    save(data);


    res.json({

        success: true,

        conversation

    });

});


module.exports = router;
