const store = require("./brain-store");

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[ًٌٍَُِّْـ]/g, "")
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokens(text) {
    const normalized = normalize(text);

    if (!normalized) {
        return [];
    }

    const words = normalized
        .split(/\s+/)
        .filter(Boolean);

    /*
     * Arabic-friendly token expansion.
     * This helps retrieval when the same idea
     * appears with small grammatical differences.
     */
    const expanded = new Set();

    for (const word of words) {
        expanded.add(word);

        let w = word;

        for (const prefix of [
            "وال",
            "فال",
            "بال",
            "كال",
            "لل",
            "ال",
            "و",
            "ف",
            "ب",
            "ك",
            "ل"
        ]) {
            if (
                w.length > prefix.length + 2 &&
                w.startsWith(prefix)
            ) {
                w = w.slice(prefix.length);
                expanded.add(w);
                break;
            }
        }

        for (const suffix of [
            "كما",
            "كم",
            "كن",
            "نا",
            "هم",
            "هن",
            "ها",
            "ه",
            "ي",
            "ك",
            "ة"
        ]) {
            if (
                w.length > suffix.length + 2 &&
                w.endsWith(suffix)
            ) {
                expanded.add(
                    w.slice(
                        0,
                        -suffix.length
                    )
                );
                break;
            }
        }
    }

    return [...expanded];
}

function similarity(a, b) {
    const A = new Set(tokens(a));
    const B = new Set(tokens(b));

    if (!A.size || !B.size) {
        return 0;
    }

    let common = 0;

    for (const token of A) {
        if (B.has(token)) {
            common++;
        }
    }

    const union =
        new Set([
            ...A,
            ...B
        ]).size;

    if (!union) {
        return 0;
    }

    return common / union;
}

function findRelated(
    userId,
    text,
    limit = 10
) {
    const queryTokens =
        new Set(tokens(text));

    if (!queryTokens.size) {
        return [];
    }

    const items = store.list(
        String(userId),
        {
            activeOnly: true
        }
    );

    const results = [];

    for (const item of items) {
        const itemTokens =
            new Set(tokens(item.text));

        let matches = 0;

        for (const token of queryTokens) {
            if (itemTokens.has(token)) {
                matches++;
            }
        }

        const sim =
            similarity(
                text,
                item.text
            );

        const confidence =
            Number(
                item.confidence || 0
            );

        const importance =
            Number(
                item.importance || 0.5
            );

        const usage =
            Math.min(
                Number(
                    item.usageCount || 0
                ),
                20
            ) / 20;

        const score =
            matches * 2 +
            sim * 5 +
            confidence * 1.5 +
            importance +
            usage;

        if (
            matches > 0 ||
            sim >= 0.08
        ) {
            results.push({
                ...item,
                _score:
                    Number(
                        score.toFixed(4)
                    ),
                _similarity:
                    Number(
                        sim.toFixed(4)
                    ),
                _matches:
                    matches
            });
        }
    }

    results.sort(
        (a, b) =>
            b._score -
            a._score
    );

    return results
        .slice(0, limit)
        .map(item => {
            const result = {
                ...item
            };

            delete result._score;
            delete result._similarity;
            delete result._matches;

            return result;
        });
}

function connectMemory(
    userId,
    memoryId,
    relatedIds = []
) {
    const item = store.get(
        String(userId),
        String(memoryId)
    );

    if (!item) {
        return null;
    }

    const existing =
        Array.isArray(
            item.relatedMemoryIds
        )
            ? item.relatedMemoryIds
            : [];

    const merged =
        [
            ...new Set([
                ...existing,
                ...relatedIds
                    .map(String)
                    .filter(
                        id =>
                            id !==
                            String(memoryId)
                    )
            ])
        ];

    return store.update(
        String(userId),
        String(memoryId),
        {
            relatedMemoryIds:
                merged
        }
    );
}

function supersede(
    userId,
    oldMemory,
    newText,
    reason = "updated"
) {
    if (!oldMemory) {
        return null;
    }

    const history =
        Array.isArray(
            oldMemory.history
        )
            ? oldMemory.history
            : [];

    const nextHistory = [
        ...history,
        {
            text:
                oldMemory.text,
            confidence:
                oldMemory.confidence,
            status:
                oldMemory.status,
            changedAt:
                new Date().toISOString(),
            reason
        }
    ];

    return store.update(
        String(userId),
        String(oldMemory.id),
        {
            status: "superseded",
            history:
                nextHistory
        }
    );
}

function getContext(
    userId,
    query,
    options = {}
) {
    const limit =
        Number(
            options.limit || 10
        );

    const memories =
        findRelated(
            String(userId),
            query,
            limit
        );

    const lines =
        memories.map(
            memory =>
                `- ${memory.text}`
        );

    return {
        memories,
        count:
            memories.length,
        text:
            lines.join("\n")
    };
}

module.exports = {
    normalize,
    tokens,
    similarity,
    findRelated,
    connectMemory,
    supersede,
    getContext
};
