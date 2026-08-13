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

router.get("/", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
            return res.json({
                success: false,
                message: "يجب تسجيل الدخول"
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
                country: user.country || "",
                createdAt: user.createdAt || ""
            }
        });

    } catch (error) {
        console.error("PROFILE GET ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر جلب الحساب"
        });
    }
});

router.put("/", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
            return res.json({
                success: false,
                message: "رمز الدخول غير صالح"
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

        if (
            phone &&
            phone !== String(user.phone || "")
        ) {
            const phoneUser =
                await kvUsers.findUserByPhone(phone);

            if (
                phoneUser &&
                String(phoneUser.id) !== String(user.id)
            ) {
                return res.json({
                    success: false,
                    message: "رقم الهاتف مستعمل"
                });
            }
        }

        user.username = username;
        user.phone = phone;

        await kvUsers.updateUser(user);

        res.json({
            success: true,
            message: "تم تحديث معلومات الحساب",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone || "",
                avatar: user.avatar || "",
                createdAt: user.createdAt || ""
            }
        });

    } catch (error) {
        console.error("PROFILE UPDATE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر تحديث الحساب"
        });
    }
});

router.post("/avatar", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
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

        const size =
            Buffer.byteLength(avatar, "utf8");

        if (size > 60000) {
            return res.json({
                success: false,
                message:
                    "الصورة كبيرة جداً، اختر صورة أصغر"
            });
        }

        user.avatar = avatar;

        await kvUsers.updateUser(user);

        res.json({
            success: true,
            message: "تم حفظ صورة الحساب"
        });

    } catch (error) {
        console.error("AVATAR ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر حفظ الصورة"
        });
    }
});

router.post("/password", async (req, res) => {
    try {
        const user = await getUser(req);

        if (!user) {
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
                message:
                    "جميع حقول كلمة المرور مطلوبة"
            });
        }

        if (newPassword.length < 6) {
            return res.json({
                success: false,
                message:
                    "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
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
                message:
                    "كلمة المرور الحالية خاطئة"
            });
        }

        user.password =
            auth.hashPassword(newPassword);

        await kvUsers.updateUser(user);

        res.json({
            success: true,
            message:
                "تم تغيير كلمة المرور بنجاح"
        });

    } catch (error) {
        console.error("PASSWORD ERROR:", error);

        res.status(500).json({
            success: false,
            message:
                "تعذر تغيير كلمة المرور"
        });
    }
});

module.exports = router;
