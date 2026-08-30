const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const auth = require("../auth");
const kvUsers = require("../kv-users");

const STATE_SECRET =
    process.env.ULTRAAI_JWT_SECRET ||
    "ultraai-tiktok-state-secret";

/* =========================================
   CONFIG
========================================= */

function getConfig() {
    const clientKey =
        process.env.TIKTOK_CLIENT_KEY;

    const clientSecret =
        process.env.TIKTOK_CLIENT_SECRET;

    const redirectUri =
        process.env.TIKTOK_REDIRECT_URI;

    if (
        !clientKey ||
        !clientSecret ||
        !redirectUri
    ) {
        throw new Error(
            "TikTok OAuth environment variables are missing"
        );
    }

    return {
        clientKey,
        clientSecret,
        redirectUri
    };
}

/* =========================================
   STATE
   مربوط بالمستخدم وموقع
========================================= */

function createState(user) {

    const payload = {
        userId: String(user.id),
        createdAt: Date.now(),
        nonce: crypto
            .randomBytes(16)
            .toString("hex")
    };

    const data =
        Buffer
            .from(JSON.stringify(payload))
            .toString("base64url");

    const signature =
        crypto
            .createHmac(
                "sha256",
                STATE_SECRET
            )
            .update(data)
            .digest("base64url");

    return `${data}.${signature}`;
}

function verifyState(state) {

    if (
        !state ||
        !state.includes(".")
    ) {
        return null;
    }

    const parts =
        state.split(".");

    if (parts.length !== 2) {
        return null;
    }

    const [data, signature] =
        parts;

    const expected =
        crypto
            .createHmac(
                "sha256",
                STATE_SECRET
            )
            .update(data)
            .digest("base64url");

    if (
        signature.length !==
        expected.length
    ) {
        return null;
    }

    if (
        !crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        )
    ) {
        return null;
    }

    try {

        const payload =
            JSON.parse(
                Buffer
                    .from(
                        data,
                        "base64url"
                    )
                    .toString("utf8")
            );

        /* State صالح لمدة 10 دقائق */

        if (
            !payload.createdAt ||
            Date.now() -
                payload.createdAt >
                10 * 60 * 1000
        ) {
            return null;
        }

        if (!payload.userId) {
            return null;
        }

        return payload;

    } catch {

        return null;
    }
}

/* =========================================
   USER FROM REQUEST
========================================= */

async function getUserFromRequest(req) {

    const token =
        req.headers.authorization?.split(" ")[1] ||
        req.query.token;

    if (!token) {
        return null;
    }

    try {

        const decoded =
            auth.verifyToken(token);

        if (
            !decoded ||
            !decoded.id
        ) {
            return null;
        }

        const user =
            await kvUsers.findUserById(
                decoded.id
            );

        if (
            !user ||
            user.banned === true
        ) {
            return null;
        }

        return user;

    } catch (error) {

        console.error(
            "TikTok user lookup error:",
            error.message
        );

        return null;
    }
}

/* =========================================
   TEST
========================================= */

router.get("/test", (req, res) => {

    res.json({
        success: true,
        message: "TikTok OAuth Route خدامة"
    });

});

/* =========================================
   LOGIN
========================================= */

router.get("/login", async (req, res) => {

    try {

        const {
            clientKey,
            redirectUri
        } = getConfig();

        const user =
            await getUserFromRequest(req);

        if (!user) {

            return res.status(401).send(
                "يجب تسجيل الدخول إلى UltraAI أولاً."
            );
        }

        const state =
            createState(user);

        const params =
            new URLSearchParams({

                client_key:
                    clientKey,

                response_type:
                    "code",

                scope:
                    "user.info.basic video.publish video.upload",

                redirect_uri:
                    redirectUri,

                state
            });

        console.log(
            "🔗 Starting TikTok OAuth for user:",
            user.id
        );

        res.redirect(
            "https://www.tiktok.com/v2/auth/authorize/?" +
            params.toString()
        );

    } catch (error) {

        console.error(
            "TikTok login error:",
            error
        );

        res.status(500).json({

            success: false,

            error:
                "TikTok OAuth configuration error"
        });
    }

});

/* =========================================
   CALLBACK
========================================= */

