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

function tokenize(text) {
    return normalize(text)
        .split(/\s+/)
        .filter(word => word.length >= 2);
}

function scoreItem(item, questionTokens, normalizedQuestion) {
    const itemText = normalize(
        `${item.key || ""} ${item.text || ""} ${item.category || ""}`
    );

    if (!itemText) {
        return 0;
    }

    const itemTokens = new Set(
        tokenize(itemText)
    );

    let score = 0;

    for (const token of questionTokens) {
        if (itemTokens.has(token)) {
            score += 3;
        } else if (
            itemText.includes(token)
        ) {
            score += 1;
        }
    }

    if (
        item.key &&
        normalizedQuestion.includes(
            normalize(item.key)
        )
    ) {
        score += 5;
    }

    if (
        item.category &&
        normalizedQuestion.includes(
            normalize(item.category)
        )
    ) {
        score += 1;
    }

    if (item.confidence >= 0.9) {
        score += 1;
    }

    if (item.lastUsedAt) {
        const days =
            (Date.now() -
                new Date(item.lastUsedAt).getTime()) /
            86400000;

        if (days < 7) {
            score += 1;
        }
    }

    return score;
}

function retrieve(
    userId,
    question,
    options = {}
) {
    if (!store.getEnabled(userId)) {
        return [];
    }

    const limit = Math.max(
        1,
        Math.min(
            Number(options.limit) || 8,
            20
        )
    );

    const maxChars =
        Number(options.maxChars) || 5000;

    const normalizedQuestion =
        normalize(question);

    const questionTokens =
        tokenize(question);

    if (!questionTokens.length) {
        return [];
    }

    const items = store.list(userId, {
        activeOnly: true
    });

    const ranked = items
        .map(item => ({
            item,
            score: scoreItem(
                item,
                questionTokens,
                normalizedQuestion
            )
        }))
        .filter(x => x.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return (
                new Date(
                    b.item.updatedAt || 0
                ).getTime() -
                new Date(
                    a.item.updatedAt || 0
                ).getTime()
            );
        });

    const selected = [];
    let chars = 0;

    for (const result of ranked) {
        const text = result.item.text || "";

        if (
            chars + text.length >
            maxChars
        ) {
            continue;
        }

        selected.push({
            ...result.item,
            relevance: result.score
        });

        chars += text.length;

        if (selected.length >= limit) {
            break;
        }
    }

    if (selected.length) {
        store.markUsed(
            userId,
            selected.map(
                x => String(x.id)
            )
        );
    }

    return selected;
}

function formatForPrompt(items) {
    if (!Array.isArray(items) || !items.length) {
        return "";
    }

    return items
        .map(
            (item, index) =>
                `${index + 1}. [${item.category || "general"}] ${item.text}`
        )
        .join("\n");
}

module.exports = {
    normalize,
    tokenize,
    retrieve,
    formatForPrompt
};
