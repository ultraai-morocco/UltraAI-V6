const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../auth");

const DATA_FILE = path.join(
    __dirname,
    "..",
    "data",
    "tiktok-access.json"
);

function loadAccess() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8") || "{}"
        );

        return data && typeof data === "object"
            ? data
            : {};
    } catch (error) {
        console.error("TIKTOK ACCESS LOAD ERROR:", error);
        return {};
    }
}

function saveAccess(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

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
            message: "خاصك تسجل الدخول."
        });
    }

    const user = auth.verifyToken(token);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "رمز الدخول غير صالح."
        });
    }

    if (!isAdmin(user)) {
        return res.status(403).json({
            success: false,
            message: "غير مسموح."
        });
    }

    req.admin = user;
    next();
}

function getUserId(req) {
    return (
        req.user?.id ||
        req.user?.userId ||
        req.user?._id
    );
}

function getStatus(record) {
    if (!record || record.enabled !== true) {
        return {
            active: false,
            reason: "disabled"
        };
    }

    const expiresAt =
        new Date(record.expiresAt).getTime();

    if (
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
    ) {
        return {
            active: false,
            reason: "expired"
        };
    }

    return {
        active: true,
        reason: "active"
    };
}

/*
 * المستخدم:
 * معرفة حالة TikTok المجاني ديالو
 */
router.get("/status", require("../middleware/auth"), (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "تعذر تحديد المستخدم."
        });
    }

    const data = loadAccess();

    const record =
        data[String(userId)] || null;

    const status = getStatus(record);

    res.json({
        success: true,
        active: status.active,
        reason: status.reason,
        access: record
            ? {
                enabled: record.enabled === true,
                startedAt: record.startedAt || null,
                expiresAt: record.expiresAt || null
            }
            : null
    });
});

/*
 * Admin:
 * جلب جميع الصلاحيات
 */
router.get("/", adminOnly, (req, res) => {
    const data = loadAccess();

    const result = Object.entries(data).map(
        ([userId, record]) => ({
            userId,
            ...record,
            active: getStatus(record).active
        })
    );

    res.json({
        success: true,
        access: result
    });
});

/*
 * Admin:
 * تفعيل / إنشاء مدة مجانية
 */
router.post("/:userId/grant", adminOnly, (req, res) => {
    const userId =
        String(req.params.userId);

    const {
        expiresAt
    } = req.body || {};

    if (!expiresAt) {
        return res.status(400).json({
            success: false,
            message: "خاصك تحدد تاريخ انتهاء المجاني."
        });
    }

    const expiry =
        new Date(expiresAt).getTime();

    if (
        !Number.isFinite(expiry) ||
        expiry <= Date.now()
    ) {
        return res.status(400).json({
            success: false,
            message: "تاريخ الانتهاء غير صالح."
        });
    }

    const data = loadAccess();

    const old = data[userId];

    const startedAt =
        old?.startedAt ||
        new Date().toISOString();

    data[userId] = {
        enabled: true,
        startedAt,
        expiresAt: new Date(expiry).toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: String(req.admin.id)
    };

    saveAccess(data);

    res.json({
        success: true,
        message: "تم تفعيل TikTok المجاني.",
        access: data[userId]
    });
});

/*
 * Admin:
 * تمديد المدة بعدد الأيام
 */
router.post("/:userId/extend", adminOnly, (req, res) => {
    const userId =
        String(req.params.userId);

    const days =
        Number(req.body?.days);

    if (
        !Number.isFinite(days) ||
        days <= 0 ||
        days > 3650
    ) {
        return res.status(400).json({
            success: false,
            message: "عدد الأيام غير صالح."
        });
    }

    const data = loadAccess();

    const old = data[userId];

    const currentExpiry =
        old?.expiresAt
            ? new Date(old.expiresAt).getTime()
            : Date.now();

    const base =
        Math.max(currentExpiry, Date.now());

    const newExpiry =
        base + days * 24 * 60 * 60 * 1000;

    data[userId] = {
        enabled: true,
        startedAt:
            old?.startedAt ||
            new Date().toISOString(),
        expiresAt:
            new Date(newExpiry).toISOString(),
        updatedAt:
            new Date().toISOString(),
        updatedBy:
            String(req.admin.id)
    };

    saveAccess(data);

    res.json({
        success: true,
        message: `تم تمديد TikTok لمدة ${days} يوم.`,
        access: data[userId]
    });
});

/*
 * Admin:
 * تغيير تاريخ النهاية مباشرة
 */
router.post("/:userId/set-expiry", adminOnly, (req, res) => {
    const userId =
        String(req.params.userId);

    const {
        expiresAt
    } = req.body || {};

    const expiry =
        new Date(expiresAt || "").getTime();

    if (
        !Number.isFinite(expiry) ||
        expiry <= Date.now()
    ) {
        return res.status(400).json({
            success: false,
            message: "تاريخ الانتهاء غير صالح."
        });
    }

    const data = loadAccess();

    const old = data[userId];

    data[userId] = {
        enabled: true,
        startedAt:
            old?.startedAt ||
            new Date().toISOString(),
        expiresAt:
            new Date(expiry).toISOString(),
        updatedAt:
            new Date().toISOString(),
        updatedBy:
            String(req.admin.id)
    };

    saveAccess(data);

    res.json({
        success: true,
        message: "تم تغيير تاريخ انتهاء TikTok.",
        access: data[userId]
    });
});

/*
 * Admin:
 * إيقاف المجاني فوراً
 */
router.post("/:userId/disable", adminOnly, (req, res) => {
    const userId =
        String(req.params.userId);

    const data = loadAccess();

    if (data[userId]) {
        data[userId].enabled = false;
        data[userId].updatedAt =
            new Date().toISOString();
        data[userId].updatedBy =
            String(req.admin.id);
    }

    saveAccess(data);

    res.json({
        success: true,
        message: "تم إيقاف TikTok المجاني."
    });
});

module.exports = router;
