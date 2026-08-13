const express = require("express");
const router = express.Router();
const kvUsers = require("../kv-users");

const MIGRATION_KEY = process.env.MIGRATION_KEY;

router.post("/", async (req, res) => {
    try {
        if (!MIGRATION_KEY || req.headers["x-migration-key"] !== MIGRATION_KEY) {
            return res.status(403).json({
                success: false,
                message: "Forbidden"
            });
        }

        const users = Array.isArray(req.body.users)
            ? req.body.users
            : [];

        let count = 0;

        for (const user of users) {
            if (!user || !user.email) continue;

            await kvUsers.saveUser(user);
            count++;
        }

        res.json({
            success: true,
            migrated: count
        });

    } catch (e) {
        console.error("MIGRATION ERROR:", e);
        res.status(500).json({
            success: false,
            message: "Migration failed"
        });
    }
});

module.exports = router;
