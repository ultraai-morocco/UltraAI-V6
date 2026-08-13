const express = require("express");
const router = express.Router();

const kvUsers = require("../kv-users");
const auth = require("../auth");

const {
    getOTP,
    deleteOTP
} = require("./send-otp");

router.post("/", async (req, res) => {
    try {
        const email =
            String(req.body.email || "")
                .trim()
                .toLowerCase();

        const otp =
            String(req.body.otp || "").trim();

        const newPassword =
            String(req.body.newPassword || "");

        if (!email || !otp || !newPassword) {
            return res.json({
                success: false,
                message: "عمر جميع الخانات."
            });
        }

        if (newPassword.length < 6) {
            return res.json({
                success: false,
                message:
                    "كلمة السر خاصها تكون 6 أحرف على الأقل."
            });
        }

        const user =
            await kvUsers.findUserByEmail(email);

        if (!user) {
            return res.json({
                success: false,
                message: "الحساب غير موجود."
            });
        }

        const saved =
            await getOTP(email);

        if (!saved) {
            return res.json({
                success: false,
                message:
                    "رمز التحقق غير موجود أو انتهت صلاحيته."
            });
        }

        if (Date.now() > saved.expires) {
            await deleteOTP(email);

            return res.json({
                success: false,
                message:
                    "رمز التحقق انتهت صلاحيته."
            });
        }

        if (String(saved.code) !== otp) {
            return res.json({
                success: false,
                message:
                    "رمز التحقق غير صحيح."
            });
        }

        user.password =
            auth.hashPassword(newPassword);

        await kvUsers.updateUser(user);

        await deleteOTP(email);

        return res.json({
            success: true,
            message:
                "تم تغيير كلمة السر بنجاح."
        });

    } catch (error) {
        console.error(
            "RESET PASSWORD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "تعذر تغيير كلمة السر."
        });
    }
});

module.exports = router;
