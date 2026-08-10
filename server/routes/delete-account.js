const express = require("express");
const router = express.Router();

const db = require("../database");
const auth = require("../auth");

function getUser(req) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) return null;

    return auth.verifyToken(token);
}


router.delete("/", (req, res) => {

    const user = getUser(req);

    if (!user) {
        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });
    }

    const users =
        db.loadUsers();

    const exists =
        users.some(u => u.id === user.id);

    if (!exists) {
        return res.json({
            success: false,
            message: "الحساب غير موجود"
        });
    }

    db.saveUsers(
        users.filter(u => u.id !== user.id)
    );

    const chats =
        db.loadChats();

    db.saveChats(
        chats.filter(c => c.userId !== user.id)
    );

    const conversations =
        db.loadConversations();

    db.saveConversations(
        conversations.filter(c => c.userId !== user.id)
    );

    const settings =
        db.loadSettings();

    delete settings[user.id];

    db.saveSettings(settings);

    res.json({
        success: true,
        message: "تم حذف الحساب وجميع بياناته"
    });

});


module.exports = router;
