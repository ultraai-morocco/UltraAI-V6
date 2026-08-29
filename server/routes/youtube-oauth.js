const express = require("express");
const crypto = require("crypto");
const { google } = require("googleapis");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* =========================================
   YOUTUBE VIDEO UPLOAD
========================================= */

const youtubeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!String(file.mimetype || "").startsWith("video/")) {
      return cb(new Error("VIDEO_ONLY"));
    }
    cb(null, true);
  }
});


const auth = require("../auth");
const kvUsers = require("../kv-users");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://ultraai-v6.ultraai-morocco.deno.net/youtube/callback";

const STATE_SECRET =
  process.env.ULTRAAI_JWT_SECRET ||
  "ultraai-youtube-state-secret";

function getOAuthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured");
  }

  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
}

/* إنشاء state مربوط بالمستخدم */
function createState(user) {
  const payload = {
    userId: String(user.id),
    createdAt: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex")
  };

  const data = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const signature = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/* التحقق من state */
function verifyState(state) {
  if (!state || !state.includes(".")) {
    return null;
  }

  const [data, signature] = state.split(".");

  const expected = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(data)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );

    /* صلاحية state: 10 دقائق */
    if (
      !payload.createdAt ||
      Date.now() - payload.createdAt > 10 * 60 * 1000
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/* استخراج مستخدم UltraAI */
async function getUserFromRequest(req) {
  const token =
    req.headers.authorization?.split(" ")[1] ||
    req.query.token;

  if (!token) {
    return null;
  }

  try {
    const decoded = auth.verifyToken(token);

    if (!decoded || !decoded.id) {
      return null;
    }

    /*
     * YouTube OAuth data is stored through kvUsers.
     * Always load the latest user from the same storage.
     */
    const user =
      await kvUsers.findUserById(decoded.id);

    if (!user || user.banned === true) {
      return null;
    }

    return user;

  } catch (error) {
    console.error(
      "YouTube user lookup error:",
      error.message
    );

    return null;
  }
}

/* بدء ربط YouTube */
router.get("/connect", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).send(
        "يجب تسجيل الدخول إلى UltraAI أولاً."
      );
    }

    const oauth2Client = getOAuthClient();

    const state = createState(user);

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      state,
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
      ]
    });

    res.redirect(url);
  } catch (err) {
    console.error("YouTube OAuth connect error:", err);

    res.status(500).send(
      "Google OAuth is not configured yet."
    );
  }
});

