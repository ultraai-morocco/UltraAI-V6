const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const auth = require("../auth");
const kvUsers = require("../kv-users");

const META_GRAPH_VERSION =
    process.env.META_GRAPH_VERSION || "v26.0";

const META_APP_ID =
    process.env.META_APP_ID || "";

const META_APP_SECRET =
    process.env.META_APP_SECRET || "";

const META_REDIRECT_URI =
    process.env.META_REDIRECT_URI ||
    "https://ultraai-v6.ultraai-morocco.deno.net/facebook/callback";

const STATE_SECRET =
    process.env.ULTRAAI_JWT_SECRET ||
    "ultraai-facebook-state-secret";


function graphUrl(path, params = {}) {

    const url =
        new URL(
            `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`
        );

    Object.entries(params).forEach(([key, value]) => {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(
                key,
                String(value)
            );
        }

    });

    return url;
}


/* =========================================
   STATE
========================================= */

function createState(user) {

    const payload = {

        userId:
            String(user.id),

        createdAt:
            Date.now(),

        nonce:
            crypto
                .randomBytes(16)
                .toString("hex")

    };

    const data =
        Buffer
            .from(
                JSON.stringify(payload)
            )
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

    const data =
        parts[0];

    const signature =
        parts[1];

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

        if (
            !payload.createdAt ||
            Date.now() -
                payload.createdAt >
                10 * 60 * 1000
        ) {
            return null;
        }

        return payload;

    } catch {

        return null;

    }
}


/* =========================================
   USER FROM TOKEN
========================================= */

async function getUserFromRequest(req) {

    const token =
        req.headers.authorization?.split(" ")[1] ||
        req.query.token;

    if (!token) {
        return null;
    }

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
}


/* =========================================
   CONNECT
========================================= */

