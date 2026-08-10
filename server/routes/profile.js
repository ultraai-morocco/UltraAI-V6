const express = require("express");
const router = express.Router();

const auth = require("../auth");
const db = require("../database");

function getUser(req) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) return null;

    return auth.verifyToken(token);
}


/* =========================
   جلب معلومات الحساب
========================= */

router.get("/", (req, res) => {

    const authUser = getUser(req);

    if (!authUser) {
        return res.json({
            success: false,
            message: "يجب تسجيل الدخول"
        });
    }

    const users = db.loadUsers();

    const user = users.find(
        u => u.id === authUser.id
    );

    if (!user) {
        return res.json({
            success: false,
            message: "الحساب غير موجود"
        });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username || "",
            email: user.email || "",
            phone: user.phone || "",
            avatar: user.avatar || "",
            createdAt: user.createdAt || ""
        }
    });

});


/* =========================
   تعديل الاسم ورقم الهاتف
========================= */

router.put("/", (req, res) => {

    const authUser = getUser(req);

    if (!authUser) {
        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });
    }

    const users = db.loadUsers();

    const user = users.find(
        u => u.id === authUser.id
    );

    if (!user) {
        return res.json({
            success: false,
            message: "الحساب غير موجود"
        });
    }

    const username =
        String(req.body.username || "").trim();

    const phone =
        String(req.body.phone || "").trim();

    if (!username) {
        return res.json({
            success: false,
            message: "الاسم مطلوب"
        });
    }

    if (username.length > 40) {
        return res.json({
            success: false,
            message: "الاسم طويل جداً"
        });
    }

    if (phone.length > 25) {
        return res.json({
            success: false,
            message: "رقم الهاتف غير صالح"
        });
    }

    user.username = username;
    user.phone = phone;

    db.saveUsers(users);

    res.json({
        success: true,
        message: "تم تحديث معلومات الحساب",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar || "",
            createdAt: user.createdAt || ""
        }
    });

});


/* =========================
   تغيير صورة الحساب
========================= */

router.post("/avatar", (req, res) => {

    const authUser = getUser(req);

    if (!authUser) {
        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });
    }

    const avatar =
        String(req.body.avatar || "");

    if (
        avatar &&
        !avatar.startsWith("data:image/")
    ) {
        return res.json({
            success: false,
            message: "الصورة غير صالحة"
        });
    }

    const users = db.loadUsers();

    const user = users.find(
        u => u.id === authUser.id
    );

    if (!user) {
        return res.json({
            success: false,
            message: "الحساب غير موجود"
        });
    }

    user.avatar = avatar;

    db.saveUsers(users);

    res.json({
        success: true,
        message: "تم حفظ صورة الحساب"
    });

});


/* =========================
   تغيير كلمة المرور
========================= */

router.post("/password", (req, res) => {

    const authUser = getUser(req);

    if (!authUser) {
        return res.json({
            success: false,
            message: "رمز الدخول غير صالح"
        });
    }

    const currentPassword =
        String(req.body.currentPassword || "");

    const newPassword =
        String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
        return res.json({
            success: false,
            message: "جميع حقول كلمة المرور مطلوبة"
        });
    }

    if (newPassword.length < 6) {
        return res.json({
            success: false,
            message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
        });
    }

    const users = db.loadUsers();

    const user = users.find(
        u => u.id === authUser.id
    );

    if (!user) {
        return res.json({
            success: false,
            message: "الحساب غير موجود"
        });
    }

    if (
        !auth.checkPassword(
            currentPassword,
            user.password
        )
    ) {
        return res.json({
            success: false,
            message: "كلمة المرور الحالية خاطئة"
        });
    }

    user.password =
        auth.hashPassword(newPassword);

    db.saveUsers(users);

    res.json({
        success: true,
        message: "تم تغيير كلمة المرور بنجاح"
    });

});


module.exports = router;
