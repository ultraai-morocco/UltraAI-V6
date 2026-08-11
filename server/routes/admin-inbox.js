const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const auth = require("../auth");

const GLOBAL_FILE = path.join(
    __dirname,
    "..",
    "data",
    "global-chat.json"
);

const READ_FILE = path.join(
    __dirname,
    "..",
    "data",
    "admin-message-reads.json"
);

function loadMessages() {
    try {
        return JSON.parse(
            fs.readFileSync(GLOBAL_FILE, "utf8") || "[]"
        );
    } catch {
        return [];
    }
}

function loadReads() {
    try {
        return JSON.parse(
            fs.readFileSync(READ_FILE, "utf8") || "{}"
        );
    } catch {
        return {};
    }
}

function saveReads(data) {
    fs.writeFileSync(
        READ_FILE,
        JSON.stringify(data, null, 2)
    );
}

function userAuth(req, res, next) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "يجب تسجيل الدخول."
        });
    }

    const user = auth.verifyToken(token);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "رمز الدخول غير صالح."
        });
    }

    req.user = user;

    next();
}

/*
 * تاريخ إنشاء المستخدم
 */
function getUserCreatedAt(user) {

    const timestamp =
        Date.parse(user.createdAt || "");

    if (Number.isFinite(timestamp)) {
        return timestamp;
    }

    /*
     * حماية للحسابات القديمة جداً
     * التي لا تحتوي createdAt.
     *
     * هؤلاء يمكنهم رؤية الرسائل الموجودة.
     */
    return 0;
}

/*
 * تاريخ رسالة الأدمن
 *
 * Broadcast الحالي يستعمل:
 * id: Date.now()
 */
function getMessageTimestamp(message) {

    const id =
        Number(message.id);

    if (
        Number.isFinite(id) &&
        id > 0
    ) {
        return id;
    }

    /*
     * fallback إذا كانت رسالة قديمة
     * بدون id صالح.
     */
    const parsed =
        Date.parse(message.createdAt || "");

    if (Number.isFinite(parsed)) {
        return parsed;
    }

    return 0;
}

/*
 * GET /admin-inbox
 *
 * كل مستخدم يشوف فقط رسائل الأدمن
 * التي أُرسلت بعد إنشاء حسابه.
 */
router.get("/", userAuth, (req, res) => {

    try {

        const userId =
            String(req.user.id);

        const userCreatedAt =
            getUserCreatedAt(req.user);

        const reads =
            loadReads();

        const userReads =
            reads[userId] || {};

        const messages =
            loadMessages()
                .filter(message => {

                    if (
                        !message ||
                        !message.isAdminBroadcast
                    ) {
                        return false;
                    }

                    const messageTime =
                        getMessageTimestamp(message);

                    /*
                     * الرسالة يجب أن تكون بعد
                     * إنشاء الحساب.
                     *
                     * نستخدم > وليس >=
                     */
                    return messageTime >
                        userCreatedAt;
                })
                .sort((a, b) =>
                    getMessageTimestamp(b) -
                    getMessageTimestamp(a)
                );

        const result =
            messages.map(message => ({

                id:
                    String(message.id),

                username:
                    message.username ||
                    "UltraAI",

                message:
                    message.message ||
                    "",

                translations:
                    message.translations ||
                    {},

                time:
                    message.time ||
                    "",

                read:
                    Boolean(
                        userReads[
                            String(message.id)
                        ]
                    )
            }));

        const unreadCount =
            result.filter(
                message => !message.read
            ).length;

        return res.json({

            success: true,

            messages: result,

            unreadCount

        });

    } catch (error) {

        console.error(
            "ADMIN INBOX GET ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "تعذر تحميل رسائل الإدارة."
        });
    }
});

/*
 * POST /admin-inbox/read
 *
 * تعليم رسالة كمقروءة
 */
router.post("/read", userAuth, (req, res) => {

    try {

        const messageId =
            String(
                req.body.messageId || ""
            ).trim();

        if (!messageId) {

            return res.status(400).json({

                success: false,

                message:
                    "معرف الرسالة مطلوب."
            });
        }

        const userId =
            String(req.user.id);

        const userCreatedAt =
            getUserCreatedAt(req.user);

        const messages =
            loadMessages();

        const message =
            messages.find(
                item =>
                    item &&
                    item.isAdminBroadcast &&
                    String(item.id) === messageId
            );

        if (!message) {

            return res.status(404).json({

                success: false,

                message:
                    "الرسالة غير موجودة."
            });
        }

        /*
         * لا يمكن للمستخدم تعليم رسالة
         * أُرسلت قبل إنشاء حسابه كمقروءة.
         */
        const messageTime =
            getMessageTimestamp(message);

        if (
            messageTime <=
            userCreatedAt
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "هذه الرسالة أُرسلت قبل إنشاء حسابك."
            });
        }

        const reads =
            loadReads();

        if (!reads[userId]) {
            reads[userId] = {};
        }

        reads[userId][messageId] =
            Date.now();

        saveReads(reads);

        return res.json({

            success: true,

            message:
                "تم تعليم الرسالة كمقروءة."
        });

    } catch (error) {

        console.error(
            "ADMIN INBOX READ ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "تعذر تحديث حالة الرسالة."
        });
    }
});

module.exports = router;
