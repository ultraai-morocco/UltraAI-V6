const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const {
  loadData,
  saveData,
  getUserSchedule,
  getAllSchedules
} = require("./youtube-auto-scheduler");

const {
  findUserById
} = require("./kv-users");

const USERS_FILE = path.join(
  __dirname,
  "data",
  "users.json"
);

const AUTO_CONTENT_FILE = path.join(
  __dirname,
  "data",
  "auto-content.json"
);

const videoGenerator =
  require("./routes/video-generate");

const youtubeOAuth =
  require("./routes/youtube-oauth");

/*
 * منع تشغيل أكثر من عملية نشر في نفس الوقت
 */
const runningUsers = new Set();

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;

    const raw =
      fs.readFileSync(file, "utf8") || "";

    return JSON.parse(raw);
  } catch (error) {
    console.error(
      "YOUTUBE AUTO JSON LOAD ERROR:",
      file,
      error
    );

    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

async function getUser(userId) {

  /*
   * Deno Deploy -> Deno KV
   */
  try {

    const user =
      await findUserById(userId);

    if (user) {
      return user;
    }

  } catch (error) {

    console.error(
      "YOUTUBE AUTO KV USER ERROR:",
      error.message
    );

  }

  /*
   * Termux / Node fallback
   */
  const users =
    loadJson(USERS_FILE, []);

  if (!Array.isArray(users)) {
    return null;
  }

  return (
    users.find(
      user =>
        String(user.id) ===
        String(userId)
    ) || null
  );
}

/*
 * الوقت الحالي بصيغة HH:MM
 */
function currentTime() {
  const now = new Date();

  const h =
    String(now.getHours()).padStart(2, "0");

  const m =
    String(now.getMinutes()).padStart(2, "0");

  return `${h}:${m}`;
}

function todayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

/*
 * هل سبق نشر هذا الموعد اليوم؟
 */
function alreadyPublished(schedule, slot) {
  const key =
    `${todayKey()}-${slot}`;

  return (
    Array.isArray(schedule.publishedSlots) &&
    schedule.publishedSlots.includes(key)
  );
}

async function markPublished(
  userId,
  slot,
  videoId,
  url
) {
  const schedule =
    await getUserSchedule(userId) || {};

  const key =
    `${todayKey()}-${slot}`;

  const slots =
    Array.isArray(schedule.publishedSlots)
      ? schedule.publishedSlots
      : [];

  if (!slots.includes(key)) {
    slots.push(key);
  }

  /*
   * نخلي غير آخر 60 عملية محفوظة
   */
  const trimmed =
    slots.slice(-60);

  await saveUserSchedule(
    userId,
    {
      ...schedule,
      publishedSlots: trimmed,
      lastPublishedAt:
        new Date().toISOString(),
      lastPublishedSlot: slot,
      lastVideoId: videoId || null,
      lastVideoUrl: url || null
    }
  );
}

/*
 * البحث عن محتوى اليوم
 */
function getLatestContent(userId) {
  const data =
    loadJson(
      AUTO_CONTENT_FILE,
      []
    );

  if (!Array.isArray(data)) {
    return null;
  }

  const userItems =
    data.filter(
      item =>
        String(item.userId) ===
        String(userId)
    );

  if (!userItems.length) {
    return null;
  }

  return userItems
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    )[0];
}

/*
 * توليد فيديو إذا لم يكن موجوداً
 */
async function ensureVideo(
  item,
  slot
) {
  const post = item[slot];

  if (!post || !post.image) {
    throw new Error(
      `صورة ${slot} غير موجودة.`
    );
  }

  if (
    post.video &&
    String(post.video).trim()
  ) {
    return post.video;
  }

  const imagePath =
    path.join(
      __dirname,
      "..",
      "public",
      post.image.replace(/^\/+/, "")
    );

  if (!fs.existsSync(imagePath)) {
    throw new Error(
      "ملف الصورة غير موجود."
    );
  }

  console.log(
    `🎬 AUTO YOUTUBE VIDEO: ${slot}`
  );

  const videoUrl =
    await videoGenerator.generateVideo(
      imagePath,
      post.script ||
      post.hook ||
      "smooth cinematic motion, natural movement, realistic camera movement"
    );

  const filename =
    `auto-video-${crypto.randomUUID()}.mp4`;

  const outputPath =
    path.join(
      __dirname,
      "..",
      "public",
      "generated-videos",
      filename
    );

  fs.mkdirSync(
    path.dirname(outputPath),
    {
      recursive: true
    }
  );

  await execFileAsync("curl", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    videoUrl,
    "-o",
    outputPath
  ]);

  if (
    !fs.existsSync(outputPath) ||
    fs.statSync(outputPath).size === 0
  ) {
    throw new Error(
      "فشل حفظ الفيديو."
    );
  }

  const publicVideo =
    `/generated-videos/${filename}`;

  /*
   * حفظ الفيديو داخل Auto Content
   */
  const data =
    loadJson(
      AUTO_CONTENT_FILE,
      []
    );

  const index =
    data.findIndex(
      entry =>
        String(entry.id) ===
        String(item.id)
    );

  if (index !== -1) {
    data[index][slot].video =
      publicVideo;

    saveJson(
      AUTO_CONTENT_FILE,
      data
    );
  }

  return publicVideo;
}

