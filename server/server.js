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

app.use(express.static(path.join(__dirname,"..","public")));
app.use("/files", express.static(path.join(__dirname,"uploads")));

app.use("/register",require("./routes/register"));
app.use("/send-otp", require("./routes/send-otp").router);
app.use("/login",require("./routes/login"));
app.use("/migrate-users",require("./routes/migrate-users"));
app.use("/reset-password",require("./routes/reset-password"));
app.use("/chat",require("./routes/chat"));
app.use("/reports",require("./routes/reports"));
app.use("/admin-reports",require("./routes/admin-reports"));
app.use("/admin-broadcast",require("./routes/admin-broadcast"));
app.use("/admin-inbox",require("./routes/admin-inbox"));
app.use("/conversations",require("./routes/conversations"));
app.use("/conversations-list",require("./routes/conversations-list"));
app.use("/delete-conversation",require("./routes/delete-conversation"));
app.use("/privacy",require("./routes/privacy"));
app.use("/profile",require("./routes/profile"));
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
