const express = require("express");
const router = express.Router();

const auth = require("../auth");
const store = require("../brain/brain-store");
const retriever = require("../brain/brain-retriever");

function getUser(req) {
    const authorization =
        req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
        return null;
    }

    const token =
        authorization.slice(7).trim();

    if (!token) {
        return null;
    }

    return auth.verifyToken(token);
}

function requireUser(req, res) {
    const user = getUser(req);

    if (!user) {
        res.status(401).json({
            success: false,
            error: "Unauthorized"
        });

        return null;
    }

    return user;
}

/*
GET /brain

Returns the user's complete Brain.
*/
router.get("/", (req, res) => {
    const user = requireUser(req, res);

    if (!user) return;

    const items = store.list(user.id, {
        activeOnly: false
    });

    const stats = store.getStats(user.id);

    res.json({
        success: true,
        enabled: stats.enabled,
        stats,
        items
    });
});

/*
GET /brain/search?q=...

Search/retrieve relevant memories.
*/
router.get("/search", (req, res) => {
    const user = requireUser(req, res);

    if (!user) return;

    const q = String(
        req.query.q || ""
    ).trim();

    if (!q) {
        return res.json({
            success: true,
            items: []
        });
    }

    const items = retriever.retrieve(
        user.id,
        q,
        {
            limit: 20,
            maxChars: 10000
        }
    );

    res.json({
        success: true,
        query: q,
        items
    });
});

/*
GET /brain/stats
*/
router.get("/stats", (req, res) => {
    const user = requireUser(req, res);

    if (!user) return;

    res.json({
        success: true,
        stats: store.getStats(user.id)
    });
});

/*
POST /brain

Manual memory.
*/
router.post("/", (req, res) => {
    const user = requireUser(req, res);

    if (!user) return;

    const text = String(
        req.body?.text || ""
    ).trim();

    if (!text) {
        return res.status(400).json({
            success: false,
            error: "Memory text is required"
        });
    }

    if (text.length > 1000) {
        return res.status(400).json({
            success: false,
            error: "Memory is too long"
        });
    }

    const item = store.add(
        user.id,
        {
            key: req.body?.key || "",
            text,
            category:
                req.body?.category ||
                "general",
            source: "manual",
            confidence:
                typeof req.body?.confidence ===
                "number"
                    ? req.body.confidence
                    : 0.9
        }
    );

    res.json({
        success: true,
        item
    });
});

/*
PATCH /brain/:id
*/
router.patch("/:id", (req, res) => {
    const user = requireUser(req, res);

    if (!user) return;

    const item = store.update(
        user.id,
        req.params.id,
        {
            key: req.body?.key,
            text: req.body?.text,
            category: req.body?.category,
            confidence:
                req.body?.confidence,
            status: req.body?.status
        }
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

/*
DELETE /brain/:id
*/
router.delete("/:id", (req, res) => {
    const user = requireUser(req, res);

    if (!user) return;

    const deleted = store.remove(
        user.id,
        req.params.id
    );

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: "Memory not found"
        });
    }

    res.json({
        success: true
    });
});

/*
PATCH /brain/settings/enabled
*/
router.patch(
    "/settings/enabled",
    (req, res) => {
        const user = requireUser(req, res);

        if (!user) return;

        const enabled =
            req.body?.enabled === true;

        store.setEnabled(
            user.id,
            enabled
        );

        res.json({
            success: true,
            enabled
        });
    }
);

module.exports = router;
