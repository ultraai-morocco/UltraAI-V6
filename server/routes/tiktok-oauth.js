const express = require("express");
const crypto = require("crypto");
const auth = require("../auth");
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
 * TikTok OAuth STATE
 *
 * ما نعتمدوش على Map أو Deno KV باش state يبقى صالح
 * بين instances مختلفة في Deno Deploy.
 *
 * state = base64url(payload) + "." + HMAC-SHA256 signature
 */

function getStateSecret() {
    const secret =
        process.env.TIKTOK_CLIENT_SECRET ||
        process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("TikTok state secret is missing");
    }

    return String(secret);
}

function base64urlEncode(value) {
    return Buffer
        .from(value)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64urlDecode(value) {
    let s = String(value)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (s.length % 4) s += "=";

    return Buffer
        .from(s, "base64")
        .toString("utf8");
}

function createOAuthState(userId) {

    const payload = {
        userId: String(userId),
        createdAt: Date.now(),
        nonce: crypto.randomBytes(24).toString("hex")
    };

    const encoded =
        base64urlEncode(
            JSON.stringify(payload)
        );

    const signature =
        crypto
            .createHmac(
                "sha256",
                getStateSecret()
            )
            .update(encoded)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");

    return encoded + "." + signature;
}

function verifyOAuthState(state) {

    if (!state || typeof state !== "string") {
        return null;
    }

    const parts = state.split(".");

    if (parts.length !== 2) {
        return null;
    }

    const [encoded, receivedSignature] = parts;

    if (!encoded || !receivedSignature) {
        return null;
    }

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                getStateSecret()
            )
            .update(encoded)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");

    try {

        const a =
            Buffer.from(
                receivedSignature
            );

        const b =
            Buffer.from(
                expectedSignature
            );

        if (
            a.length !== b.length ||
            !crypto.timingSafeEqual(a, b)
        ) {
            return null;
        }

        const payload =
            JSON.parse(
                base64urlDecode(encoded)
            );

        if (!payload.userId) {
            return null;
        }

        /*
         * STATE صالح فقط 10 دقائق
         */
        if (
            !payload.createdAt ||
            Date.now() - Number(payload.createdAt) >
                10 * 60 * 1000
        ) {
            return null;
        }

        return payload;

    } catch (error) {
        console.error(
            "TikTok state verification error:",
            error
        );

        return null;
    }
}

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "TikTok OAuth Route خدامة"
    });
});

/*
 * بدء تسجيل الدخول إلى TikTok
 */
router.get("/login", async (req, res) => {
    try {
        const { clientKey, redirectUri } = getConfig();

        const token =
            req.query.token ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "❌ يجب تسجيل الدخول."
            });
        }

        const user = auth.verifyToken(token);

        if (!user) {
            return res.status(403).json({
                success: false,
                message: "🚫 الجلسة غير صالحة."
            });
        }

        const userId =
            user.id ||
            user.userId ||
            user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "تعذر تحديد المستخدم."
            });
        }

        const state =
            createOAuthState(userId);

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

        const stateData = verifyOAuthState(state);

        if (!stateData) {
            return res.status(400).send(
                "TikTok OAuth: invalid or expired state"
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
        const userId =
            req.user?.id ||
            req.user?.userId ||
            req.user?._id;

        console.log("🎵 TikTok STATUS USER:", {
            userId: userId || null
        });

        if (!userId) {
            return res.status(401).json({
                success: false,
                connected: false,
                message: "تعذر تحديد المستخدم."
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
