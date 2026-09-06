const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const BRAIN_FILE = path.join(DATA_DIR, "brain.json");

const MAX_ITEMS = 1000;

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
            fs.readFileSync(BRAIN_FILE, "utf8") || "{}"
        );

        return data && typeof data === "object"
            ? data
            : {};
    } catch (error) {
        console.error("🧠 BRAIN LOAD ERROR:", error.message);
        return {};
    }
}

function save(data) {
    ensureDataDir();

    const tempFile =
        BRAIN_FILE + "." + process.pid + ".tmp";

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
            version: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [],
            events: [],
            projects: [],
            goals: []
        };
    }

    const brain = data[id];

    if (!Array.isArray(brain.items)) {
        brain.items = [];
    }

    if (!Array.isArray(brain.events)) {
        brain.events = [];
    }

    if (!Array.isArray(brain.projects)) {
        brain.projects = [];
    }

    if (!Array.isArray(brain.goals)) {
        brain.goals = [];
    }

    if (typeof brain.enabled !== "boolean") {
        brain.enabled = true;
    }

    brain.version = 2;

    return brain;
}

function createId(prefix = "mem") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function cleanText(text, max = 1500) {
    return String(text || "")
        .trim()
        .slice(0, max);
}

function cleanKey(key) {
    return cleanText(key, 120)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .slice(0, 120) || "general";
}

