const express = require("express");
const router = express.Router();
const kvUsers = require("../kv-users");

router.post("/", async (req, res) => {
    try {

        const secret = String(req.headers["x-ultraai-migrate"] || "");

        if (secret !== "ULTRAAI-MIGRATE-2026") {
            return res.status(403).json({
                success: false,
                message: "Forbidden"
            });
        }

        const users = Array.isArray(req.body.users)
            ? req.body.users
            : [];

        let migrated = 0;

        for (const user of users) {

            if (!user || !user.email) {
                continue;
            }

            await kvUsers.saveUser(user);
            migrated++;
        }

        return res.json({
            success: true,
            migrated
        });

    } catch (error) {

        console.error("MIGRATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Migration failed"
        });
    }
});

module.exports = router;
