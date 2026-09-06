const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const BRAIN_FILE = path.join(DATA_DIR, "brain.json");

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function load() {
    ensureDataDir();

    try {
        if (!fs.existsSync(BRAIN_FILE)) {
            return {};
        }

        const data = JSON.parse(
            fs.readFileSync(BRAIN_FILE, "utf8")
        );

        return data && typeof data === "object"
            ? data
            : {};
    } catch (error) {
        console.error(
            "BRAIN LOAD ERROR:",
            error.message
        );

        return {};
    }
}

function save(data) {
    ensureDataDir();

    const tempFile = BRAIN_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, BRAIN_FILE);
}

function normalizeUserId(userId) {
    return String(userId);
}

function getUserBrain(data, userId) {
    const id = normalizeUserId(userId);

    if (!data[id]) {
        data[id] = {
            enabled: true,
            version: 1,
            items: []
        };
    }

    if (!Array.isArray(data[id].items)) {
        data[id].items = [];
    }

    return data[id];
}

function createId() {
    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function cleanText(text, max = 1000) {
    return String(text || "")
        .trim()
        .slice(0, max);
}

function add(userId, item = {}) {
    const data = load();
    const brain = getUserBrain(data, userId);

    const now = new Date().toISOString();

    const newItem = {
        id: createId(),

        key: cleanText(item.key, 120),

        text: cleanText(item.text, 1000),

        category: cleanText(
            item.category || "general",
            40
        ),

        source: cleanText(
            item.source || "manual",
            40
        ),

        sourceId: cleanText(
            item.sourceId || "",
            120
        ),

        conversationId: cleanText(
            item.conversationId || "",
            120
        ),

        confidence:
            typeof item.confidence === "number"
                ? Math.max(
                    0,
                    Math.min(1, item.confidence)
                )
                : 0.8,

        status:
            item.status === "superseded"
                ? "superseded"
                : "active",

        createdAt: now,
        updatedAt: now,
        lastUsedAt: null,

        history: []
    };

    brain.items.unshift(newItem);

    if (brain.items.length > 500) {
        brain.items = brain.items.slice(0, 500);
    }

    save(data);

    return newItem;
}

function update(userId, itemId, changes = {}) {
    const data = load();
    const brain = getUserBrain(data, userId);

    const item = brain.items.find(
        x => String(x.id) === String(itemId)
    );

    if (!item) {
        return null;
    }

    if (changes.text !== undefined) {
        item.text = cleanText(changes.text, 1000);
    }

    if (changes.key !== undefined) {
        item.key = cleanText(changes.key, 120);
    }

    if (changes.category !== undefined) {
        item.category = cleanText(
            changes.category,
            40
        );
    }

    if (changes.confidence !== undefined) {
        item.confidence = Math.max(
            0,
            Math.min(
                1,
                Number(changes.confidence) || 0
            )
        );
    }

    if (changes.status !== undefined) {
        item.status =
            changes.status === "superseded"
                ? "superseded"
                : "active";
    }

    item.updatedAt = new Date().toISOString();

    save(data);

    return item;
}

function remove(userId, itemId) {
    const data = load();
    const brain = getUserBrain(data, userId);

    const before = brain.items.length;

    brain.items = brain.items.filter(
        x => String(x.id) !== String(itemId)
    );

    if (brain.items.length === before) {
        return false;
    }

    save(data);

    return true;
}

function list(userId, options = {}) {
    const data = load();
    const brain = getUserBrain(data, userId);

    let items = brain.items.slice();

    if (options.activeOnly !== false) {
        items = items.filter(
            x => x.status !== "superseded"
        );
    }

    if (options.category) {
        items = items.filter(
            x =>
                x.category ===
                String(options.category)
        );
    }

    return items;
}

function get(userId, itemId) {
    const items = list(userId, {
        activeOnly: false
    });

    return (
        items.find(
            x => String(x.id) === String(itemId)
        ) || null
    );
}

function setEnabled(userId, enabled) {
    const data = load();
    const brain = getUserBrain(data, userId);

    brain.enabled = Boolean(enabled);

    save(data);

    return brain.enabled;
}

function getEnabled(userId) {
    const data = load();
    const brain = getUserBrain(data, userId);

    return brain.enabled !== false;
}

function markUsed(userId, ids = []) {
    if (!Array.isArray(ids) || !ids.length) {
        return;
    }

    const data = load();
    const brain = getUserBrain(data, userId);

    const now = new Date().toISOString();

    for (const item of brain.items) {
        if (ids.includes(String(item.id))) {
            item.lastUsedAt = now;
        }
    }

    save(data);
}

function getStats(userId) {
    const data = load();
    const brain = getUserBrain(data, userId);

    const active = brain.items.filter(
        x => x.status !== "superseded"
    );

    const categories = {};

    for (const item of active) {
        const category =
            item.category || "general";

        categories[category] =
            (categories[category] || 0) + 1;
    }

    return {
        enabled: brain.enabled !== false,
        total: brain.items.length,
        active: active.length,
        superseded:
            brain.items.length - active.length,
        categories
    };
}

module.exports = {
    load,
    save,
    getUserBrain,
    add,
    update,
    remove,
    list,
    get,
    setEnabled,
    getEnabled,
    markUsed,
    getStats
};
