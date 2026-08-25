const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://ultraai-v6.ultraai-morocco.deno.net/youtube/callback";

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

// بدء ربط قناة YouTube
router.get("/connect", (req, res) => {
  try {
    const oauth2Client = getOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly"
      ]
    });

    res.redirect(url);
  } catch (err) {
    console.error("YouTube OAuth error:", err);
    res.status(500).send("Google OAuth is not configured yet.");
  }
});

// Google يرجع المستخدم لهنا بعد الموافقة
router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Missing authorization code.");
    }

    const oauth2Client = getOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    console.log("YouTube OAuth tokens received:", {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date || null
    });

    // مؤقتاً: نعرض نجاح العملية فقط.
    // لاحقاً سنربط refresh_token بحساب UltraAI.
    res.send(`
      <h2>YouTube connected successfully ✅</h2>
      <p>You can close this page and return to UltraAI.</p>
    `);
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    res.status(500).send("YouTube authorization failed.");
  }
});

module.exports = router;
