const express = require("express");
const router = express.Router();

const auth = require("../auth");
const store = require("../brain/brain-store");
const intelligence = require("../brain/brain-intelligence");

function getUser(req) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    try {
        return auth.verifyToken(header.slice(7).trim());
    } catch {
        return null;
    }
}

function requireUser(req, res, next) {
    const user = getUser(req);

    if (!user) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized"
        });
    }

    req.brainUser = user;
    next();
}

/* GET /brain */
router.get("/", requireUser, (req, res) => {
    const userId = String(req.brainUser.id);

    const items = store.list(userId, {
        activeOnly: req.query.all !== "true"
    });

    res.json({
        success: true,
        version: 2,
        enabled: store.getEnabled(userId),
        items,
        stats: store.getStats(userId)
    });
});

/* GET /brain/search?q= */
router.get("/search", requireUser, (req, res) => {
    const q = String(req.query.q || "").trim();

    if (!q) {
        return res.json({
            success: true,
            items: []
        });
    }

    const items = intelligence.findRelated(
        String(req.brainUser.id),
        q,
        25
    );

    res.json({
        success: true,
        query: q,
        items
    });
});

/* GET /brain/context?q= */
router.get("/context", requireUser, (req, res) => {
    const q = String(req.query.q || "").trim();

    if (!q) {
        return res.json({
            success: true,
            memories: [],
            count: 0
        });
    }

    const context = intelligence.getContext(
        String(req.brainUser.id),
        q,
        { limit: 20 }
    );

    res.json({
        success: true,
        ...context
    });
});

/* GET /brain/stats */
router.get("/stats", requireUser, (req, res) => {
    res.json({
        success: true,
        stats: store.getStats(
            String(req.brainUser.id)
        )
    });
});

/* GET /brain/events */
router.get("/events", requireUser, (req, res) => {
    const limit = Number(req.query.limit) || 50;

    res.json({
        success: true,
        events: store.getEvents(
            String(req.brainUser.id),
            limit
        )
    });
});

/* POST /brain */
router.post("/", requireUser, (req, res) => {
    const body = req.body || {};

    if (!String(body.text || "").trim()) {
        return res.status(400).json({
            success: false,
            error: "Memory text is required"
        });
    }

    const item = store.add(
        String(req.brainUser.id),
        {
            key: body.key || "general",
            text: body.text,
            category: body.category || "general",
            source: "manual",
            confidence: body.confidence,
            importance: body.importance,
            tags: body.tags,
            projectId: body.projectId
        }
    );

    res.json({
        success: true,
        item
    });
});

/* PATCH /brain/:id */
router.patch("/:id", requireUser, (req, res) => {
    const userId = String(req.brainUser.id);
    const id = String(req.params.id);

    const existing = store.get(userId, id);

    if (!existing) {
        return res.status(404).json({
            success: false,
            error: "Memory not found"
        });
    }

    const allowed = [
        "text",
        "key",
        "category",
        "confidence",
        "importance",
        "status",
        "tags",
        "projectId",
        "relatedMemoryIds"
    ];

    const changes = {};

    for (const key of allowed) {
        if (
            req.body &&
            req.body[key] !== undefined
        ) {
            changes[key] = req.body[key];
        }
    }

    const item = store.update(
        userId,
        id,
        changes
    );

    res.json({
        success: true,
        item
    });
});

/* DELETE /brain/:id */
router.delete("/:id", requireUser, (req, res) => {
    const ok = store.remove(
        String(req.brainUser.id),
        String(req.params.id)
    );

    if (!ok) {
        return res.status(404).json({
            success: false,
            error: "Memory not found"
        });
    }

    res.json({
        success: true
    });
});

/* POST /brain/events */
router.post("/events", requireUser, (req, res) => {
    const event = store.addEvent(
        String(req.brainUser.id),
        req.body || {}
    );

    res.json({
        success: true,
        event
    });
});

/* POST /brain/connect */
router.post("/connect", requireUser, (req, res) => {
    const memoryId = String(
        req.body?.memoryId || ""
    );

    const relatedIds = Array.isArray(
        req.body?.relatedIds
    )
        ? req.body.relatedIds
        : [];

    if (!memoryId || !relatedIds.length) {
        return res.status(400).json({
            success: false,
            error:
                "memoryId and relatedIds are required"
        });
    }

    const item = intelligence.connectMemory(
        String(req.brainUser.id),
        memoryId,
        relatedIds
    );

    if (!item) {
        return res.status(404).json({
            success: false,
            error: "Memory not found"
        });
    }

    res.json({
        success: true,
        item
    });
});

/* PATCH /brain/settings/enabled */
router.patch(
    "/settings/enabled",
    requireUser,
    (req, res) => {
        const value = store.setEnabled(
            String(req.brainUser.id),
            Boolean(req.body?.enabled)
        );

        res.json({
            success: true,
            enabled: value
        });
    }
);

module.exports = router;
