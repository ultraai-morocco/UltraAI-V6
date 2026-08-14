const express=require("express");
require("dotenv").config({path:"server/.env"});
const cors=require("cors");
const path=require("path");


const app=express();

/* =================================================
   ULTRAAI DEBUG LOGGER
   كيبين أي طلب داخل للسيرفر
================================================= */

app.use((req,res,next)=>{

    console.log("");
    console.log("========================================");
    console.log("📥 REQUEST:", req.method, req.originalUrl);
    console.log("🕐 TIME:", new Date().toISOString());

    if(req.method === "POST" || req.method === "PUT"){

        console.log(
            "📦 CONTENT-TYPE:",
            req.headers["content-type"] || "unknown"
        );

        console.log(
            "🔑 AUTH:",
            req.headers.authorization
                ? "YES"
                : "NO"
        );
    }

    res.on("finish", ()=>{

        console.log(
            "📤 RESPONSE:",
            req.method,
            req.originalUrl,
            "STATUS:",
            res.statusCode
        );

        console.log("========================================");
        console.log("");
    });

    next();
});


app.use(cors());
app.use(express.json({limit:"6mb"}));

app.use("/login",require("./routes/login"));
app.use("/register",require("./routes/register"));
app.use("/maintenance",require("./routes/maintenance"));

/* =========================================
   STATIC FILES
   خاص JS/CSS/Pages يخدمو حتى أثناء الصيانة
========================================= */

/*
 * ULTRAAI MAINTENANCE MODE
 *
 * أثناء الصيانة:
 *
 * - المستخدم العادي يشوف رسالة الصيانة.
 * - Login يبقى خدام باش Admin يقدر يدخل.
 * - Welcome/Login/Register pages مسموحين.
 * - Admin يبقى قادر يستعمل التطبيق.
 * - Logout خدام محلياً من الواجهة.
 */