router.get(
    "/connect",
    async (req, res) => {

        try {

            if (
                !META_APP_ID ||
                !META_APP_SECRET
            ) {
                return res.status(500).send(
                    "Facebook OAuth credentials are not configured."
                );
            }

            const user =
                await getUserFromRequest(req);

            if (!user) {
                return res.status(401).send(
                    "يجب تسجيل الدخول إلى UltraAI أولاً."
                );
            }

            const state =
                createState(user);

            const authUrl =
                new URL(
                    `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`
                );

            authUrl.searchParams.set(
                "client_id",
                META_APP_ID
            );

            authUrl.searchParams.set(
                "redirect_uri",
                META_REDIRECT_URI
            );

            authUrl.searchParams.set(
                "state",
                state
            );

            /*
             * الصلاحيات المطلوبة لجلب Pages
             * والنشر لاحقاً.
             */
            authUrl.searchParams.set(
                "scope",
                [
                    "pages_show_list",
                    "pages_read_engagement",
                    "pages_manage_posts"
                ].join(",")
            );

            res.redirect(
                authUrl.toString()
            );

        } catch (error) {

            console.error(
                "Facebook OAuth connect error:",
                error
            );

            res.status(500).send(
                "تعذر بدء ربط Facebook."
            );

        }

    }
);


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
                error,
                error_description
            } = req.query;

            if (error) {

                return res.status(400).send(
                    `
                    <h2>Facebook connection cancelled ❌</h2>
                    <p>${String(error_description || error)}</p>
                    `
                );

            }

            if (!code) {

                return res.status(400).send(
                    "Missing Facebook authorization code."
                );

            }

            const stateData =
                verifyState(state);

            if (!stateData) {

                return res.status(400).send(
                    "Invalid or expired OAuth state."
                );

            }

            const user =
                await kvUsers.findUserById(
                    String(stateData.userId)
                );

            if (!user) {

                return res.status(404).send(
                    "UltraAI account not found."
                );

            }


            /* =================================
               CODE → USER ACCESS TOKEN
            ================================= */

            const tokenUrl =
                graphUrl(
                    "/oauth/access_token",
                    {
                        client_id:
                            META_APP_ID,

                        client_secret:
                            META_APP_SECRET,

                        redirect_uri:
                            META_REDIRECT_URI,

                        code
                    }
                );

            const tokenResponse =
                await fetch(
                    tokenUrl.toString()
                );

            const tokenData =
                await tokenResponse.json();

            if (
                !tokenResponse.ok ||
                !tokenData.access_token
            ) {

                console.error(
                    "Facebook token error:",
                    tokenData
                );

                throw new Error(
                    "FACEBOOK_TOKEN_EXCHANGE_FAILED"
                );

            }


            /* =================================
               USER TOKEN → PAGES
            ================================= */

            const pagesUrl =
                graphUrl(
                    "/me/accounts",
                    {
                        access_token:
                            tokenData.access_token
                    }
                );

            const pagesResponse =
                await fetch(
                    pagesUrl.toString()
                );

            const pagesData =
                await pagesResponse.json();

            if (
                !pagesResponse.ok
            ) {

                console.error(
                    "Facebook pages error:",
                    pagesData
                );

                throw new Error(
                    "FACEBOOK_PAGES_FETCH_FAILED"
                );

            }


            const pages =
                Array.isArray(
                    pagesData.data
                )
                    ? pagesData.data
                    : [];


            /*
             * نحفظ User Access Token مؤقتاً
             * فقط باش الصفحة التالية تقدر
             * تختار Page.
             *
             * Page token سيتم حفظه بعد الاختيار.
             */

            const pendingFacebook = {

                connected:
                    false,

                userAccessToken:
                    tokenData.access_token,

                pages:
                    pages.map(page => ({
                        id:
                            page.id,

                        name:
                            page.name,

                        accessToken:
                            page.access_token || ""
                    })),

                createdAt:
                    new Date().toISOString()

            };


            const updatedUser =
                await kvUsers.updateUser({
                    ...user,

                    facebook:
                        pendingFacebook

                });


            if (
                !updatedUser?.facebook
            ) {
                throw new Error(
                    "FACEBOOK_SAVE_FAILED"
                );
            }


            console.log(
                "✅ Facebook OAuth successful:",
                user.id,
                "Pages:",
                pages.length
            );


            res.send(`
                <!doctype html>

                <html>

                <head>

                    <meta charset="utf-8">

                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >

                    <title>
                        Facebook Connected
                    </title>

                </head>

                <body>

                    <h2>
                        Facebook authorization successful ✅
                    </h2>

                    <p>
                        تم ربط Facebook بنجاح.
                    </p>

                    <p>
                        جاري الرجوع إلى UltraAI...
                    </p>

                    <script>

                        setTimeout(function () {

                            window.location.replace(
                                "/?page=facebook&facebook=authorized"
                            );

                        }, 700);

                    </script>

                </body>

                </html>
            `);

        } catch (error) {

            console.error(
                "Facebook OAuth callback error:",
                error
            );

            res.status(500).send(
                "Facebook authorization failed."
            );

        }

    }
);


/* =========================================
   STATUS
========================================= */

router.get(
    "/status",
    async (req, res) => {

        try {

            const user =
                await getUserFromRequest(req);

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "يجب تسجيل الدخول."
                });

            }

            const facebook =
                user.facebook || {};

            return res.json({

                success: true,

                connected:
                    facebook.connected === true,

                pageId:
                    facebook.pageId || "",

                pageName:
                    facebook.pageName || "",

                pages:
                    Array.isArray(
                        facebook.pages
                    )
                        ? facebook.pages.map(
                            page => ({
                                id: page.id,
                                name: page.name
                            })
                        )
                        : []

            });

        } catch (error) {

            console.error(
                "Facebook status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "تعذر تحميل حالة Facebook."
            });

        }

    }
);


/* =========================================
   SELECT PAGE
========================================= */

