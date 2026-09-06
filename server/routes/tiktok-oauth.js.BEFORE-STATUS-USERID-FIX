const express = require("express");
const crypto = require("crypto");
const authMiddleware = require("../middleware/auth");
const kvUsers = require("../kv-users");

const router = express.Router();

function getConfig() {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !clientSecret || !redirectUri) {
        throw new Error("TikTok OAuth environment variables are missing");
    }

    return {
        clientKey,
        clientSecret,
        redirectUri
    };
}

/*
 * OAuth state مؤقت في الذاكرة.
 * كيربط عملية TikTok بالمستخدم اللي بدا الربط.
 */
const oauthStates = new Map();

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "TikTok OAuth Route خدامة"
    });
});

/*
 * بدء تسجيل الدخول إلى TikTok
 */
router.get("/login", authMiddleware, (req, res) => {
    try {
        const { clientKey, redirectUri } = getConfig();

        const state = crypto.randomBytes(32).toString("hex");

        oauthStates.set(state, {
            userId: req.user.id,
            createdAt: Date.now()
        });

        const params = new URLSearchParams({
            client_key: clientKey,
            response_type: "code",
            scope: "user.info.basic,video.publish",
            redirect_uri: redirectUri,
            state
        });

        res.redirect(
            "https://www.tiktok.com/v2/auth/authorize/?" +
            params.toString()
        );

    } catch (error) {
        console.error("TikTok login error:", error);

        res.status(500).json({
            success: false,
            error: "TikTok OAuth configuration error"
        });
    }
});

/*
 * TikTok OAuth callback
 */
router.get("/callback", async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            return res.redirect(
                "/?page=auto-content&tiktok=error"
            );
        }

        if (!code || !state) {
            return res.status(400).send(
                "TikTok OAuth: code/state missing"
            );
        }

        const stateData = oauthStates.get(state);

        if (!stateData) {
            return res.status(400).send(
                "TikTok OAuth: invalid or expired state"
            );
        }

        oauthStates.delete(state);

        /*
         * صلاحية state: 10 دقائق
         */
        if (
            Date.now() - stateData.createdAt >
            10 * 60 * 1000
        ) {
            return res.status(400).send(
                "TikTok OAuth: state expired"
            );
        }

        const {
            clientKey,
            clientSecret,
            redirectUri
        } = getConfig();

        const tokenResponse = await fetch(
            "https://open.tiktokapis.com/v2/oauth/token/",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_key: clientKey,
                    client_secret: clientSecret,
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri
                })
            }
        );

        const tokenData =
            await tokenResponse.json();

        console.log(
            "TikTok token response:",
            {
                success: !!tokenData.access_token,
                open_id: tokenData.open_id || null
            }
        );

        if (
            !tokenResponse.ok ||
            !tokenData.access_token
        ) {
            console.error(
                "TikTok token exchange failed:",
                tokenData
            );

            return res.redirect(
                "/?page=auto-content&tiktok=error"
            );
        }

        /*
         * جلب المستخدم الحالي من Deno KV
         */
        const user =
            await kvUsers.findUserById(
                stateData.userId
            );

        if (!user) {
            return res.status(404).send(
                "UltraAI user not found"
            );
        }

        /*
         * تخزين TikTok داخل حساب المستخدم.
         */
        user.tiktok = {
            connected: true,
            accessToken:
                tokenData.access_token,
            refreshToken:
                tokenData.refresh_token || null,
            openId:
                tokenData.open_id || null,
            expiresIn:
                tokenData.expires_in || null,
            refreshExpiresIn:
                tokenData.refresh_expires_in || null,
            connectedAt:
                new Date().toISOString()
        };

        await kvUsers.updateUser(user);

        /*
         * الرجوع مباشرة إلى Auto Content
         */
        return res.redirect(
            "/?page=auto-content&tiktok=connected"
        );

    } catch (error) {
        console.error(
            "TikTok callback error:",
            error
        );

        return res.redirect(
            "/?page=auto-content&tiktok=error"
        );
    }
});


/* =========================================
   TIKTOK STATUS
========================================= */

router.get("/status", authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                connected: false,
                message: "يجب تسجيل الدخول إلى UltraAI أولاً."
            });
        }

        const user = await kvUsers.findUserById(String(userId));

        if (!user) {
            return res.status(404).json({
                success: false,
                connected: false,
                message: "UltraAI account not found."
            });
        }

        const tiktok = user.tiktok || {};

        return res.json({
            success: true,
            connected: tiktok.connected === true,
            openId: tiktok.openId || null,
            connectedAt: tiktok.connectedAt || null
        });

    } catch (error) {
        console.error("TikTok status error:", error);

        return res.status(500).json({
            success: false,
            connected: false,
            message: "تعذر الحصول على حالة TikTok."
        });
    }
});

module.exports = router;
