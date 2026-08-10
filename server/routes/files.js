const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const auth = require("../auth");

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


/* =========================
   AUTH
========================= */

function getUser(req) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) return null;

    return auth.verifyToken(token);
}


/* =========================
   STORAGE
========================= */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const user = getUser(req);

        if (!user) {
            return cb(new Error("Unauthorized"));
        }

        const ext =
            path.extname(file.originalname);

        const safeName =
            `${user.id}_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}${ext}`;

        cb(null, safeName);
    }

});


const upload = multer({

    storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    }

});


/* =========================
   UPLOAD
========================= */

router.post("/upload", upload.single("file"), (req, res) => {

    const user = getUser(req);

    if (!user) {

        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });
    }


    if (!req.file) {

        return res.status(400).json({
            success: false,
            message: "لم يتم اختيار أي ملف"
        });
    }


    res.json({

        success: true,

        message: "تم رفع الملف بنجاح",

        file: {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
            filename: req.file.filename,
            url: `/files/${req.file.filename}`
        }

    });

});


/* =========================
   LIST USER FILES
========================= */

router.get("/", (req, res) => {

    const user = getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }


    const files =
        fs.readdirSync(uploadDir)
        .filter(name => name.startsWith(`${user.id}_`))
        .map(name => {

            const fullPath =
                path.join(uploadDir, name);

            const stat =
                fs.statSync(fullPath);

            return {
                filename: name,
                size: stat.size,
                createdAt: stat.birthtime,
                url: `/files/${name}`
            };

        })
        .sort((a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );


    res.json({
        success: true,
        files
    });

});


/* =========================
   DELETE
========================= */

router.delete("/:filename", (req, res) => {

    const user = getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }


    const filename =
        path.basename(req.params.filename);


    if (!filename.startsWith(`${user.id}_`)) {

        return res.status(403).json({
            success: false,
            message: "غير مسموح"
        });

    }


    const filePath =
        path.join(uploadDir, filename);


    if (!fs.existsSync(filePath)) {

        return res.status(404).json({
            success: false,
            message: "الملف غير موجود"
        });

    }


    fs.unlinkSync(filePath);


    res.json({
        success: true,
        message: "تم حذف الملف"
    });

});


module.exports = router;