router.post(
    "/select-page",
    async (req, res) => {

        try {

            const user =
                await getUserFromRequest(req);

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "يجب تسجيل الدخول."
                });

            }

            const pageId =
                String(
                    req.body?.pageId || ""
                ).trim();

            if (!pageId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "pageId مطلوب."
                });

            }

            const facebook =
                user.facebook || {};

            const pages =
                Array.isArray(
                    facebook.pages
                )
                    ? facebook.pages
                    : [];

            const page =
                pages.find(
                    item =>
                        String(item.id) ===
                        pageId
                );

            if (!page) {

                return res.status(404).json({
                    success: false,
                    message:
                        "الصفحة غير موجودة."
                });

            }

            if (!page.accessToken) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Page Access Token غير موجود."
                });

            }


            const facebookData = {

                ...facebook,

                connected:
                    true,

                pageId:
                    String(page.id),

                pageName:
                    String(page.name || ""),

                pageAccessToken:
                    String(page.accessToken),

                connectedAt:
                    new Date().toISOString()

            };


            /*
             * من بعد الاختيار ما بقيناش
             * محتاجين لائحة Pages كاملة.
             */

            delete facebookData.pages;

            delete facebookData.userAccessToken;


            const savedUser =
                await kvUsers.updateUser({
                    ...user,

                    facebook:
                        facebookData

                });


            if (
                savedUser?.facebook?.connected !== true
            ) {

                throw new Error(
                    "FACEBOOK_CONNECTION_SAVE_FAILED"
                );

            }


            return res.json({

                success: true,

                message:
                    "تم ربط صفحة Facebook بنجاح ✅",

                page: {

                    id:
                        savedUser.facebook.pageId,

                    name:
                        savedUser.facebook.pageName

                }

            });

        } catch (error) {

            console.error(
                "Facebook page selection error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "تعذر ربط صفحة Facebook."
            });

        }

    }
);


/* =========================================
   DISCONNECT
========================================= */

router.post(
    "/disconnect",
    async (req, res) => {

        try {

            const user =
                await getUserFromRequest(req);

            if (!user) {

                return res.status(401).json({
                    success: false
                });

            }

            const copy =
                {
                    ...user
                };

            delete copy.facebook;

            await kvUsers.updateUser(
                copy
            );

            res.json({
                success: true,
                message:
                    "تم فصل Facebook."
            });

        } catch (error) {

            console.error(
                "Facebook disconnect error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "تعذر فصل Facebook."
            });

        }

    }
);


/* =========================================
   PUBLISH
========================================= */

router.post(
    "/publish",
    async (req, res) => {

        try {

            const user =
                await getUserFromRequest(req);

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "يجب تسجيل الدخول."
                });

            }

            const facebook =
                user.facebook || {};

            if (
                facebook.connected !== true ||
                !facebook.pageId ||
                !facebook.pageAccessToken
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "خاصك تربط Facebook Page أولاً."
                });

            }

            const message =
                String(
                    req.body?.message || ""
                ).trim();

            const imageUrl =
                String(
                    req.body?.imageUrl || ""
                ).trim();

            if (!message && !imageUrl) {

                return res.status(400).json({
                    success: false,
                    message:
                        "خاصك تدخل النص أو رابط الصورة."
                });

            }

            if (
                imageUrl &&
                !/^https:\/\//i.test(imageUrl)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "رابط الصورة خاصو يكون HTTPS."
                });

            }

            let endpoint;
            let body;

            if (imageUrl) {

                endpoint =
                    graphUrl(
                        `/${facebook.pageId}/photos`
                    );

                body = {
                    url:
                        imageUrl,

                    access_token:
                        facebook.pageAccessToken
                };

                if (message) {
                    body.caption = message;
                }

            } else {

                endpoint =
                    graphUrl(
                        `/${facebook.pageId}/feed`
                    );

                body = {
                    message,

                    access_token:
                        facebook.pageAccessToken
                };

            }

            const params =
                new URLSearchParams();

            Object.entries(body).forEach(
                ([key, value]) => {
                    params.set(
                        key,
                        String(value)
                    );
                }
            );

            const response =
                await fetch(
                    endpoint.toString(),
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            params.toString()
                    }
                );

            const data =
                await response.json();

            if (!response.ok || data.error) {

                console.error(
                    "Facebook publish error:",
                    data
                );

                return res.status(
                    response.status || 500
                ).json({
                    success: false,
                    message:
                        data?.error?.message ||
                        "Facebook publication failed.",
                    error:
                        data?.error || null
                });

            }

            console.log(
                "✅ Facebook post published:",
                user.id,
                facebook.pageId,
                data
            );

            return res.json({

                success: true,

                message:
                    "تم نشر المنشور في Facebook بنجاح ✅",

                post:
                    data

            });

        } catch (error) {

            console.error(
                "Facebook publish exception:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "تعذر نشر المنشور في Facebook."
            });

        }

    }
);


module.exports = router;
