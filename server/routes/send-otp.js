const express = require("express");
const router = express.Router();

const { sendOTP } = require("../email");

const codes = {};

router.post("/", async (req, res) => {

    const { email } = req.body;

    if (!email) {

        return res.json({
            success: false,
            message: "البريد الإلكتروني مطلوب"
        });

    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    codes[email] = {

        code,

        expires: Date.now() + 10 * 60 * 1000

    };

    try {

        await sendOTP(email, code);

        res.json({
            success: true,
            message: "تم إرسال رمز التحقق"
        });

    } catch (e) {

        console.error(e);

        res.json({
            success: false,
            message: "فشل إرسال البريد"
        });

    }

});

module.exports = {

    router,

    codes

};
