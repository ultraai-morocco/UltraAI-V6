const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(
  __dirname,
  "data",
  "youtube-auto.json"
);

let kvPromise = null;

function isDenoKVAvailable() {
  return (
    typeof Deno !== "undefined" &&
    typeof Deno.openKv === "function"
  );
}

async function getKV() {
  if (!isDenoKVAvailable()) {
    throw new Error("Deno KV is not available");
  }

  if (!kvPromise) {
    kvPromise = Deno.openKv();
  }

  return await kvPromise;
}

function scheduleKey(userId) {
  return [
    "ultraai",
    "youtube-auto",
    "schedule",
    String(userId)
  ];
}

/* =========================================
   JSON FALLBACK - TERMUX / NODE
========================================= */

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};

    const raw =
      fs.readFileSync(DATA_FILE, "utf8") || "{}";

    const data = JSON.parse(raw);

    return (
      data &&
      typeof data === "object" &&
      !Array.isArray(data)
    )
      ? data
      : {};
  } catch (error) {
    console.error(
      "YOUTUBE AUTO DATA LOAD ERROR:",
      error
    );

    return {};
  }
}

function saveData(data) {
  fs.mkdirSync(
    path.dirname(DATA_FILE),
    { recursive: true }
  );

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

/* =========================================
   GET USER SCHEDULE
========================================= */

async function getUserSchedule(userId) {

  if (isDenoKVAvailable()) {

    const kv = await getKV();

    const result =
      await kv.get(
        scheduleKey(userId)
      );

    return result.value || null;
  }

  const data = loadData();

  return (
    data[String(userId)] || null
  );
}

/* =========================================
   SAVE USER SCHEDULE
========================================= */

async function saveUserSchedule(
  userId,
  schedule
) {

  const clean = {
    ...(schedule || {}),
    userId: String(userId),
    updatedAt:
      new Date().toISOString()
  };

  if (isDenoKVAvailable()) {

    const kv = await getKV();

    await kv.set(
      scheduleKey(userId),
      clean
    );

    return clean;
  }

  const data = loadData();

  data[String(userId)] = clean;

  saveData(data);

  return clean;
}

/* =========================================
   DELETE USER SCHEDULE
========================================= */

async function deleteUserSchedule(userId) {

  if (isDenoKVAvailable()) {

    const kv = await getKV();

    await kv.delete(
      scheduleKey(userId)
    );

    return;
  }

  const data = loadData();

  delete data[String(userId)];

  saveData(data);
}

/* =========================================
   GET ALL SCHEDULES
========================================= */

async function getAllSchedules() {

  if (isDenoKVAvailable()) {

    const kv = await getKV();

    const schedules = [];

    for await (
      const entry of kv.list({
        prefix: [
          "ultraai",
          "youtube-auto",
          "schedule"
        ]
      })
    ) {
      if (entry.value) {
        schedules.push(entry.value);
      }
    }

    return schedules;
  }

  const data = loadData();

  return Object.entries(data).map(
    ([userId, schedule]) => ({
      ...schedule,
      userId: String(
        schedule.userId || userId
      )
    })
  );
}

module.exports = {
  getKV,
  isDenoKVAvailable,
  loadData,
  saveData,
  getUserSchedule,
  saveUserSchedule,
  deleteUserSchedule,
  getAllSchedules
};
