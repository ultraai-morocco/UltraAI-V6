const express = require("express");
const { Paddle, Environment } = require("@paddle/paddle-node-sdk");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const paddle = new Paddle({
    apiKey: process.env.PADDLE_API_KEY,
    environment: Environment.sandbox
});

const USERS_FILE = path.join(
    __dirname,
    "..",
    "data",
    "users.json"
);

function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const users = JSON.parse(
            fs.readFileSync(USERS_FILE, "utf8")
        );
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2),
        "utf8"
    );
}

router.post(
    "/",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        try {
            const signature =
                req.headers["paddle-signature"];

            const secret =
                process.env.PADDLE_WEBHOOK_SECRET;

            if (!signature || !secret) {
                return res
                    .status(500)
                    .send("Paddle webhook is not configured");
            }

            const event =
                await paddle.webhooks.unmarshal(
                    req.body.toString(),
                    secret,
                    signature
                );

            console.log(
                "PADDLE EVENT:",
                event.eventType
            );

            const data = event.data || {};

            const customData =
                data.customData || {};

            const userId =
                customData.userId ||
                customData.user_id;

            if (!userId) {
                console.log(
                    "PADDLE: userId missing"
                );
                return res.sendStatus(200);
            }

            const users = loadUsers();

            const index = users.findIndex(
                user =>
                    String(user.id) ===
                    String(userId)
            );

            if (index === -1) {
                console.log(
                    "PADDLE: user not found:",
                    userId
                );
                return res.sendStatus(200);
            }

            const user = users[index];

            if (
                event.eventType ===
                    "subscription.created" ||
                event.eventType ===
                    "subscription.updated"
            ) {
                user.subscription = {
                    status:
                        data.status || "active",

                    plan: "premium",

                    paddleSubscriptionId:
                        data.id || null,

                    paddleCustomerId:
                        data.customerId || null,

                    currentPeriodEnd:
                        data.nextBilledAt || null,

                    updatedAt:
                        new Date().toISOString()
                };
            }

            if (
                event.eventType ===
                "subscription.canceled"
            ) {
                user.subscription = {
                    ...(user.subscription || {}),

                    status: "canceled",

                    plan: "premium",

                    paddleSubscriptionId:
                        data.id || null,

                    updatedAt:
                        new Date().toISOString()
                };
            }

            saveUsers(users);

            console.log(
                "PREMIUM UPDATED:",
                user.id
            );

            return res.sendStatus(200);

        } catch (error) {
            console.error(
                "PADDLE WEBHOOK ERROR:",
                error.message
            );

            return res
                .status(400)
                .send("Invalid Paddle webhook");
        }
    }
);

module.exports = router;
