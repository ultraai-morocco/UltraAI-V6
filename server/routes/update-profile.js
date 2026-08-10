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


router.put("/", (req, res) => {

    const user = getUser(req);

    if (!user) {
        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });
    }

    const users = db.loadUsers();

    const index =
        users.findIndex(u => u.id === user.id);

    if (index === -1) {
        return res.json({
            success: false,
            message: "المستخدم غير موجود"
        });
    }

    const current = users[index];

    const username =
        String(req.body.username || "").trim();

    const phone =
        String(req.body.phone || "").trim();

    const avatar =
        String(req.body.avatar || "").trim();

    const newPassword =
        String(req.body.password || "");

    if (username.length >= 2) {
        current.username = username;
    }

    current.phone = phone;

    if (avatar) {
        current.avatar = avatar;
    }

    if (newPassword) {

        if (newPassword.length < 6) {

            return res.json({
                success: false,
                message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
            });

        }

        current.password =
            auth.hashPassword(newPassword);
    }

    users[index] = current;

    db.saveUsers(users);

    res.json({
        success: true,
        message: "تم تحديث الحساب بنجاح",
        user: {
            id: current.id,
            username: current.username,
            email: current.email,
            phone: current.phone || "",
            avatar: current.avatar || "",
            createdAt: current.createdAt
        }
    });

});


module.exports = router;
