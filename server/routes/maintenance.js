const express = require("express");

const router = express.Router();
const auth = require("../auth");
const kvUsers = require("../kv-users");

const MAINTENANCE_KEY = ["ultraai", "system", "maintenance"];

async function getMaintenance() {
    const kv = await kvUsers.getKV();

    const result = await kv.get(MAINTENANCE_KEY);

    return result.value || {
        enabled: false,
        message: "🛠️ جاري الصيانة، المرجو المحاولة لاحقاً."
    };
}

async function isAdmin(req) {
    try {
        const header = req.headers.authorization || "";

        if (!header.startsWith("Bearer ")) {
            return false;
        }

        const token = header.slice(7).trim();

        if (!token) {
            return false;
        }

        const user = await auth.getUserFromToken(token);

        if (!user) {
            return false;
        }

        return (
            String(user.id) ===
            String(process.env.ULTRAAI_ADMIN_ID)
        );

    } catch (error) {
        console.error("MAINTENANCE ADMIN CHECK ERROR:", error);
        return false;
    }
}


/*
 * معرفة حالة الصيانة
 * GET /maintenance
 */
router.get("/", async (req, res) => {
    try {
        const maintenance = await getMaintenance();

        return res.json({
            success: true,
            maintenance
        });

    } catch (error) {
        console.error("MAINTENANCE GET ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل حالة الصيانة."
        });
    }
});


/*
 * تشغيل / إيقاف الصيانة
 * POST /maintenance
 */
router.post("/", async (req, res) => {
    try {

        if (!(await isAdmin(req))) {
            return res.status(403).json({
                success: false,
                message: "غير مسموح."
            });
        }

        const enabled =
            req.body.enabled === true;

        const message =
            String(
                req.body.message ||
                "🛠️ جاري الصيانة، المرجو المحاولة لاحقاً."
            ).trim();

        const maintenance = {
            enabled,
            message: message || "🛠️ جاري الصيانة، المرجو المحاولة لاحقاً.",
            updatedAt: new Date().toISOString()
        };

        const kv = await kvUsers.getKV();

        await kv.set(
            MAINTENANCE_KEY,
            maintenance
        );

        console.log(
            enabled
                ? "🔴 MAINTENANCE ENABLED"
                : "🟢 MAINTENANCE DISABLED"
        );

        return res.json({
            success: true,
            maintenance
        });

    } catch (error) {
        console.error(
            "MAINTENANCE UPDATE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحديث وضع الصيانة."
        });
    }
});


module.exports = router;
