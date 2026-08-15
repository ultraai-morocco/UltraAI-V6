const express = require("express");
const router = express.Router();

const db = require("../database");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, (req, res) => {

    try {

        const {
            title = "",
            description = "",
            type = "general"
        } = req.body || {};

        const cleanTitle = String(title).trim();
        const cleanDescription = String(description).trim();

        if (!cleanTitle || !cleanDescription) {
            return res.status(400).json({
                success: false,
                message: "عنوان ووصف الفكرة مطلوبان."
            });
        }

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

        const idea = {
            id:
                Date.now().toString() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 8),

            userId: String(userId),

            title: cleanTitle,
            description: cleanDescription,

            type: String(type),

            favorite: false,

            createdAt:
                new Date().toISOString()
        };

        ideas.push(idea);

        db.saveIdeas(ideas);

        res.json({
            success: true,
            idea
        });

    } catch (error) {

        console.error(
            "IDEA SAVE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر حفظ الفكرة."
        });
    }
});

module.exports = router;