router.get(
    "/callback",
    async (req, res) => {

        try {

            const {
                code,
                state,
                error
            } = req.query;

            if (error) {

                console.error(
                    "TikTok OAuth denied:",
                    error
                );

                return res.status(400).send(`
                    <h2>TikTok connection cancelled ❌</h2>
                    <p>يمكنك الرجوع إلى UltraAI.</p>
                    <script>
                        setTimeout(function () {
                            window.location.replace(
                                "/?page=auto-content&tiktok=cancelled"
                            );
                        }, 1200);
                    </script>
                `);
            }

            if (!code) {

                return res.status(400).send(
                    "Missing TikTok authorization code."
                );
            }

            /* تحقق من state */

            const stateData =
                verifyState(state);

            if (!stateData) {

                return res.status(400).send(
                    "Invalid or expired TikTok OAuth state."
                );
            }

            console.log(
                "🔎 TIKTOK OAUTH STATE USER:",
                stateData.userId
            );

            /* جيب المستخدم */

            const user =
                await kvUsers.findUserById(
                    String(stateData.userId)
                );

            console.log(
                "🔎 TIKTOK USER FOUND:",
                {
                    found: !!user,
                    id: user?.id || null
                }
            );

            if (!user) {

                return res.status(404).send(
                    "UltraAI account not found."
                );
            }

            const {
                clientKey,
                clientSecret,
                redirectUri
            } = getConfig();

            /* =================================
               TOKEN EXCHANGE
            ================================= */

            const tokenResponse =
                await fetch(
                    "https://open.tiktokapis.com/v2/oauth/token/",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            new URLSearchParams({

                                client_key:
                                    clientKey,

                                client_secret:
                                    clientSecret,

                                code,

                                grant_type:
                                    "authorization_code",

                                redirect_uri:
                                    redirectUri
                            })
                    }
                );

            const tokenData =
                await tokenResponse.json();

            console.log(
                "TikTok token response:",
                {
                    success:
                        !!tokenData.access_token,

                    open_id:
                        tokenData.open_id ||
                        null,

                    hasRefreshToken:
                        !!tokenData.refresh_token,

                    expiresIn:
                        tokenData.expires_in ||
                        null
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

                return res.status(400).json({

                    success: false,

                    error:
                        "TikTok token exchange failed"
                });
            }

            /* =================================
               SAVE TIKTOK DATA
            ================================= */

            const oldTikTok =
                user.tiktok || {};

            const tiktokData = {

                connected: true,

                openId:
                    tokenData.open_id ||
                    oldTikTok.openId ||
                    "",

                accessToken:
                    tokenData.access_token ||
                    oldTikTok.accessToken ||
                    "",

                refreshToken:
                    tokenData.refresh_token ||
                    oldTikTok.refreshToken ||
                    "",

                expiresIn:
                    tokenData.expires_in ||
                    oldTikTok.expiresIn ||
                    null,

                refreshExpiresIn:
                    tokenData.refresh_expires_in ||
                    oldTikTok.refreshExpiresIn ||
                    null,

                connectedAt:
                    new Date().toISOString()
            };

            /*
             * نحفظ TikTok داخل user
             * مع الحفاظ على باقي بيانات الحساب.
             */

            const savedUser =
                await kvUsers.saveUser({

                    ...user,

                    tiktok:
                        tiktokData
                });

            const savedTikTok =
                savedUser?.tiktok || {};

            if (
                savedTikTok.connected !== true ||
                !savedTikTok.accessToken
            ) {

                throw new Error(
                    "TIKTOK_SAVE_VERIFICATION_FAILED"
                );
            }

            console.log(
                "✅ TikTok connected and saved successfully:",
                user.id
            );

            /* =================================
               رجوع Auto Content
            ================================= */

            res.send(`
                <!doctype html>
                <html lang="ar">
                <head>
                    <meta charset="utf-8">
                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >
                    <title>TikTok Connected</title>
                </head>

                <body
                    style="
                        font-family:Arial,sans-serif;
                        text-align:center;
                        padding:50px;
                    "
                >

                    <h2>
                        TikTok connected successfully ✅
                    </h2>

                    <p>
                        جاري الرجوع إلى Auto Content...
                    </p>

                    <script>
                        setTimeout(function () {
                            window.location.replace(
                                "/?page=auto-content&tiktok=connected"
                            );
                        }, 700);
                    </script>

                </body>
                </html>
            `);

        } catch (error) {

            console.error(
                "TikTok OAuth callback error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "TikTok authorization failed."
            });
        }

    }
);

module.exports = router;
