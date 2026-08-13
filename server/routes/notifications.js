const express = require("express");
const router = express.Router();

const auth = require("../auth");
const kvUsers = require("../kv-users");

async function getUser(req) {
    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) return null;

    return await auth.getUserFromToken(token);
}

/*
 * GET /notifications
 * جلب تنبيهات المستخدم
 */
router.get("/", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "يجب تسجيل الدخول"
            });
        }

        const notifications =
            Array.isArray(user.notifications)
                ? user.notifications
                : [];

        const safeNotifications = notifications
            .map(notification => ({
                id: String(notification.id || ""),
                type: notification.type || "general",
                title: notification.title || "إشعار",
                message: notification.message || "",
                createdAt: notification.createdAt || "",
                read: notification.read === true
            }))
            .sort((a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
            );

        return res.json({
            success: true,
            notifications: safeNotifications,
            unreadCount: safeNotifications.filter(
                notification => notification.read !== true
            ).length
        });

    } catch (error) {
        console.error(
            "NOTIFICATIONS GET ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل الإشعارات"
        });
    }
});

/*
 * POST /notifications/:id/read
 * تعليم إشعار واحد كمقروء
 */
router.post("/:id/read", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "يجب تسجيل الدخول"
            });
        }

        const notificationId =
            String(req.params.id);

        if (!Array.isArray(user.notifications)) {
            return res.status(404).json({
                success: false,
                message: "الإشعار غير موجود"
            });
        }

        const notification =
            user.notifications.find(
                item =>
                    String(item.id) === notificationId
            );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "الإشعار غير موجود"
            });
        }

        notification.read = true;

        await kvUsers.updateUser(user);

        return res.json({
            success: true,
            message: "تم تعليم الإشعار كمقروء"
        });

    } catch (error) {
        console.error(
            "NOTIFICATION READ ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحديث الإشعار"
        });
    }
});

/*
 * POST /notifications/read-all
 * تعليم جميع الإشعارات كمقروءة
 */
router.post("/read-all", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "يجب تسجيل الدخول"
            });
        }

        if (!Array.isArray(user.notifications)) {
            user.notifications = [];
        }

        user.notifications.forEach(
            notification => {
                notification.read = true;
            }
        );

        await kvUsers.updateUser(user);

        return res.json({
            success: true,
            message: "تم تعليم جميع الإشعارات كمقروءة"
        });

    } catch (error) {
        console.error(
            "NOTIFICATIONS READ ALL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحديث الإشعارات"
        });
    }
});

module.exports = router;
