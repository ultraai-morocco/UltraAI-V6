const express = require("express");
const router = express.Router();

const kvUsers = require("../kv-users");
const auth = require("../auth");

async function getUser(req) {
    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) return null;

    return await auth.getUserFromToken(token);
}

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

        const avatar =
            String(req.body.avatar || "").trim();

        const newPassword =
            String(req.body.password || "");

        if (username.length >= 2) {
            user.username = username;
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

        user.phone = phone;

        if (avatar) {
            if (
                !avatar.startsWith("data:image/")
            ) {
                return res.json({
                    success: false,
                    message: "الصورة غير صالحة"
                });
            }

            if (
                Buffer.byteLength(avatar, "utf8") > 60000
            ) {
                return res.json({
                    success: false,
                    message: "الصورة كبيرة جداً"
                });
            }

            user.avatar = avatar;
        }

        if (newPassword) {
            if (newPassword.length < 6) {
                return res.json({
                    success: false,
                    message:
                        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
                });
            }

            user.password =
                auth.hashPassword(newPassword);
        }

        await kvUsers.updateUser(user);

        res.json({
            success: true,
            message: "تم تحديث الحساب بنجاح",
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
        console.error(
            "UPDATE PROFILE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر تحديث الحساب"
        });
    }
});

module.exports = router;
