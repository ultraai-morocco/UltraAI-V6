const express = require("express");
const router = express.Router();

const kvUsers = require("../kv-users");
const auth = require("../auth");
const { parsePhoneNumberFromString } = require("libphonenumber-js");

const { getOTP, deleteOTP } = require("./send-otp");

/*
   تحديد الدولة من طلب المستخدم
*/
function detectCountry(phone) {

    try {
        const parsed = parsePhoneNumberFromString(String(phone).trim());

        if (parsed && parsed.country) {
            return parsed.country;
        }

        return "MA";

    } catch (error) {
        console.error("Country detection error:", error);
        return "MA";
    }
}


router.post("/", async (req, res) => {

    const {
        username,
        email,
        phone,
        password,
        otp
    } = req.body;


    if (
        !username ||
        !email ||
        !phone ||
        !password ||
        !otp
    ) {

        return res.json({
            success: false,
            message: "جميع الحقول مطلوبة"
        });

    }


    const cleanUsername =
        String(username).trim();

    const cleanEmail =
        String(email).trim().toLowerCase();

    const cleanPhone =
        String(phone).trim();


    if (cleanUsername.length < 2) {

        return res.json({
            success: false,
            message: "الاسم قصير جداً"
        });

    }


    if (cleanPhone.length < 8) {

        return res.json({
            success: false,
            message: "رقم الهاتف غير صالح"
        });

    }


    const saved = await getOTP(cleanEmail);


    if (!saved) {

        return res.json({
            success: false,
            message: "أرسل رمز التحقق أولاً"
        });

    }


    if (Date.now() > saved.expires) {

        await deleteOTP(cleanEmail);

        return res.json({
            success: false,
            message: "انتهت صلاحية رمز التحقق"
        });

    }


    if (saved.code !== otp) {

        return res.json({
            success: false,
            message: "رمز التحقق غير صحيح"
        });

    }


    const existingUser =
        await kvUsers.findUserByEmail(cleanEmail);

    if (existingUser) {

        return res.json({
            success: false,
            message: "البريد الإلكتروني مستعمل"
        });

    }

    const existingPhoneUser =
        await kvUsers.findUserByPhone(cleanPhone);

    if (existingPhoneUser) {

        return res.json({
            success: false,
            message: "رقم الهاتف مستعمل"
        });

    }


    const country =
        detectCountry(cleanPhone);

    if (!country) {

        return res.json({
            success: false,
            message:
                "رقم الهاتف غير صالح أو يجب كتابته بالصيغة الدولية مثل +212..."
        });

    }


    const user = {

        id: Date.now(),

        username:
            cleanUsername,

        email:
            cleanEmail,

        phone:
            cleanPhone,

        country,

        avatar:
            "",

        password:
            auth.hashPassword(password),

        createdAt:
            new Date().toISOString()

    };


    await kvUsers.saveUser(user);

    console.log("🟢 REGISTER SAVED:", {
        userId: user.id,
        username: user.username,
        email: user.email
    });

    await deleteOTP(cleanEmail);


    res.json({

        success: true,

        message:
            "تم إنشاء الحساب بنجاح",

        user: {

            id: user.id,

            username: user.username,

            country: user.country

        }

    });

});


module.exports = router;
