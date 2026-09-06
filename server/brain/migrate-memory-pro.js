const fs = require("fs");
const path = require("path");

const store = require("./brain-store");

const memoryFile = path.join(
    __dirname,
    "..",
    "data",
    "memory-pro.json"
);

function normalize(text) {
    return String(text || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function looksLikeQuestion(text) {
    const t = normalize(text);

    const questionMarks = [
        "?",
        "؟",
        "شنو ",
        "اش ",
        "اشمن ",
        "كيفاش ",
        "كيف ",
        "علاش ",
        "فين ",
        "امتى ",
        "متى ",
        "واش "
    ];

    return questionMarks.some(
        x => t.includes(x)
    );
}

function isUseful(text) {
    const t = normalize(text);

    if (!t) return false;

    // كلمات قصيرة جداً ليست Memory مفيدة
    if (t.length < 8) return false;

    // الأسئلة لا تعتبر حقيقة شخصية
    if (looksLikeQuestion(t)) return false;

    return true;
}

if (!fs.existsSync(memoryFile)) {
    console.log(
        "❌ memory-pro.json not found"
    );
    process.exit(1);
}

const memoryData = JSON.parse(
    fs.readFileSync(memoryFile, "utf8")
);

let imported = 0;
let skipped = 0;
let duplicates = 0;

for (const [userId, userMemory] of Object.entries(
    memoryData
)) {
    if (
        !userMemory ||
        !Array.isArray(userMemory.items)
    ) {
        continue;
    }

    const existing = store.list(
        userId,
        {
            activeOnly: false
        }
    );

    const existingTexts =
        new Set(
            existing.map(
                item =>
                    normalize(item.text)
            )
        );

    for (const oldItem of userMemory.items) {
        const text = String(
            oldItem.text || ""
        ).trim();

        if (!isUseful(text)) {
            skipped++;
            continue;
        }

        const normalized =
            normalize(text);

        if (
            existingTexts.has(normalized)
        ) {
            duplicates++;
            continue;
        }

        store.add(
            userId,
            {
                key:
                    oldItem.category ||
                    "general",

                text,

                category:
                    oldItem.category ||
                    "general",

                source:
                    "memory-pro",

                sourceId:
                    String(
                        oldItem.id || ""
                    ),

                confidence: 0.85
            }
        );

        existingTexts.add(
            normalized
        );

        imported++;
    }
}

console.log("");
console.log("🧠 ULTRAAI BRAIN MIGRATION");
console.log("--------------------------------");
console.log("✅ Imported:", imported);
console.log("⏭️ Skipped:", skipped);
console.log("♻️ Duplicates:", duplicates);
console.log("--------------------------------");
console.log("Memory Pro الأصلية لم يتم تعديلها.");
