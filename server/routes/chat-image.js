const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const auth = require("../auth");
const db = require("../database");

const imageDir =
    path.join(__dirname, "../data/chat-images");


router.get("/:filename", (req, res) => {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });
    }


    const user =
        auth.verifyToken(token);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "رمز الدخول غير صالح"
        });
    }


    /*
       منع Path Traversal
    */

    const filename =
        path.basename(req.params.filename);


    const chats =
        db.loadChats();


    const chat =
        chats.find(c =>
            c.userId === user.id &&
            c.imageFile === filename
        );


    if (!chat) {

        return res.status(403).json({
            success: false,
            message: "غير مسموح بالوصول إلى هذه الصورة"
        });

    }


    const file =
        path.join(imageDir, filename);


    if (!fs.existsSync(file)) {

        return res.status(404).json({
            success: false,
            message: "الصورة غير موجودة"
        });

    }


    const ext =
        path.extname(filename).toLowerCase();


    const types = {

        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"

    };


    res.setHeader(
        "Content-Type",
        types[ext] || "image/jpeg"
    );


    res.setHeader(
        "Cache-Control",
        "private, max-age=3600"
    );


    res.sendFile(file);

});


module.exports = router;
