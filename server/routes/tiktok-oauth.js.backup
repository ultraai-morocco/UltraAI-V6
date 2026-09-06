const express = require("express");
const crypto = require("crypto");

const router = express.Router();

function getConfig() {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
        throw new Error("TikTok OAuth environment variables are missing");
    }

    return {
        clientKey,
        redirectUri
    };
}

/*
 * اختبار المسار
 */
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "TikTok OAuth route خدامة"
    });
});

/*
 * بدء تسجيل الدخول إلى TikTok
 */
router.get("/login", (req, res) => {
    try {
        const { clientKey, redirectUri } = getConfig();

        const state = crypto.randomBytes(24).toString("hex");

        const params = new URLSearchParams({
            client_key: clientKey,
            response_type: "code",
            scope: "user.info.basic,video.upload",
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
        const { code } = req.query;

        if (!code) {
            return res.status(400).send(`
                <h2>TikTok OAuth Error</h2>
                <p>Authorization code is missing.</p>
            `);
        }

        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        const redirectUri = process.env.TIKTOK_REDIRECT_URI;

        if (!clientKey || !clientSecret || !redirectUri) {
            throw new Error(
                "TikTok OAuth environment variables are missing"
            );
        }

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

        const tokenData = await tokenResponse.json();

        console.log(
            "TikTok token response:",
            tokenData
        );

        if (!tokenResponse.ok || !tokenData.access_token) {
            return res.status(400).json({
                success: false,
                error: "TikTok token exchange failed",
                details: tokenData
            });
        }

        /*
         * حالياً غير مخزنين الـ token.
         * أولاً نتأكد أن OAuth خدام.
         */
        res.send(`
            <!doctype html>
            <html lang="ar">
            <head>
                <meta charset="utf-8">
                <title>TikTok Connected</title>
                <meta name="viewport"
                      content="width=device-width,initial-scale=1">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                    }
                </style>
            </head>
            <body>
                <h2>✅ تم ربط TikTok بنجاح</h2>
                <p>UltraAI متصل بحساب TikTok ديالك.</p>
            </body>
            </html>
        `);

    } catch (error) {
        console.error(
            "TikTok callback error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
