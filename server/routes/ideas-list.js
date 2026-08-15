const express = require("express");
const router = express.Router();

const db = require("../database");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, (req, res) => {

    try {

        const userId =
            req.user.id ||
            req.user.userId ||
            req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "تعذر تحديد المستخدم."
            });
        }

        const ideas = db.loadIdeas();

        const userIdeas =
            ideas
                .filter(
                    idea =>
                        String(idea.userId) ===
                        String(userId)
                )
                .sort(
                    (a, b) =>
                        new Date(b.createdAt) -
                        new Date(a.createdAt)
                );

        res.json({
            success: true,
            ideas: userIdeas
        });

    } catch (error) {

        console.error(
            "IDEAS LIST ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر جلب الأفكار."
        });
    }
});

module.exports = router;
