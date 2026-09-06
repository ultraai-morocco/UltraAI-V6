const express = require("express");
const fs = require("fs");
const path = require("path");
const auth = require("../auth");

const router = express.Router();

const file = path.join(
    __dirname,
    "../data/memory-pro.json"
);

/* =========================
   STORAGE
========================= */

function load() {

    if (!fs.existsSync(file)) {
        return {};
    }

    try {

        const data =
            JSON.parse(
                fs.readFileSync(file, "utf8") || "{}"
            );

        return data && typeof data === "object"
            ? data
            : {};

    } catch (error) {

        console.error(
            "Memory Pro load error:",
            error
        );

        return {};
    }
}


function save(data) {

    const dir =
        path.dirname(file);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2)
    );
}


/* =========================
   AUTH
========================= */

function getUser(req) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return null;
    }

    return auth.verifyToken(token);
}


/* =========================
   USER MEMORY
========================= */

function userKey(userId) {

    return String(userId);
}


function getUserMemory(data, userId) {

    const key =
        userKey(userId);

    if (!data[key]) {

        data[key] = {
            enabled: true,
            items: []
        };

    }

    if (!Array.isArray(data[key].items)) {
        data[key].items = [];
    }

    if (typeof data[key].enabled !== "boolean") {
        data[key].enabled = true;
    }

    return data[key];
}


/* =========================
   GET MEMORY
========================= */

router.get("/", async (req, res) => {

    const user =
        getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }

    const data =
        load();

    const memory =
        getUserMemory(
            data,
            user.id
        );

    res.json({

        success: true,

        enabled:
            memory.enabled,

        items:
            memory.items

    });

});


/* =========================
   ADD MEMORY
========================= */

router.post("/", async (req, res) => {

    const user =
        getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }

    const text =
        String(
            req.body.text || ""
        )
        .replace(/\s+/g, " ")
        .trim();

    const category =
        String(
            req.body.category ||
            "general"
        )
        .trim()
        .substring(0, 40);

    if (!text) {

        return res.json({
            success: false,
            message: "اكتب المعلومة أولاً"
        });

    }

    if (text.length > 500) {

        return res.json({
            success: false,
            message: "المعلومة طويلة جداً"
        });

    }

    const data =
        load();

    const memory =
        getUserMemory(
            data,
            user.id
        );

    const item = {

        id:
            Date.now(),

        text,

        category,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };

    memory.items.unshift(item);

    /* حماية من نمو الذاكرة بلا حدود */
    memory.items =
        memory.items.slice(0, 200);

    save(data);

    res.json({

        success: true,

        item

    });

});


/* =========================
   UPDATE MEMORY
========================= */

router.patch("/:id", async (req, res) => {

    const user =
        getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }

    const id =
        Number(req.params.id);

    const text =
        String(
            req.body.text || ""
        )
        .replace(/\s+/g, " ")
        .trim();

    const category =
        String(
            req.body.category ||
            "general"
        )
        .trim()
        .substring(0, 40);

    if (!text) {

        return res.json({
            success: false,
            message: "المعلومة فارغة"
        });

    }

    const data =
        load();

    const memory =
        getUserMemory(
            data,
            user.id
        );

    const item =
        memory.items.find(
            item =>
                Number(item.id) === id
        );

    if (!item) {

        return res.status(404).json({
            success: false,
            message: "المعلومة غير موجودة"
        });

    }

    item.text = text;
    item.category = category;
    item.updatedAt =
        new Date().toISOString();

    save(data);

    res.json({

        success: true,

        item

    });

});


/* =========================
   DELETE MEMORY
========================= */

router.delete("/:id", async (req, res) => {

    const user =
        getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }

    const id =
        Number(req.params.id);

    const data =
        load();

    const memory =
        getUserMemory(
            data,
            user.id
        );

    const before =
        memory.items.length;

    memory.items =
        memory.items.filter(
            item =>
                Number(item.id) !== id
        );

    if (memory.items.length === before) {

        return res.status(404).json({
            success: false,
            message: "المعلومة غير موجودة"
        });

    }

    save(data);

    res.json({

        success: true,

        message: "تم حذف المعلومة"

    });

});


/* =========================
   ENABLE / DISABLE
========================= */

router.patch("/settings/enabled", async (req, res) => {

    const user =
        getUser(req);

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول"
        });

    }

    const data =
        load();

    const memory =
        getUserMemory(
            data,
            user.id
        );

    memory.enabled =
        req.body.enabled !== false;

    save(data);

    res.json({

        success: true,

        enabled:
            memory.enabled

    });

});


module.exports = router;