app.use(async (req, res, next) => {

    try {

        /*
         * Maintenance endpoint خاصو يبقى خدام.
         */
        if (
            req.path === "/maintenance" ||
            req.path.startsWith("/maintenance/")
        ) {
            return next();
        }

        /*
         * Login خاصو يبقى خدام أثناء الصيانة
         * باش Admin يقدر يدخل.
         */
        if (
            req.path === "/login" ||
            req.path === "/send-otp" ||
            req.path === "/register" || req.path.startsWith("/register/") ||
            req.path === "/reset-password"
        ) {
            return next();
        }

        /*
         * صفحات الدخول المطلوبة للـAdmin.
         */
        if (
            req.path === "/pages/welcome.html" ||
            req.path === "/pages/login.html" ||
            req.path === "/pages/register.html" ||
            req.path === "/pages/forgot-password.html"
        ) {
            return next();
        }

        /*
         * قراءة حالة الصيانة.
         *
         * Deno Deploy:
         * نستعمل Deno KV.
         *
         * Termux / Node:
         * Deno غير موجود، لذلك ما نوقفوش السيرفر.
         */
        let maintenance = null;

        if (
            typeof Deno !== "undefined" &&
            typeof Deno.openKv === "function"
        ) {
            try {

                const kvUsers = require("./kv-users");
                const kv = await kvUsers.getKV();

                const result = await kv.get([
                    "ultraai",
                    "system",
                    "maintenance"
                ]);

                maintenance = result.value;

            } catch (kvError) {

                console.log(
                    "ℹ️ Maintenance KV unavailable:",
                    kvError.message
                );

                return next();
            }
        } else {

            /*
             * Termux / Node:
             * قراءة حالة الصيانة من settings.json
             */
            const fs = require("fs");

            const settingsFile = path.join(
                __dirname,
                "data",
                "settings.json"
            );

            if (fs.existsSync(settingsFile)) {

                try {

                    const raw =
                        fs.readFileSync(
                            settingsFile,
                            "utf8"
                        ) || "{}";

                    const settings =
                        JSON.parse(raw);

                    maintenance =
                        settings.maintenance || null;

                } catch (fileError) {

                    console.error(
                        "MAINTENANCE SETTINGS ERROR:",
                        fileError
                    );

                }
            }
        }

        /*
         * ما كايناش صيانة.
         */
        if (
            !maintenance ||
            maintenance.enabled !== true
        ) {
            return next();
        }

        /*
         * التحقق من Admin من JWT.
         */
        let isAdmin = false;

        const authorization =
            req.headers.authorization || "";

        if (
            authorization.startsWith("Bearer ")
        ) {

            const token =
                authorization.slice(7).trim();

            if (token) {

                try {

                    const auth =
                        require("./auth");

                    const payload =
                        auth.verifyToken(token);

                    if (
                        payload &&
                        String(payload.id) ===
                        String(
                            process.env.ULTRAAI_ADMIN_ID
                        )
                    ) {
                        isAdmin = true;
                    }

                } catch (error) {

                    /*
                     * Token غير صالح = مستخدم عادي.
                     */
                    isAdmin = false;
                }
            }
        }

        /*
         * ملفات الواجهة ضرورية باش صفحة الصيانة
         * والـRouter يخدمو بشكل صحيح.
         */
        if (
            req.method === "GET" &&
            (
                req.path === "/" ||
                req.path.startsWith("/js/") ||
                req.path.startsWith("/css/") ||
                req.path.startsWith("/images/") ||
                req.path.startsWith("/assets/") ||
                req.path === "/favicon.ico"
            )
        ) {
            return next();
        }

        /*
         * Admin يدخل عادي أثناء الصيانة.
         */
        if (isAdmin) {
            return next();
        }

        /*
         * طلبات API.
         */
        if (
            req.path.startsWith("/api") ||
            req.path.startsWith("/chat") ||
            req.path.startsWith("/ai-chat") ||
            req.path.startsWith("/global-chat") ||
            req.path.startsWith("/conversations") ||
            req.path.startsWith("/notifications") ||
            req.path.startsWith("/profile") ||
            req.method !== "GET"
        ) {

            return res.status(503).json({
                success: false,
                maintenance: true,
                message:
                    maintenance.message ||
                    "🛠️ جاري الصيانة، المرجو المحاولة لاحقاً."
            });
        }

        /*
         * باقي الصفحات.
         */
        return res.status(503).send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1">
<title>UltraAI - جاري الصيانة</title>

<style>
html,body{
    margin:0;
    min-height:100%;
    font-family:Arial,sans-serif;
    background:#0b1020;
    color:white;
}

body{
    display:flex;
    align-items:center;
    justify-content:center;
    text-align:center;
}

.box{
    max-width:520px;
    padding:40px 24px;
}

.icon{
    font-size:70px;
    margin-bottom:20px;
}

h1{
    margin:0 0 15px;
    font-size:30px;
}

p{
    color:#b8bfd3;
    line-height:1.8;
    font-size:17px;
}
</style>
</head>

<body>

<div class="box">

    <div class="icon">🛠️</div>

    <h1>جاري الصيانة</h1>

    <p>
        ${
            String(
                maintenance.message ||
                "نقوم حالياً بإجراء بعض التحسينات على UltraAI، المرجو المحاولة لاحقاً."
            )
        }
    </p>

</div>

</body>
</html>
        `);

    } catch (error) {

        console.error(
            "MAINTENANCE MIDDLEWARE ERROR:",
            error
        );

        /*
         * إذا فشل فحص الصيانة،
         * ما نوقفوش التطبيق.
         */
        return next();
    }
});


/*
 * STATIC FILES
 * كيتحمل الموقع من بعد فحص الصيانة
 */
app.use(express.static(path.join(__dirname,"..","public")));

app.use("/admin-reports", require("./routes/admin-reports"));
app.use("/admin-broadcast", require("./routes/admin-broadcast"));
app.use("/admin-inbox", require("./routes/admin-inbox"));

app.use("/conversations", require("./routes/conversations"));
app.use("/conversations-list", require("./routes/conversations-list"));
app.use("/delete-conversation", require("./routes/delete-conversation"));
app.use("/privacy", require("./routes/privacy"));
app.use("/profile", require("./routes/profile"));
app.use("/notifications", require("./routes/notifications"));
app.use("/update-profile", require("./routes/update-profile"));
app.use("/delete-account", require("./routes/delete-account"));
app.use("/chat-image", require("./routes/chat-image"));
app.use("/history", require("./routes/history"));
app.use("/global-chat", require("./routes/global-chat"));
app.use("/chat", require("./routes/chat"));
app.use("/ai-chat", require("./routes/ai-chat"));
app.use("/ai-history", require("./routes/ai-history"));
app.use("/files-api", require("./routes/files"));



app.get("/",(req,res)=>{

    res.sendFile(
        path.join(
            __dirname,
            "..",
            "public",
            "index.html"
        )
    );

});

const PORT = process.env.PORT || 3000;

if (require.main === module) {

    app.listen(PORT, "0.0.0.0", () => {

        console.log("=================================");

        console.log(
            "🚀 UltraAI Server Started"
        );

        console.log(
            "🌍 Server listening on port " + PORT
        );

        console.log("=================================");

    });

}

module.exports = app;
