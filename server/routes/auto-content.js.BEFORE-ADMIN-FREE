const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const authMiddleware = require("../middleware/auth");

const GroqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const DATA_FILE = path.join(
    __dirname,
    "..",
    "data",
    "auto-content.json"
);

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }

        const raw = fs.readFileSync(DATA_FILE, "utf8") || "[]";
        const data = JSON.parse(raw);

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("AUTO CONTENT LOAD ERROR:", error);
        return [];
    }
}

function saveData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}


router.post("/generate", authMiddleware, async (req, res) => {

    /*
     * TikTok Free Access
     */
    const accessFile = path.join(
        __dirname,
        "..",
        "data",
        "tiktok-access.json"
    );

    let accessData = {};

    try {
        if (fs.existsSync(accessFile)) {
            accessData = JSON.parse(
                fs.readFileSync(accessFile, "utf8") || "{}"
            );
        }
    } catch (error) {
        console.error("TIKTOK ACCESS CHECK ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "تعذر التحقق من صلاحية TikTok."
        });
    }

    const currentUserId =
        req.user.id ||
        req.user.userId ||
        req.user._id;

    const access =
        accessData[String(currentUserId)];

    const expiresAt =
        access?.expiresAt
            ? new Date(access.expiresAt).getTime()
            : 0;

    const tiktokActive =
        access?.enabled === true &&
        Number.isFinite(expiresAt) &&
        expiresAt > Date.now();

    if (!tiktokActive) {
        return res.status(403).json({
            success: false,
            code: "TIKTOK_FREE_EXPIRED",
            message: "مدة TikTok المجانية منتهية أو غير مفعلة."
        });
    }


    try {

        const {
            niche = "",
            language = "ar",
            audience = ""
        } = req.body || {};

        const cleanNiche = String(niche).trim();
        const cleanLanguage = String(language).trim();
        const cleanAudience = String(audience).trim();

        if (!cleanNiche) {
            return res.status(400).json({
                success: false,
                message: "النيش مطلوب."
            });
        }

        const languageName =
            cleanLanguage === "en"
                ? "الإنجليزية"
                : cleanLanguage === "fr"
                    ? "الفرنسية"
                    : "العربية";

        const prompt = `
أنت خبير محترف في صناعة محتوى TikTok قصير وقابل للانتشار.

النيش:
${cleanNiche}

الجمهور المستهدف:
${cleanAudience || "جمهور عام مهتم بهذا المجال"}

لغة المحتوى:
${languageName}

أنشئ منشورين مختلفين تماماً:
1. منشور صباحي.
2. منشور مسائي.

مهم جداً:
- لا تكرر نفس الفكرة.
- اجعل كل فكرة مناسبة لفيديو TikTok قصير.
- Hook قوي جداً في البداية.
- Script واضح وقابل للتحويل إلى فيديو.
- لا تجعل السكريبت طويلاً.
- لا تستخدم معلومات مشكوكاً فيها.
- لا تضع مقدمة عامة.
- لا تستخدم Markdown.
- أرجع JSON فقط.

الصيغة:

{
  "morning": {
    "title": "",
    "hook": "",
    "script": "",
    "caption": "",
    "hashtags": []
  },
  "evening": {
    "title": "",
    "hook": "",
    "script": "",
    "caption": "",
    "hashtags": []
  }
}
`;

        const completion =
            await GroqClient.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [
                    {
                        role: "system",
                        content:
                            "أنت خبير في صناعة محتوى TikTok وتحويل النيشات إلى أفكار فيديو جذابة."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 1.05,
                max_tokens: 1800
            });

        const raw =
            completion.choices?.[0]?.message?.content || "";

        let parsed;

        try {

            const clean = raw
                .replace(/^```json/i, "")
                .replace(/^```/i, "")
                .replace(/```$/i, "")
                .trim();

            parsed = JSON.parse(clean);

        } catch (parseError) {

            console.error(
                "AUTO CONTENT JSON ERROR:",
                raw
            );

            return res.status(500).json({
                success: false,
                message: "تعذر تجهيز المحتوى."
            });
        }

        if (
            !parsed ||
            !parsed.morning ||
            !parsed.evening
        ) {
            return res.status(500).json({
                success: false,
                message: "النتيجة غير مكتملة."
            });
        }

        const data = loadData();

        const userId =
            req.user.id ||
            req.user.userId ||
            req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "تعذر تحديد المستخدم."
            });
        }

        const item = {
            id:
                Date.now().toString() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 8),

            userId: String(userId),

            niche: cleanNiche,
            language: cleanLanguage,
            audience: cleanAudience,

            morning: parsed.morning,
            evening: parsed.evening,

            status: "draft",

            createdAt:
                new Date().toISOString()
        };

        data.push(item);

        saveData(data);

        res.json({
            success: true,
            content: item
        });

    } catch (error) {

        console.error(
            "AUTO CONTENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر توليد المحتوى حالياً."
        });
    }
});

    
router.get("/", authMiddleware, (req, res) => {

    try {

        const userId =
            req.user.id ||
            req.user.userId ||
            req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "تعذر تحديد المستخدم."
            });
        }

        const data = loadData();

        const userContent = data.filter(
            item =>
                String(item.userId) === String(userId)
        );

        res.json({
            success: true,
            content: userContent
        });

    } catch (error) {

        console.error(
            "AUTO CONTENT LIST ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر تحميل المحتوى."
        });
    }
});

module.exports = router;
