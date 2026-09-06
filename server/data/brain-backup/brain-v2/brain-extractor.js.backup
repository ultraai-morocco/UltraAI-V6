const Groq = require("groq-sdk");
const brainStore = require("./brain-store");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

function cleanJson(text) {
    let s = String(text || "").trim();

    if (s.startsWith("```")) {
        s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    }

    return s;
}

function normalizeKey(key) {
    return String(key || "general")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .slice(0, 80) || "general";
}

async function extract(userId, userMessage, assistantAnswer, conversationId = "") {

    const userText = String(userMessage || "").trim();

    if (!userText || userText.length < 8) {
        return {
            success: true,
            added: 0,
            updated: 0,
            skipped: 1
        };
    }

    const prompt = `
أنت نظام استخراج ذاكرة شخصية لـ UltraAI.

حلل رسالة المستخدم فقط، واستخرج المعلومات التي تستحق أن تبقى في ذاكرته عبر المحادثات والصفحات المختلفة.

احفظ فقط:
- معلومات شخصية أو تفضيلات دائمة.
- المشاريع والأعمال التي يعمل عليها المستخدم.
- المهارات والخبرات.
- الأجهزة أو الأدوات المهمة التي يستعملها.
- أهداف طويلة المدى.
- قرارات أو اختيارات مهمة.
- معلومات صححها المستخدم عن نفسه.
- معلومات مستمرة يمكن أن تساعد UltraAI مستقبلاً.

لا تحفظ:
- الأسئلة العادية.
- الأجوبة العامة.
- معلومات مؤقتة جداً.
- تفاصيل عابرة.
- أسرار أو كلمات مرور أو رموز OTP أو مفاتيح API.
- معلومات لا تخص المستخدم.
- التخمينات.

إذا لم توجد معلومة مهمة، أرجع [].

أخرج JSON فقط بهذا الشكل:

[
  {
    "key": "project",
    "text": "وصف واضح ومختصر للمعلومة",
    "category": "project",
    "confidence": 0.95
  }
]

الفئات الممكنة:
general, preference, project, business, skill, goal, equipment, decision, correction

رسالة المستخدم:
${userText.slice(0, 5000)}

الجواب السابق للمساعد موجود فقط لفهم السياق عند الحاجة، ولا تستخرج منه معلومات عن المستخدم:
${String(assistantAnswer || "").slice(0, 3000)}
`;

    try {

        const completion = await groq.chat.completions.create({
            model: "qwen/qwen3.8-27b",
            reasoning_effort: "none",
            reasoning_format: "hidden",
            temperature: 0,
            max_completion_tokens: 700,
            messages: [
                {
                    role: "system",
                    content: "أخرج JSON فقط. لا تضف أي شرح."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const raw =
            completion?.choices?.[0]?.message?.content || "";

        const parsed = JSON.parse(cleanJson(raw));

        if (!Array.isArray(parsed)) {
            return {
                success: false,
                added: 0,
                updated: 0,
                skipped: 1
            };
        }

        const existing =
            brainStore.list(String(userId), {
                status: "active"
            });

        let added = 0;
        let updated = 0;
        let skipped = 0;

        for (const item of parsed.slice(0, 5)) {

            const text = String(item.text || "").trim();

            if (!text || text.length < 10) {
                skipped++;
                continue;
            }

            const key = normalizeKey(item.key);

            const category =
                String(item.category || "general")
                    .trim()
                    .toLowerCase();

            const confidence =
                Math.max(
                    0.5,
                    Math.min(
                        1,
                        Number(item.confidence) || 0.8
                    )
                );

            /*
             * نفس المعلومة تقريباً موجودة؟
             * ما نكرروشها.
             */
            const duplicate = existing.find(memory =>
                memory.status === "active" &&
                memory.key === key &&
                memory.text.toLowerCase() === text.toLowerCase()
            );

            if (duplicate) {
                skipped++;
                continue;
            }

            /*
             * نفس key ولكن معلومة جديدة:
             * القديمة تصبح superseded.
             */
            const sameKey = existing.filter(memory =>
                memory.status === "active" &&
                memory.key === key
            );

            for (const oldMemory of sameKey) {

                brainStore.update(
                    String(userId),
                    oldMemory.id,
                    {
                        status: "superseded",
                        history: [
                            ...(oldMemory.history || []),
                            {
                                type: "superseded",
                                replacedBy: text,
                                at: new Date().toISOString()
                            }
                        ]
                    }
                );
            }

            brainStore.add(String(userId), {
                key,
                text,
                category,
                source: "auto-extraction",
                sourceId: "",
                conversationId: String(conversationId || ""),
                confidence,
                status: "active"
            });

            added++;

            if (sameKey.length > 0) {
                updated++;
            }
        }

        return {
            success: true,
            added,
            updated,
            skipped
        };

    } catch (error) {

        console.error(
            "🧠 BRAIN EXTRACTOR ERROR:",
            error.message
        );

        return {
            success: false,
            added: 0,
            updated: 0,
            skipped: 0,
            error: error.message
        };
    }
}

module.exports = {
    extract
};
