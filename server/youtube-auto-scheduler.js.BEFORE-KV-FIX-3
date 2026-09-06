const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(
  __dirname,
  "data",
  "youtube-auto.json"
);

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};

    const raw = fs.readFileSync(DATA_FILE, "utf8") || "{}";
    const data = JSON.parse(raw);

    return data && typeof data === "object" ? data : {};
  } catch (error) {
    console.error("YOUTUBE AUTO DATA LOAD ERROR:", error);
    return {};
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), {
    recursive: true
  });

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function getUserSchedule(userId) {
  const data = loadData();
  return data[String(userId)] || null;
}

function saveUserSchedule(userId, schedule) {
  const data = loadData();

  data[String(userId)] = {
    ...(data[String(userId)] || {}),
    ...schedule,
    updatedAt: new Date().toISOString()
  };

  saveData(data);

  return data[String(userId)];
}

function deleteUserSchedule(userId) {
  const data = loadData();
  delete data[String(userId)];
  saveData(data);
}

module.exports = {
  loadData,
  saveData,
  getUserSchedule,
  saveUserSchedule,
  deleteUserSchedule
};
