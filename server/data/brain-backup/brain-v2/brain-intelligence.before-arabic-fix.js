const store = require("./brain-store");

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokens(text) {
    return normalize(text)
        .split(/\s+/)
        .filter(x => x.length >= 2);
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

    return common /
        Math.max(
            A.size,
            B.size
        );
}

function findRelated(
    userId,
    text,
    limit = 10
) {
    const memories =
        store.list(userId, {
            activeOnly: true
        });

    return memories
        .map(memory => ({
            memory,
            similarity:
                similarity(
                    text,
                    `${memory.key} ${memory.text} ${memory.category}`
                )
        }))
        .filter(
            x =>
                x.similarity >=
                0.15
        )
        .sort(
            (a, b) =>
                b.similarity -
                a.similarity
        )
        .slice(0, limit)
        .map(x => x.memory);
}

function connectMemory(
    userId,
    memoryId,
    relatedIds
) {
    const memory =
        store.get(
            userId,
            memoryId
        );

    if (!memory) {
        return null;
    }

    const ids = [
        ...(memory.relatedMemoryIds ||
            []),
        ...relatedIds.map(String)
    ];

    const unique = [
        ...new Set(
            ids.filter(
                id =>
                    id !==
                    String(memoryId)
            )
        )
    ].slice(0, 30);

    return store.update(
        userId,
        memoryId,
        {
            relatedMemoryIds:
                unique
        }
    );
}

function supersede(
    userId,
    oldMemory,
    newText,
    reason = "new_information"
) {
    const history = [
        ...(oldMemory.history ||
            []),
        {
            type: "superseded",
            replacedBy:
                String(
                    newText
                ).slice(0, 1500),
            reason,
            at:
                new Date()
                    .toISOString()
        }
    ].slice(-20);

    return store.update(
        userId,
        oldMemory.id,
        {
            status:
                "superseded",
            history
        }
    );
}

function getContext(
    userId,
    query,
    options = {}
) {
    const memories =
        findRelated(
            userId,
            query,
            options.limit ||
                15
        );

    return {
        memories,

        count:
            memories.length,

        categories:
            [
                ...new Set(
                    memories.map(
                        x =>
                            x.category
                    )
                )
            ]
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