/*
 * رفع الفيديو إلى YouTube
 *
 * نستعمل نفس Google OAuth الموجود
 * في youtube-oauth.js
 */
async function uploadToYouTube(
  userId,
  videoPath,
  post,
  privacyStatus
) {
  const user = await getUser(userId);

  if (!user) {
    throw new Error(
      "المستخدم غير موجود."
    );
  }

  const youtube =
    user.youtube || {};

  if (
    youtube.connected !== true ||
    !youtube.refreshToken
  ) {
    throw new Error(
      "يجب ربط قناة YouTube أولاً."
    );
  }

  /*
   * نستعمل الدوال الداخلية الموجودة
   * في youtube-oauth.js إذا كانت متاحة.
   *
   * في حال عدم توفرها، نوقف العملية
   * بدون نشر ناقص.
   */
  if (
    typeof youtubeOAuth.uploadGeneratedVideo !==
    "function"
  ) {
    throw new Error(
      "دالة رفع YouTube غير متاحة للتشغيل الداخلي."
    );
  }

  return youtubeOAuth.uploadGeneratedVideo({
    user,
    videoPath,
    title:
      post.title ||
      "UltraAI",
    description:
      post.description ||
      post.caption ||
      "",
    privacyStatus:
      privacyStatus || "private"
  });
}

/*
 * تشغيل موعد واحد
 */
async function runSlot(
  userId,
  slot
) {
  const schedule =
    await getUserSchedule(userId);

  if (
    !schedule ||
    schedule.enabled !== true
  ) {
    return;
  }

  if (
    alreadyPublished(
      schedule,
      slot
    )
  ) {
    return;
  }

  if (
    runningUsers.has(
      String(userId)
    )
  ) {
    console.log(
      "⏳ USER ALREADY RUNNING:",
      userId
    );

    return;
  }

  runningUsers.add(
    String(userId)
  );

  try {

    console.log(
      "🚀 AUTO YOUTUBE START:",
      userId,
      slot
    );

    const item =
      getLatestContent(userId);

    if (!item) {
      throw new Error(
        "لا يوجد محتوى Auto Content لهذا المستخدم."
      );
    }

    const post =
      item[slot];

    if (!post) {
      throw new Error(
        `محتوى ${slot} غير موجود.`
      );
    }

    const videoPath =
      await ensureVideo(
        item,
        slot
      );

    /*
     * مهم:
     * النشر الحقيقي سيتم ربطه مباشرة
     * بـ YouTube OAuth في الخطوة التالية.
     */
    const result =
      await uploadToYouTube(
        userId,
        videoPath,
        post,
        schedule.privacyStatus
      );

    await markPublished(
      userId,
      slot,
      result?.videoId,
      result?.url
    );

    console.log(
      "✅ AUTO YOUTUBE DONE:",
      userId,
      slot,
      result?.videoId
    );

  } catch (error) {

    console.error(
      "❌ AUTO YOUTUBE ERROR:",
      userId,
      slot,
      error.message
    );

  } finally {

    runningUsers.delete(
      String(userId)
    );
  }
}

/*
 * فحص كل المستخدمين
 */
async function tick() {
  try {

    const schedules =
      await getAllSchedules();

    const time =
      currentTime();

    for (
      const schedule of
      schedules
    ) {

      if (!schedule) {
        continue;
      }

      const userId =
        schedule.userId;

      if (!userId) {
        continue;
      }

      if (
        !schedule ||
        schedule.enabled !== true
      ) {
        continue;
      }

      if (
        schedule.morningTime === time
      ) {
        await runSlot(
          userId,
          "morning"
        );
      }

      if (
        schedule.eveningTime === time
      ) {
        await runSlot(
          userId,
          "evening"
        );
      }
    }

  } catch (error) {

    console.error(
      "YOUTUBE AUTO TICK ERROR:",
      error
    );

  }
}

let started = false;

function start() {

  if (started) return;

  started = true;

  console.log(
    "🤖 YouTube Auto Scheduler started"
  );

  /*
   * كل دقيقة
   */
  setInterval(
    tick,
    60 * 1000
  );

  /*
   * فحص أولي بعد 3 ثواني
   */
  setTimeout(
    tick,
    3000
  );
}

module.exports = {
  start,
  tick,
  runSlot
};
