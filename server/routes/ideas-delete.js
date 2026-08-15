const express = require("express");
const router = express.Router();

const db = require("../database");
const authMiddleware = require("../middleware/auth");

router.delete("/:id", authMiddleware, (req, res) => {

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

        const deletedIdea =
            ideas[index];

        ideas.splice(index, 1);

        db.saveIdeas(ideas);

        res.json({
            success: true,
            message: "تم حذف الفكرة.",
            idea: deletedIdea
        });

    } catch (error) {

        console.error(
            "IDEA DELETE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "تعذر حذف الفكرة."
        });
    }
});

module.exports = router;
