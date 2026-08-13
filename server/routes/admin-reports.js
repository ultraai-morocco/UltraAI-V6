const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const auth = require("../auth");
const kvUsers = require("../kv-users");

const reportsFile =
    path.join(
        __dirname,
        "..",
        "data",
        "reports.json"
    );


function getReports() {

    try {

        return JSON.parse(
            fs.readFileSync(
                reportsFile,
                "utf8"
            ) || "[]"
        );

    } catch {

        return [];

    }

}


function isAdmin(user) {

    return (
        user &&
        String(user.id) ===
        String(process.env.ULTRAAI_ADMIN_ID)
    );

}


/*
 * حماية لوحة الإدارة
 */

function adminOnly(req, res, next) {

    const token =
        req.headers.authorization
            ?.split(" ")[1];

    if (!token) {

        return res.status(401).json({
            success: false,
            message: "خاصك تسجل الدخول."
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
            message: "غير مسموح. هادي خاصة بالإدارة."
        });

    }

    req.admin = user;

    next();

}


/*
 * جلب جميع الإبلاغات
 */


/*
 * التحقق من صلاحية Admin
 * السيرفر هو المصدر الوحيد للصلاحية
 */
router.get("/check", adminOnly, (req, res) => {

    return res.json({
        success: true,
        isAdmin: true,
        admin: {
            id: req.admin.id,
            username: req.admin.username,
            email: req.admin.email
        }
    });

});

router.get("/", adminOnly, (req, res) => {

    try {

        const reports =
            getReports();

        const usersFile =
            path.join(
                __dirname,
                "..",
                "data",
                "users.json"
            );

        const globalChatFile =
            path.join(
                __dirname,
                "..",
                "data",
                "global-chat.json"
            );

        const users =
            fs.existsSync(usersFile)
                ? JSON.parse(
                    fs.readFileSync(
                        usersFile,
                        "utf8"
                    ) || "[]"
                )
                : [];

        const messages =
            fs.existsSync(globalChatFile)
                ? JSON.parse(
                    fs.readFileSync(
                        globalChatFile,
                        "utf8"
                    ) || "[]"
                )
                : [];

        const enrichedReports =
            reports.map(report => {

                const reporter =
                    users.find(
                        user =>
                            String(user.id) ===
                            String(report.userId)
                    );

                const originalMessage =
                    messages.find(
                        message =>
                            String(message.id) ===
                            String(report.messageId)
                    );

                const messageOwner =
                    originalMessage
                        ? users.find(
                            user =>
                                String(user.id) ===
                                String(originalMessage.userId)
                        )
                        : null;

                return {
                    ...report,

                    reporter: reporter
                        ? {
                            id: reporter.id,
                            username: reporter.username,
                            email: reporter.email
                        }
                        : null,

                    messageOwner: messageOwner
                        ? {
                            id: messageOwner.id,
                            username: messageOwner.username,
                            email: messageOwner.email,
                            banned:
                                messageOwner.banned === true
                        }
                        : null,

                    originalMessage:
                        originalMessage
                            ? {
                                id: originalMessage.id,
                                userId: originalMessage.userId,
                                username: originalMessage.username,
                                message: originalMessage.message,
                                time: originalMessage.time
                            }
                            : null
                };

            });

        return res.json({
            success: true,
            reports: enrichedReports
        });

    } catch (error) {

        console.error(
            "ADMIN REPORTS LOAD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل الإبلاغات."
        });
    }
});



/*
 * معالجة البلاغ
 * POST /admin-reports/:id/resolve
 */
router.post("/:id/resolve", adminOnly, (req, res) => {

    try {

        const reports = getReports();
        const reportId = String(req.params.id);

        const report = reports.find(
            r => String(r.id) === reportId
        );

        if (!report) {

            return res.status(404).json({
                success: false,
                message: "البلاغ غير موجود."
            });

        }

        report.status = "resolved";
        report.resolvedAt = new Date().toISOString();
        report.resolvedBy = req.admin.id;

        fs.writeFileSync(
            reportsFile,
            JSON.stringify(
                reports,
                null,
                2
            )
        );

        console.log(
            "✅ REPORT RESOLVED:",
            report.id
        );

        return res.json({
            success: true,
            message: "تمت معالجة البلاغ بنجاح."
        });

    } catch (error) {

        console.error(
            "ADMIN RESOLVE REPORT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر معالجة البلاغ."
        });
    }
});


