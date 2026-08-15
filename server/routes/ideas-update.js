const express = require("express");
const router = express.Router();

const db = require("../database");
const authMiddleware = require("../middleware/auth");

router.put("/:id", authMiddleware, (req, res) => {

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

        const ideaId =
            String(req.params.id || "").trim();

        if (!ideaId) {
            return res.status(400).json({
                success: false,
                message: "معرف الفكرة مطلوب."
            });
        }

        const {
            title = "",
            description = "",
            type = "general"
        } = req.body || {};

        const cleanTitle =
            String(title).trim();

        const cleanDescription =
            String(description).trim();

        if (!cleanTitle || !cleanDescription) {
            return res.status(400).json({
                success: false,
                message: "عنوان ووصف الفكرة مطلوبان."
            });
        }

        const ideas = db.loadIdeas();

        const index =
            ideas.findIndex(idea =>
                String(idea.id) === ideaId &&
                String(idea.userId) === String(userId)
            );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "الفكرة غير موجودة."
            });
        }

        ideas[index].title =
            cleanTitle;

        ideas[index].description =
            cleanDescription;

        ideas[index].type =
            String(type);

        ideas[index].updatedAt =
            new Date().toISOString();

        db.saveIdeas(ideas);

        res.json({
            success: true,
            message: "تم تعديل الفكرة.",
            idea: ideas[index]
        });

    } catch (error) {

        console.error(
            "IDEA UPDATE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر تعديل الفكرة."
        });
    }
});

module.exports = router;
