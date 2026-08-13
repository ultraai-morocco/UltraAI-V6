const express = require("express");
const router = express.Router();

const kvUsers = require("../kv-users");
const auth = require("../auth");
const db = require("../database");

async function getUser(req) {
    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) return null;

    return await auth.getUserFromToken(token);
}

router.delete("/", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
            return res.json({
                success: false,
                message: "رمز الدخول غير صالح"
            });
        }

        await kvUsers.deleteUser(user);

        /*
         * Clean old local data when available.
         * This does not control the account anymore.
         */
        try {
            const chats = db.loadChats();

            db.saveChats(
                chats.filter(
                    c =>
                        String(c.userId) !==
                        String(user.id)
                )
            );

            const conversations =
                db.loadConversations();

            db.saveConversations(
                conversations.filter(
                    c =>
                        String(c.userId) !==
                        String(user.id)
                )
            );

            const settings =
                db.loadSettings();

            delete settings[user.id];

            db.saveSettings(settings);

        } catch (cleanupError) {
            console.error(
                "LOCAL CLEANUP WARNING:",
                cleanupError
            );
        }

        res.json({
            success: true,
            message:
                "تم حذف الحساب وجميع بياناته"
        });

    } catch (error) {
        console.error(
            "DELETE ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر حذف الحساب"
        });
    }
});

module.exports = router;
