const express = require("express");
const router = express.Router();

const db = require("../database");
const auth = require("../auth");
const { parsePhoneNumberFromString } = require("libphonenumber-js");

const { codes } = require("./send-otp");

/*
   تحديد الدولة من طلب المستخدم
*/
function detectCountry(req) {

    const forwarded =
        req.headers["x-country"] ||
        req.headers["cf-ipcountry"];

    if (forwarded && forwarded !== "XX") {
        return String(forwarded).toUpperCase();
    }

    return "MA";
}


router.post("/", (req, res) => {

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


    const saved = codes[cleanEmail];


    if (!saved) {

        return res.json({
            success: false,
            message: "أرسل رمز التحقق أولاً"
        });

    }


    if (Date.now() > saved.expires) {

        delete codes[cleanEmail];

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


    const users = db.loadUsers();


    if (
        users.find(
            u => String(u.email).toLowerCase() === cleanEmail
        )
    ) {

        return res.json({
            success: false,
            message: "البريد الإلكتروني مستعمل"
        });

    }


    if (
        users.find(
            u => u.phone === cleanPhone
        )
    ) {

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


    users.push(user);

    db.saveUsers(users);

    delete codes[cleanEmail];


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