function add(userId, item = {}) {
    const data = load();
    const brain = getUserBrain(data, userId);

    const now = new Date().toISOString();

    const newItem = {
        id: createId("mem"),

        key: cleanKey(item.key),

        text: cleanText(item.text),

        category: cleanText(
            item.category || "general",
            40
        ),

        source: cleanText(
            item.source || "manual",
            60
        ),

        sourceId: cleanText(
            item.sourceId || "",
            160
        ),

        conversationId: cleanText(
            item.conversationId || "",
            160
        ),

        confidence:
            typeof item.confidence === "number"
                ? Math.max(
                    0,
                    Math.min(1, item.confidence)
                )
                : 0.8,

        importance:
            typeof item.importance === "number"
                ? Math.max(
                    0,
                    Math.min(1, item.importance)
                )
                : 0.5,

        status:
            item.status === "superseded"
                ? "superseded"
                : "active",

        createdAt: now,
        updatedAt: now,
        lastUsedAt: null,

        usageCount: 0,

        tags: Array.isArray(item.tags)
            ? item.tags
                .map(x => cleanText(x, 40))
                .filter(Boolean)
                .slice(0, 20)
            : [],

        projectId: cleanText(
            item.projectId || "",
            120
        ),

        relatedMemoryIds:
            Array.isArray(item.relatedMemoryIds)
                ? item.relatedMemoryIds
                    .map(String)
                    .slice(0, 30)
                : [],

        history:
            Array.isArray(item.history)
                ? item.history.slice(-20)
                : []
    };

    if (!newItem.text) {
        return null;
    }

    brain.items.unshift(newItem);

    if (brain.items.length > MAX_ITEMS) {
        brain.items = brain.items.slice(
            0,
            MAX_ITEMS
        );
    }

    brain.updatedAt = now;

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
        item.text = cleanText(
            changes.text,
            1500
        );
    }

    if (changes.key !== undefined) {
        item.key = cleanKey(changes.key);
    }

    if (changes.category !== undefined) {
        item.category = cleanText(
            changes.category,
            40
        );
    }

    if (changes.source !== undefined) {
        item.source = cleanText(
            changes.source,
            60
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

    if (changes.importance !== undefined) {
        item.importance = Math.max(
            0,
            Math.min(
                1,
                Number(changes.importance) || 0
            )
        );
    }

    if (changes.status !== undefined) {
        item.status =
            changes.status === "superseded"
                ? "superseded"
                : "active";
    }

    if (changes.history !== undefined) {
        item.history = Array.isArray(
            changes.history
        )
            ? changes.history.slice(-20)
            : [];
    }

    if (changes.tags !== undefined) {
        item.tags = Array.isArray(
            changes.tags
        )
            ? changes.tags
                .map(x => cleanText(x, 40))
                .filter(Boolean)
                .slice(0, 20)
            : [];
    }

    if (changes.projectId !== undefined) {
        item.projectId = cleanText(
            changes.projectId,
            120
        );
    }

    if (
        changes.relatedMemoryIds !== undefined
    ) {
        item.relatedMemoryIds =
            Array.isArray(
                changes.relatedMemoryIds
            )
                ? changes.relatedMemoryIds
                    .map(String)
                    .slice(0, 30)
                : [];
    }

    item.updatedAt =
        new Date().toISOString();

    brain.updatedAt =
        item.updatedAt;

    save(data);

    return item;
}

function remove(userId, itemId) {
    const data = load();
    const brain = getUserBrain(data, userId);

    const before =
        brain.items.length;

    brain.items =
        brain.items.filter(
            x =>
                String(x.id) !==
                String(itemId)
        );

    if (
        brain.items.length ===
        before
    ) {
        return false;
    }

    brain.updatedAt =
        new Date().toISOString();

    save(data);

    return true;
}

function list(userId, options = {}) {
    const data = load();
    const brain = getUserBrain(
        data,
        userId
    );

    let items =
        brain.items.slice();

    if (
        options.activeOnly !== false
    ) {
        items =
            items.filter(
                x =>
                    x.status ===
                    "active"
            );
    }

    if (
        options.status
    ) {
        items =
            items.filter(
                x =>
                    x.status ===
                    String(
                        options.status
                    )
            );
    }

    if (
        options.category
    ) {
        items =
            items.filter(
                x =>
                    x.category ===
                    String(
                        options.category
                    )
            );
    }

    if (
        options.key
    ) {
        items =
            items.filter(
                x =>
                    x.key ===
                    String(
                        options.key
                    )
            );
    }

    return items;
}

function get(userId, itemId) {
    const items =
        list(userId, {
            activeOnly: false
        });

    return (
        items.find(
            x =>
                String(x.id) ===
                String(itemId)
        ) || null
    );
}

function markUsed(userId, ids = []) {
    const data = load();
    const brain =
        getUserBrain(
            data,
            userId
        );

    const now =
        new Date().toISOString();

    const wanted =
        new Set(
            ids.map(String)
        );

    let changed = false;

    for (const item of brain.items) {
        if (
            wanted.has(
                String(item.id)
            )
        ) {
            item.lastUsedAt = now;
            item.updatedAt = now;
            item.usageCount =
                Number(
                    item.usageCount
                ) + 1;

            changed = true;
        }
    }

    if (changed) {
        brain.updatedAt = now;
        save(data);
    }
}

function setEnabled(
    userId,
    enabled
) {
    const data = load();

    const brain =
        getUserBrain(
            data,
            userId
        );

    brain.enabled =
        Boolean(enabled);

    brain.updatedAt =
        new Date().toISOString();

    save(data);

    return brain.enabled;
}

function getEnabled(userId) {
    const data = load();

    const brain =
        getUserBrain(
            data,
            userId
        );

    return brain.enabled !== false;
}

function addEvent(
    userId,
    event = {}
) {
    const data = load();

    const brain =
        getUserBrain(
            data,
            userId
        );

    const now =
        new Date().toISOString();

    const newEvent = {
        id: createId("event"),

        type: cleanText(
            event.type ||
                "conversation",
            60
        ),

        text: cleanText(
            event.text,
            1500
        ),

        conversationId:
            cleanText(
                event.conversationId ||
                    "",
                160
            ),

        createdAt: now,

        importance:
            typeof event.importance ===
            "number"
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        event.importance
                    )
                )
                : 0.5
    };

    if (!newEvent.text) {
        return null;
    }

    brain.events.unshift(
        newEvent
    );

    brain.events =
        brain.events.slice(
            0,
            300
        );

    brain.updatedAt = now;

    save(data);

    return newEvent;
}

function getEvents(
    userId,
    limit = 50
) {
    const data = load();

    const brain =
        getUserBrain(
            data,
            userId
        );

    return brain.events
        .slice(
            0,
            Math.max(
                1,
                Math.min(
                    300,
                    Number(limit) ||
                        50
                )
            )
        );
}

function getStats(userId) {
    const data = load();

    const brain =
        getUserBrain(
            data,
            userId
        );

    const active =
        brain.items.filter(
            x =>
                x.status ===
                "active"
        );

    const categories = {};

    for (const item of active) {
        const category =
            item.category ||
            "general";

        categories[category] =
            (categories[category] ||
                0) + 1;
    }

    return {
        enabled:
            brain.enabled !== false,

        version:
            brain.version || 2,

        total:
            brain.items.length,

        active:
            active.length,

        superseded:
            brain.items.filter(
                x =>
                    x.status ===
                    "superseded"
            ).length,

        events:
            brain.events.length,

        projects:
            brain.projects.length,

        goals:
            brain.goals.length,

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
    markUsed,
    setEnabled,
    getEnabled,
    addEvent,
    getEvents,
    getStats
};