/* Google يرجع المستخدم هنا */
router.get("/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error("YouTube OAuth denied:", error);

      return res.status(400).send(`
        <h2>YouTube connection cancelled ❌</h2>
        <p>You can close this page and return to UltraAI.</p>
      `);
    }

    if (!code) {
      return res.status(400).send(
        "Missing authorization code."
      );
    }

    const stateData = verifyState(state);

    if (!stateData) {
      return res.status(400).send(
        "Invalid or expired OAuth state."
      );
    }

    console.log("🔎 OAUTH STATE USER:", stateData.userId);

    const user =
      await kvUsers.findUserById(String(stateData.userId));

    console.log("🔎 OAUTH USER FOUND:", {
      found: !!user,
      id: user?.id || null
    });

    if (!user) {
      return res.status(404).send(
        "UltraAI account not found."
      );
    }

    const oauth2Client = getOAuthClient();

    const { tokens } =
      await oauth2Client.getToken(code);

    console.log("✅ GOOGLE OAUTH TOKENS RECEIVED:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date || null
    });

    /*
     * Google may not return a refresh_token when the
     * account has already granted access.
     */
    const oldYouTube = user.youtube || {};

    const refreshToken =
      tokens.refresh_token ||
      oldYouTube.refreshToken ||
      "";

    if (!refreshToken) {
      return res.status(400).send(`
        <h2>YouTube connection failed ❌</h2>
        <p>Google did not return a refresh token.</p>
        <p>Disconnect UltraAI from your Google account and connect again.</p>
      `);
    }

    /*
     * نخزنو معلومات YouTube داخل حساب المستخدم.
     * refreshToken هو المفتاح الدائم للربط.
     */
    const youtubeData = {
      connected: true,
      refreshToken,
      accessToken:
        tokens.access_token ||
        oldYouTube.accessToken ||
        "",
      expiryDate:
        tokens.expiry_date ||
        oldYouTube.expiryDate ||
        null,
      connectedAt:
        new Date().toISOString()
    };

    const savedUser =
      await kvUsers.updateYouTube(
        user.id,
        youtubeData
      );

    const savedYouTube =
      savedUser?.youtube || {};

    if (
      savedYouTube.connected !== true ||
      !savedYouTube.refreshToken
    ) {
      throw new Error(
        "YOUTUBE_SAVE_VERIFICATION_FAILED"
      );
    }

    console.log(
      "✅ YouTube connected and saved successfully:",
      user.id
    );

    /*
     * OAuth نجح.
     * رجعو المستخدم مباشرة لصفحة Auto YouTube.
     */
    res.send(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>YouTube Connected</title>
      </head>
      <body>
        <h2>YouTube connected successfully ✅</h2>
        <p>جاري الرجوع إلى Auto YouTube...</p>

        <script>
          setTimeout(function () {
            window.location.replace("/?page=youtube&youtube=connected");
          }, 700);
        </script>
      </body>
      </html>
    `);

  } catch (err) {
    console.error(
      "YouTube OAuth callback error:",
      err
    );

    res.status(500).send(
      "YouTube authorization failed."
    );
  }
});


/* =========================================
   PUBLISH VIDEO TO YOUTUBE
========================================= */

router.post("/upload", youtubeUpload.single("video"), async (req, res) => {

  let tempPath = null;

  try {

    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول إلى UltraAI أولاً."
      });
    }

    const youtube = user.youtube || {};

    if (
      youtube.connected !== true ||
      !youtube.refreshToken
    ) {
      return res.status(400).json({
        success: false,
        message: "يجب ربط قناة YouTube أولاً."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "اختر فيديو أولاً."
      });
    }

    const title =
      String(req.body.title || "").trim();

    const description =
      String(req.body.description || "").trim();

    const privacyStatus =
      ["public", "unlisted", "private"]
        .includes(req.body.privacyStatus)
        ? req.body.privacyStatus
        : "private";

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "أدخل عنوان الفيديو."
      });
    }

    const oauth2Client = getOAuthClient();

    oauth2Client.setCredentials({
      refresh_token: youtube.refreshToken
    });

    const youtubeApi = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    const result =
      await youtubeApi.videos.insert({
        part: "snippet,status",

        requestBody: {
          snippet: {
            title,
            description
          },

          status: {
            privacyStatus
          }
        },

        media: {
          mimeType: req.file.mimetype,
          body: require("stream").Readable.from(
            req.file.buffer
          )
        }
      });

    const videoId =
      result.data.id;

    return res.json({
      success: true,
      message: "تم نشر الفيديو على YouTube بنجاح ✅",
      videoId,
      url:
        `https://www.youtube.com/watch?v=${videoId}`
    });

  } catch (err) {

    console.error(
      "YouTube upload error:",
      err
    );

    let message =
      "تعذر نشر الفيديو على YouTube.";

    if (err.message === "VIDEO_ONLY") {
      message = "الملف يجب أن يكون فيديو.";
    }

    if (
      err.code === 401 ||
      err.code === 403
    ) {
      message =
        "انتهت صلاحية ربط YouTube أو لا توجد صلاحية للنشر.";
    }

    return res.status(500).json({
      success: false,
      message
    });

  } finally {

    if (tempPath) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }

  }
});




/* =========================================
   INTERNAL AUTO YOUTUBE UPLOAD
   تستعمل من Auto YouTube Runner
========================================= */
async function uploadGeneratedVideo({
  user,
  videoPath,
  title,
  description,
  privacyStatus
}) {
  const youtube = user?.youtube || {};

  if (
    youtube.connected !== true ||
    !youtube.refreshToken
  ) {
    throw new Error(
      "يجب ربط قناة YouTube أولاً."
    );
  }

  const cleanPath =
    String(videoPath || "")
      .replace(/^\/+/, "");

  const publicRoot =
    path.resolve(
      __dirname,
      "..",
      "..",
      "public"
    );

  const videoFile =
    path.resolve(
      publicRoot,
      cleanPath
    );

  if (
    !videoFile.startsWith(publicRoot + path.sep) &&
    videoFile !== publicRoot
  ) {
    throw new Error(
      "مسار الفيديو غير صالح."
    );
  }

  if (!fs.existsSync(videoFile)) {
    throw new Error(
      "ملف الفيديو غير موجود."
    );
  }

  const stat = fs.statSync(videoFile);

  if (!stat.isFile() || stat.size === 0) {
    throw new Error(
      "ملف الفيديو غير صالح."
    );
  }

  const cleanTitle =
    String(title || "").trim();

  const cleanDescription =
    String(description || "").trim();

  const cleanPrivacy =
    ["public", "unlisted", "private"]
      .includes(privacyStatus)
      ? privacyStatus
      : "private";

  if (!cleanTitle) {
    throw new Error(
      "عنوان الفيديو مطلوب."
    );
  }

  console.log(
    "📤 INTERNAL AUTO YOUTUBE UPLOAD:",
    videoFile
  );

  const oauth2Client =
    getOAuthClient();

  oauth2Client.setCredentials({
    refresh_token:
      youtube.refreshToken
  });

  const youtubeApi =
    google.youtube({
      version: "v3",
      auth: oauth2Client
    });

  const result =
    await youtubeApi.videos.insert({
      part: "snippet,status",

      requestBody: {
        snippet: {
          title: cleanTitle,
          description: cleanDescription
        },

        status: {
          privacyStatus:
            cleanPrivacy
        }
      },

      media: {
        mimeType: "video/mp4",
        body:
          fs.createReadStream(
            videoFile
          )
      }
    });

  const videoId =
    result.data.id;

  const url =
    `https://www.youtube.com/watch?v=${videoId}`;

  console.log(
    "✅ INTERNAL AUTO YOUTUBE PUBLISHED:",
    videoId
  );

  return {
    success: true,
    videoId,
    url
  };
}