router.get("/users", adminOnly, async (req, res) => {
    try {
        const users = await kvUsers.getAllUsers();

        const safeUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone || "",
            createdAt: user.createdAt,
            banned: user.banned === true
        }));

        console.log(
            "🟣 ADMIN USERS KV COUNT:",
            safeUsers.length
        );

        return res.json({
            success: true,
            users: safeUsers
        });

    } catch (error) {
        console.error(
            "ADMIN USERS KV ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر تحميل الحسابات من Deno KV"
        });
    }
});

/*
 * حظر مستخدم
 * POST /admin-reports/users/:id/ban
 */

/*
 * تنبيه مستخدم
 * POST /admin-reports/users/:id/warn
 */
router.post("/users/:id/warn", adminOnly, (req, res) => {

    try {

        const usersFile =
            path.join(
                __dirname,
                "..",
                "data",
                "users.json"
            );

        const users =
            JSON.parse(
                fs.readFileSync(
                    usersFile,
                    "utf8"
                ) || "[]"
            );

        const targetId =
            String(req.params.id);

        if (
            targetId ===
            String(process.env.ULTRAAI_ADMIN_ID)
        ) {
            return res.status(403).json({
                success: false,
                message: "ما يمكنش تنبه حساب Admin."
            });
        }

        const user =
            users.find(
                u =>
                    String(u.id) === targetId
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود."
            });
        }

        const warningMessage =
            String(
                req.body.message ||
                "⚠️ تنبيه من إدارة UltraAI: المرجو احترام قوانين التطبيق."
            ).trim();

        if (!user.notifications) {
            user.notifications = [];
        }

        user.notifications.push({

            id:
                Date.now().toString(),

            type:
                "admin-warning",

            title:
                "⚠️ تنبيه من الإدارة",

            message:
                warningMessage,

            createdAt:
                new Date().toISOString(),

            read:
                false
        });

        fs.writeFileSync(
            usersFile,
            JSON.stringify(
                users,
                null,
                2
            )
        );

        console.log(
            "⚠️ ADMIN WARNING:",
            user.id,
            user.username
        );

        return res.json({
            success: true,
            message: "تم إرسال التنبيه للمستخدم."
        });

    } catch (error) {

        console.error(
            "ADMIN WARNING ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر إرسال التنبيه."
        });
    }
});


router.post("/users/:id/ban", adminOnly, async (req, res) => {
    try {
        const targetId = String(req.params.id);

        if (
            targetId ===
            String(process.env.ULTRAAI_ADMIN_ID)
        ) {
            return res.status(403).json({
                success: false,
                message: "ما يمكنش تحظر حساب Admin."
            });
        }

        const user = await kvUsers.findUserById(targetId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود."
            });
        }

        user.banned = true;
        user.bannedAt = new Date().toISOString();

        await kvUsers.updateUser(user);

        console.log(
            "🚫 USER BANNED IN KV:",
            user.id,
            user.username
        );

        return res.json({
            success: true,
            message: "تم حظر الحساب بنجاح."
        });

    } catch (error) {
        console.error(
            "ADMIN BAN KV ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر حظر الحساب."
        });
    }
});


/*
 * فك حظر مستخدم
 * POST /admin-reports/users/:id/unban
 */

router.post("/users/:id/unban", adminOnly, async (req, res) => {
    try {
        const targetId = String(req.params.id);

        const user = await kvUsers.findUserById(targetId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود."
            });
        }

        user.banned = false;
        delete user.bannedAt;

        await kvUsers.updateUser(user);

        console.log(
            "🔓 USER UNBANNED IN KV:",
            user.id,
            user.username
        );

        return res.json({
            success: true,
            message: "تم فك حظر الحساب."
        });

    } catch (error) {
        console.error(
            "ADMIN UNBAN KV ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "تعذر فك الحظر."
        });
    }
});

module.exports = router;
