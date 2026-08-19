const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

router.post("/", async (req, res) => {

    try {

        const {
            topic = "",
            type = "general",
            count = 5
        } = req.body || {};

        const safeCount =
            Math.min(
                Math.max(
                    Number(count) || 5,
                    5
                ),
                20
            );

        const types = {
            general: "أفكار عامة ومبتكرة",
            projects: "أفكار مشاريع وأعمال",
            content: "أفكار محتوى"
        };

        const selectedType =
            types[type] || types.general;

        const subject =
            topic.trim()
                ? topic.trim()
                : "أي مجال مفيد ومثير للاهتمام";

        const prompt = `
أنت مولد أفكار ذكي داخل تطبيق UltraAI.

الموضوع:
${subject}

نوع الأفكار:
${selectedType}

عدد الأفكار:
${safeCount}

أعطني بالضبط ${safeCount} أفكار مختلفة.

أريد النتيجة JSON فقط بدون Markdown وبدون أي كلام خارج JSON.

الصيغة المطلوبة:

{
  "ideas": [
    {
      "title": "اسم الفكرة",
      "description": "وصف مختصر وواضح للفكرة"
    }
  ]
}

اجعل الأفكار:
- عملية
- متنوعة
- غير مكررة
- قابلة للتنفيذ قدر الإمكان
- مناسبة للمستخدم العادي
`;

        const completion =
            await groq.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [
                    {
                        role: "system",
                        content:
                            "أنت خبير في توليد الأفكار والمشاريع والمحتوى."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 1.05,
                max_tokens:
                    safeCount >= 20 ? 1800 : 1000
            });

        const raw =
            completion.choices?.[0]?.message?.content || "";

        let parsed;

        try {

            const clean =
                raw
                    .replace(/^```json/i, "")
                    .replace(/^```/i, "")
                    .replace(/```$/i, "")
                    .trim();

            parsed = JSON.parse(clean);

        } catch (parseError) {

            console.error(
                "IDEAS JSON ERROR:",
                raw
            );

            return res.status(500).json({
                error:
                    "تعذر تجهيز الأفكار"
            });
        }

        const ideas =
            Array.isArray(parsed.ideas)
                ? parsed.ideas
                    .filter(
                        item =>
                            item &&
                            item.title &&
                            item.description
                    )
                    .slice(0, safeCount)
                : [];

        res.json({
            success: true,
            ideas
        });

    } catch (error) {

        console.error(
            "IDEAS ERROR:",
            error
        );

        res.status(500).json({
            error:
                "تعذر توليد الأفكار حالياً"
        });
    }
});

module.exports = router;