/* =========================================
   PUBLISH GENERATED AUTO CONTENT VIDEO
========================================= */

router.post("/upload-generated", async (req, res) => {

  try {

    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول إلى UltraAI أولاً."
      });
    }

    const youtube = user.youtube || {};

    if (
      youtube.connected !== true ||
      !youtube.refreshToken
    ) {
      return res.status(400).json({
        success: false,
        message: "يجب ربط قناة YouTube أولاً."
      });
    }

    const {
      videoPath,
      title,
      description,
      privacyStatus
    } = req.body || {};

    if (!videoPath) {
      return res.status(400).json({
        success: false,
        message: "مسار الفيديو مطلوب."
      });
    }

    const cleanPath =
      String(videoPath)
        .replace(/^\/+/, "");

    const publicRoot =
      path.resolve(
        __dirname,
        "..",
        "..",
        "public"
      );

    const videoFile =
      path.resolve(
        publicRoot,
        cleanPath
      );

    if (
      !videoFile.startsWith(publicRoot + path.sep) &&
      videoFile !== publicRoot
    ) {
      return res.status(400).json({
        success: false,
        message: "مسار الفيديو غير صالح."
      });
    }

    if (!fs.existsSync(videoFile)) {
      return res.status(404).json({
        success: false,
        message: "ملف الفيديو غير موجود."
      });
    }

    const stat =
      fs.statSync(videoFile);

    if (!stat.isFile() || stat.size === 0) {
      return res.status(400).json({
        success: false,
        message: "ملف الفيديو غير صالح."
      });
    }

    const cleanTitle =
      String(title || "").trim();

    const cleanDescription =
      String(description || "").trim();

    const cleanPrivacy =
      ["public", "unlisted", "private"]
        .includes(privacyStatus)
        ? privacyStatus
        : "private";

    if (!cleanTitle) {
      return res.status(400).json({
        success: false,
        message: "عنوان الفيديو مطلوب."
      });
    }

    console.log(
      "📤 AUTO YOUTUBE UPLOAD:",
      videoFile
    );

    const oauth2Client =
      getOAuthClient();

    oauth2Client.setCredentials({
      refresh_token:
        youtube.refreshToken
    });

    const youtubeApi =
      google.youtube({
        version: "v3",
        auth: oauth2Client
      });

    const result =
      await youtubeApi.videos.insert({

        part: "snippet,status",

        requestBody: {

          snippet: {
            title: cleanTitle,
            description: cleanDescription
          },

          status: {
            privacyStatus: cleanPrivacy
          }

        },

        media: {
          mimeType: "video/mp4",
          body: fs.createReadStream(videoFile)
        }

      });

    const videoId =
      result.data.id;

    console.log(
      "✅ AUTO YOUTUBE PUBLISHED:",
      videoId
    );

    return res.json({

      success: true,

      message:
        "تم نشر الفيديو على YouTube بنجاح ✅",

      videoId,

      url:
        `https://www.youtube.com/watch?v=${videoId}`

    });

  } catch (err) {

    console.error(
      "AUTO YOUTUBE UPLOAD ERROR:",
      err
    );

    let message =
      "تعذر نشر الفيديو على YouTube.";

    if (
      err.code === 401 ||
      err.code === 403
    ) {
      message =
        "انتهت صلاحية ربط YouTube أو لا توجد صلاحية للنشر.";
    }

    return res.status(500).json({
      success: false,
      message
    });
  }

});

/* معرفة حالة الربط */
router.get("/status", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "يجب تسجيل الدخول"
      });
    }

    const youtube = user.youtube || {};

    res.json({
      success: true,
      connected: youtube.connected === true,
      connectedAt: youtube.connectedAt || null
    });

  } catch (err) {
    console.error(
      "YouTube status error:",
      err
    );

    res.status(500).json({
      success: false,
      message: "تعذر معرفة حالة YouTube"
    });
  }
});

router.uploadGeneratedVideo = uploadGeneratedVideo;

module.exports = router;
