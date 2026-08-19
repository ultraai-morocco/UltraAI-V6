const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    const token = process.env.PADDLE_CLIENT_TOKEN;

    if (!token) {
        return res.status(500).json({
            success: false,
            message: "Paddle Client Token غير مضبوط."
        });
    }

    res.json({
        success: true,
        clientToken: token,
        environment: "sandbox"
    });
});

module.exports = router;
