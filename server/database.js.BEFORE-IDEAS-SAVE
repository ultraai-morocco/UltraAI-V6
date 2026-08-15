const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

function file(name) {
  return path.join(DATA_DIR, name);
}

function read(name, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file(name), "utf8"));
  } catch {
    return fallback;
  }
}

function write(name, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(
    file(name),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

module.exports = {

  loadUsers() {
    return read("users.json");
  },

  saveUsers(data) {
    write("users.json", data);
  },

  loadChats() {
    return read("chats.json");
  },

  saveChats(data) {
    write("chats.json", data);
  },

  loadConversations() {
    return read("conversations.json");
  },

  saveConversations(data) {
    write("conversations.json", data);
  },

  loadSettings() {
    return read("settings.json", {});
  },

  saveSettings(data) {
    write("settings.json", data);
  }

};
