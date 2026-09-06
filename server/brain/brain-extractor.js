const Groq = require("groq-sdk");

const brainStore =
    require("./brain-store");

const intelligence =
    require("./brain-intelligence");

const groq = new Groq({
    apiKey:
        process.env.GROQ_API_KEY
});

function cleanJson(text) {
    let s =
        String(
            text || ""
        ).trim();

    if (
        s.startsWith("```")
    ) {
        s =
            s.replace(
                /^```(?:json)?/i,
                ""
            )
            .replace(
                /```$/,
                ""
            )
            .trim();
    }

    return s;
}

function normalizeKey(
    key
) {
    return String(
        key || "general"
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            "_"
        )
        .slice(
            0,
            80
        ) || "general";
}

async function extract(
    userId,
    userMessage,
    assistantAnswer,
    conversationId = ""
) {
    const userText =
        String(
            userMessage ||
                ""
        ).trim();

    if (
        !userText ||
        userText.length <
            8
    ) {
        return {
            success: true,
            added: 0,
            updated: 0,
            skipped: 1
        };
    }

    const prompt = `
أنت UltraAI Brain Intelligence.

استخرج من رسالة المستخدم فقط المعلومات الشخصية الدائمة التي تستحق الذاكرة طويلة المدى.

احفظ:
- مشاريع المستخدم
- أهدافه
- أعماله
- تفضيلاته
- مهاراته
- أدواته ومعداته المهمة
- قراراته
- تصحيحاته
- معلومات مستمرة ستفيد في المستقبل

لا تحفظ:
- سؤال عادي
- جواب عام
- معلومة مؤقتة
- تخمين
- معلومات عن شخص آخر
- كلمة مرور
- OTP
- API key
- token
- secret
- معلومات مالية حساسة
- معلومات لا تخص المستخدم

إذا لم توجد معلومة مهمة أرجع [].

أخرج JSON فقط:

[
 {
   "key": "project",
   "text": "معلومة واضحة عن المستخدم",
   "category": "project",
   "importance": 0.9,
   "confidence": 0.95,
   "tags": ["tag1","tag2"]
 }
]

الفئات:
general
preference
project
business
skill
goal
equipment
decision
correction

رسالة المستخدم:
${userText.slice(
    0,
    5000
)}

جواب المساعد للسياق فقط:
${String(
    assistantAnswer || ""
).slice(
    0,
    2000
)}
`;

    try {
        const completion =
            await groq.chat.completions.create(
                {
                    model:
                        "qwen/qwen3.8-27b",

                    reasoning_effort:
                        "none",

                    reasoning_format:
                        "hidden",

                    temperature: 0,

                    max_completion_tokens:
                        900,

                    messages: [
                        {
                            role:
                                "system",
                            content:
                                "JSON فقط."
                        },
                        {
                            role:
                                "user",
                            content:
                                prompt
                        }
                    ]
                }
            );

        const raw =
            completion
                ?.choices?.[0]
                ?.message
                ?.content ||
            "";

        const parsed =
            JSON.parse(
                cleanJson(
                    raw
                )
            );

        if (
            !Array.isArray(
                parsed
            )
        ) {
            return {
                success: false,
                added: 0,
                updated: 0,
                skipped: 1
            };
        }

        let added = 0;
        let updated = 0;
        let skipped = 0;

        const existing =
            brainStore.list(
                String(
                    userId
                ),
                {
                    activeOnly:
                        true
                }
            );

        for (
            const rawItem of
                parsed.slice(
                    0,
                    5
                )
        ) {
            const text =
                String(
                    rawItem.text ||
                        ""
                ).trim();

            if (
                text.length <
                10
            ) {
                skipped++;
                continue;
            }

            const key =
                normalizeKey(
                    rawItem.key
                );

            const category =
                String(
                    rawItem.category ||
                        "general"
                )
                    .trim()
                    .toLowerCase();

            const confidence =
                Math.max(
                    0.5,
                    Math.min(
                        1,
                        Number(
                            rawItem.confidence
                        ) || 0.8
                    )
                );

            const importance =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            rawItem.importance
                        ) || 0.5
                    )
                );

            const duplicate =
                existing.find(
                    memory =>
                        memory.status ===
                            "active" &&
                        memory.key ===
                            key &&
                        intelligence.similarity(
                            memory.text,
                            text
                        ) >=
                            0.92
                );

            if (
                duplicate
            ) {
                skipped++;
                continue;
            }

            /*
             * نلقاو المعلومات القريبة.
             */
            const related =
                intelligence.findRelated(
                    String(
                        userId
                    ),
                    text,
                    10
                );

            /*
             * نفس key + similarity قوية
             * = معلومة جديدة كتبدل القديمة.
             */
            const conflicts =
                related.filter(
                    memory =>
                        memory.status ===
                            "active" &&
                        memory.key ===
                            key &&
                        intelligence.similarity(
                            memory.text,
                            text
                        ) >=
                            0.35
                );

            for (
                const oldMemory of
                    conflicts
            ) {
                intelligence.supersede(
                    String(
                        userId
                    ),
                    oldMemory,
                    text,
                    "newer_user_information"
                );

                updated++;
            }

            const newMemory =
                brainStore.add(
                    String(
                        userId
                    ),
                    {
                        key,
                        text,
                        category,
                        source:
                            "auto-extraction",
                        conversationId:
                            String(
                                conversationId ||
                                    ""
                            ),
                        confidence,
                        importance,
                        tags:
                            Array.isArray(
                                rawItem.tags
                            )
                                ? rawItem.tags
                                : [],
                        relatedMemoryIds:
                            related.map(
                                x =>
                                    String(
                                        x.id
                                    )
                            )
                    }
                );

            if (
                !newMemory
            ) {
                skipped++;
                continue;
            }

            /*
             * نربط الذكريات الجديدة
             * بالقديمة المرتبطة بها.
             */
            if (
                related.length
            ) {
                intelligence.connectMemory(
                    String(
                        userId
                    ),
                    newMemory.id,
                    related.map(
                        x =>
                            String(
                                x.id
                            )
                    )
                );
            }

            added++;
        }

        /*
         * نسجل Event بسيط على المحادثة.
         */
        if (
            added > 0
        ) {
            brainStore.addEvent(
                String(
                    userId
                ),
                {
                    type:
                        "learning",
                    text:
                        `UltraAI learned ${added} durable memory item(s) from a private conversation.`,
                    conversationId:
                        String(
                            conversationId ||
                                ""
                        ),
                    importance:
                        0.6
                }
            );
        }

        return {
            success: true,
            added,
            updated,
            skipped
        };
    } catch (
        error
    ) {
        console.error(
            "🧠 BRAIN EXTRACTOR ERROR:",
            error.message
        );

        return {
            success: false,
            added: 0,
            updated: 0,
            skipped: 0,
            error:
                error.message
        };
    }
}

module.exports = {
    extract
};
