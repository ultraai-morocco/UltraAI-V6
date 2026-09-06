const store = require("./brain-store");
const intelligence =
    require("./brain-intelligence");

function scoreItem(
    item,
    question
) {
    const q =
        intelligence.tokens(
            question
        );

    const text =
        intelligence.normalize(
            `${item.key || ""} ${item.text || ""} ${item.category || ""} ${(item.tags || []).join(" ")}`
        );

    let score = 0;

    for (const token of q) {
        if (
            text.includes(token)
        ) {
            score += 2;
        }
    }

    const similarity =
        intelligence.similarity(
            question,
            text
        );

    score +=
        similarity * 10;

    if (
        item.confidence >= 0.9
    ) {
        score += 2;
    }

    score +=
        Number(
            item.importance || 0
        ) * 3;

    if (
        item.usageCount > 0
    ) {
        score += Math.min(
            item.usageCount * 0.05,
            1
        );
    }

    if (
        item.lastUsedAt
    ) {
        const age =
            (
                Date.now() -
                new Date(
                    item.lastUsedAt
                ).getTime()
            ) /
            86400000;

        if (age < 3) {
            score += 1;
        } else if (age < 14) {
            score += 0.5;
        }
    }

    return score;
}

function retrieve(
    userId,
    question,
    options = {}
) {
    if (
        !store.getEnabled(
            userId
        )
    ) {
        return [];
    }

    const limit =
        Math.max(
            1,
            Math.min(
                Number(
                    options.limit
                ) || 12,
                25
            )
        );

    const maxChars =
        Math.max(
            1000,
            Math.min(
                Number(
                    options.maxChars
                ) || 7000,
                12000
            )
        );

    if (
        !String(
            question || ""
        ).trim()
    ) {
        return [];
    }

    const items =
        store.list(
            userId,
            {
                activeOnly: true
            }
        );

    const ranked =
        items
            .map(item => ({
                item,
                score:
                    scoreItem(
                        item,
                        question
                    )
            }))
            .filter(
                x =>
                    x.score >=
                    1.5
            )
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            );

    const selected = [];

    let chars = 0;

    for (
        const result of ranked
    ) {
        const text =
            result.item.text ||
            "";

        if (
            chars +
                text.length >
            maxChars
        ) {
            continue;
        }

        selected.push({
            ...result.item,
            relevance:
                Number(
                    result.score.toFixed(
                        3
                    )
                )
        });

        chars +=
            text.length;

        if (
            selected.length >=
            limit
        ) {
            break;
        }
    }

    if (
        selected.length
    ) {
        store.markUsed(
            userId,
            selected.map(
                x =>
                    String(
                        x.id
                    )
            )
        );
    }

    return selected;
}

function formatForPrompt(
    items
) {
    if (
        !Array.isArray(
            items
        ) ||
        !items.length
    ) {
        return "";
    }

    return items
        .map(
            (
                item,
                index
            ) =>
                `${index + 1}. [${item.category || "general"}] ${item.text}`
        )
        .join("\n");
}

function getBrainContext(
    userId,
    question
) {
    const items =
        retrieve(
            userId,
            question,
            {
                limit: 15,
                maxChars: 7000
            }
        );

    return {
        items,
        text:
            formatForPrompt(
                items
            )
    };
}

module.exports = {
    normalize:
        intelligence.normalize,

    tokenize:
        intelligence.tokens,

    retrieve,

    formatForPrompt,

    getBrainContext
};
