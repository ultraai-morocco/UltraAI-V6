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

/*
 * ULTRAAI MAINTENANCE MODE
 * خاص Middleware ديال الصيانة يجي قبل static files
 * باش المستخدم العادي ما يقدرش يوصل للموقع أثناء الصيانة.
 * Admin و /maintenance و Admin routes كيبقاو خدامين.
 */
app.use(async (req, res, next) => {

    try {

        const allowed = [
            "/maintenance",
            "/admin-reports",
            "/admin-broadcast",
            "/admin-inbox"
        ];

        if (
            allowed.some(route =>
                req.path === route ||
                req.path.startsWith(route + "/")
            )
        ) {
            return next();
        }

        const kvUsers = require("./kv-users");
        const kv = await kvUsers.getKV();

        const result = await kv.get([
            "ultraai",
            "system",
            "maintenance"
        ]);

        const maintenance = result.value;

        if (!maintenance || maintenance.enabled !== true) {
            return next();
        }

        /*
         * Admin يبقى قادر يستعمل التطبيق أثناء الصيانة.
         */
        const header =
            req.headers.authorization || "";

        if (header.startsWith("Bearer ")) {

            const token =
                header.slice(7).trim();

            if (token) {

                const auth = require("./auth");

                const user =
                    await auth.getUserFromToken(token);

                if (
                    user &&
                    String(user.id) ===
                    String(process.env.ULTRAAI_ADMIN_ID)
                ) {
                    return next();
                }
            }
        }

        /*
         * API / POST / PUT / DELETE...
         */
        if (
            req.path.startsWith("/api") ||
            req.headers.accept?.includes("application/json") ||
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
         * صفحات الموقع.
         */
        const maintenanceMessage =
            String(
                maintenance.message ||
                "نقوم حالياً بإجراء بعض التحسينات على UltraAI، المرجو المحاولة لاحقاً."
            )
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        return res.status(503).send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
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

    <p>${maintenanceMessage}</p>

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
         * إذا فشل KV، ما نوقفوش التطبيق.
         */
        return next();
    }
});

/*
 * Static files خاصها تكون من بعد Maintenance Middleware.
 */
app.use(express.static(path.join(__dirname,"..","public")));
app.use("/files", express.static(path.join(__dirname,"uploads")));

app.use("/register",require("./routes/register"));
app.use("/send-otp", require("./routes/send-otp").router);
app.use("/login",require("./routes/login"));
app.use("/reset-password",require("./routes/reset-password"));
app.use("/chat",require("./routes/chat"));
app.use("/reports",require("./routes/reports"));
app.use("/admin-broadcast",require("./routes/admin-broadcast"));
app.use("/admin-inbox",require("./routes/admin-inbox"));
app.use("/conversations",require("./routes/conversations"));
app.use("/conversations-list",require("./routes/conversations-list"));
app.use("/delete-conversation",require("./routes/delete-conversation"));
app.use("/privacy",require("./routes/privacy"));
app.use("/profile",require("./routes/profile"));
app.use("/notifications", require("./routes/notifications"));
app.use("/update-profile",require("./routes/update-profile"));
app.use("/delete-account",require("./routes/delete-account"));
app.use("/chat-image",require("./routes/chat-image"));
app.use("/history",require("./routes/history"));
app.use("/global-chat", require("./routes/global-chat"));
app.use("/ai-chat", require("./routes/ai-chat"));
app.use("/ai-history", require("./routes/ai-history"));
app.use("/files-api",require("./routes/files"));

app.get("/",(req,res)=>{

res.sendFile(
path.join(__dirname,"..","public","index.html")
);

});
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log("=================================");
        console.log("🚀 UltraAI Server Started");
        console.log("🌍 Server listening on port " + PORT);
        console.log("=================================");
    });
}

module.exports = app;
