const fs = require("fs");
const path = require("path");

let kvPromise = null;

/* =================================================
   ULTRAAI USERS STORAGE
   Deno Deploy  -> Deno KV
   Termux/Node -> users.json
================================================= */

const USERS_FILE = path.join(
    __dirname,
    "data",
    "users.json"
);

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


/* =================================================
   JSON FALLBACK - TERMUX / NODE
================================================= */

function ensureUsersFile() {

    const dir = path.dirname(USERS_FILE);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(
            USERS_FILE,
            "[]",
            "utf8"
        );
    }
}


function readUsers() {

    ensureUsersFile();

    try {

        const raw =
            fs.readFileSync(
                USERS_FILE,
                "utf8"
            ) || "[]";

        const users =
            JSON.parse(raw);

        return Array.isArray(users)
            ? users
            : [];

    } catch (error) {

        console.error(
            "USERS JSON READ ERROR:",
            error
        );

        return [];
    }
}


function writeUsers(users) {

    ensureUsersFile();

    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(
            users,
            null,
            2
        ),
        "utf8"
    );
}


/* =================================================
   CLEAN HELPERS
================================================= */

function cleanEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();
}



function cleanUsername(username) {
    return String(username || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function usernameKey(username) {
    return [
        "ultraai",
        "users",
        "by-username",
        cleanUsername(username)
    ];
}

function cleanPhone(phone) {

    return String(phone || "")
        .trim();
}


function emailKey(email) {

    return [
        "ultraai",
        "users",
        "by-email",
        cleanEmail(email)
    ];
}


function idKey(id) {

    return [
        "ultraai",
        "users",
        "by-id",
        String(id)
    ];
}


function phoneKey(phone) {

    return [
        "ultraai",
        "users",
        "by-phone",
        cleanPhone(phone)
    ];
}


/* =================================================
   SAFE USER
================================================= */

function safeUser(user) {

    const copy = {
        ...user
    };

    /*
     * Deno KV limit
     */
    if (
        copy.avatar &&
        typeof Buffer !== "undefined" &&
        Buffer.byteLength(
            String(copy.avatar),
            "utf8"
        ) > 60000
    ) {

        copy.avatar = "";
    }

    return copy;
}


/* =================================================
   FIND BY EMAIL
================================================= */

async function findUserByEmail(email) {

    const clean = cleanEmail(email);

    if (isDenoKVAvailable()) {

        const kv =
            await getKV();

        const result =
            await kv.get(
                emailKey(clean)
            );

        /*
         * الحساب موجود في Deno KV
         */
        if (result.value) {
            return result.value;
        }

        /*
         * MIGRATION:
         * إذا لم يكن الحساب موجوداً في Deno KV،
         * نبحث عنه في users.json المحلي/المرفوع مع التطبيق.
         *
         * ثم نستعمل saveUser() حتى يتم إنشاء:
         * by-id
         * by-email
         * by-username
         * by-phone
         */
        const users = readUsers();

        const user = users.find(
            user =>
                cleanEmail(user.email) === clean
        );

        if (user) {
            console.log(
                "🔄 Migrating user to Deno KV:",
                user.username
            );

            return await saveUser(user);
        }

        return null;
    }

    /* NODE / TERMUX */

    const users =
        readUsers();

    return (
        users.find(
            user =>
                cleanEmail(user.email) === clean
        ) || null
    );
}


/* =================================================
   FIND BY ID
================================================= */


async function findUserByUsername(username) {

    const clean = cleanUsername(username);

    if (!clean) {
        return null;
    }

    if (isDenoKVAvailable()) {

        const kv = await getKV();

        const result = await kv.get(
            usernameKey(clean)
        );

        return result.value || null;
    }

    const users = readUsers();

    return (
        users.find(
            user =>
                cleanUsername(user.username) === clean
        ) || null
    );
}

async function findUserById(id) {

    const targetId =
        String(id);

    if (isDenoKVAvailable()) {

        const kv =
            await getKV();

        const result =
            await kv.get(
                idKey(targetId)
            );

        return result.value || null;
    }

    /* NODE / TERMUX */

    const users =
        readUsers();

    return (
        users.find(
            user =>
                String(user.id) === targetId
        ) || null
    );
}


/* =================================================
   FIND BY PHONE
================================================= */

async function findUserByPhone(phone) {

    const clean =
        cleanPhone(phone);

    if (!clean) {
        return null;
    }

    if (isDenoKVAvailable()) {

        const kv =
            await getKV();

        const result =
            await kv.get(
                phoneKey(clean)
            );

        return result.value || null;
    }

    /* NODE / TERMUX */

    const users =
        readUsers();

    return (
        users.find(
            user =>
                cleanPhone(user.phone) === clean
        ) || null
    );
}


/* =================================================
   SAVE USER
================================================= */

async function saveUser(user) {

    const cleanEmailValue = cleanEmail(user.email);
    const cleanPhoneValue = cleanPhone(user.phone);
    const cleanUsernameValue = cleanUsername(user.username);

    if (!cleanUsernameValue) {
        throw new Error("USERNAME_REQUIRED");
    }

    const safe = safeUser({
        ...user,
        username: String(user.username || "").trim(),
        email: cleanEmailValue,
        phone: cleanPhoneValue
    });

    /* ===============================
       DENO KV
    =============================== */

    if (isDenoKVAvailable()) {

        const kv = await getKV();

        const current =
            await kv.get(idKey(safe.id));

        const usernameResult =
            await kv.get(
                usernameKey(cleanUsernameValue)
            );

        if (
            usernameResult.value &&
            String(usernameResult.value.id) !==
            String(safe.id)
        ) {
            throw new Error("USERNAME_TAKEN");
        }

        /*
         * حذف username القديم إذا تبدل
         */
        if (
            current.value &&
            current.value.username &&
            cleanUsername(current.value.username) !==
            cleanUsernameValue
        ) {
            await kv.delete(
                usernameKey(current.value.username)
            );
        }

        await kv.set(
            idKey(safe.id),
            safe
        );

        await kv.set(
            emailKey(cleanEmailValue),
            safe
        );

        await kv.set(
            usernameKey(cleanUsernameValue),
            safe
        );

        if (cleanPhoneValue) {

            await kv.set(
                phoneKey(cleanPhoneValue),
                safe
            );
        }

        return safe;
    }

    /* ===============================
       NODE / TERMUX
    =============================== */

    const users = readUsers();

    const usernameOwner = users.find(
        existing =>
            cleanUsername(existing.username) ===
            cleanUsernameValue &&
            String(existing.id) !==
            String(safe.id)
    );

    if (usernameOwner) {
        throw new Error("USERNAME_TAKEN");
    }

    const index = users.findIndex(
        existing =>
            String(existing.id) ===
            String(safe.id)
    );

    if (index >= 0) {
        users[index] = safe;
    } else {
        users.push(safe);
    }

    writeUsers(users);

    return safe;
}

/* =================================================
   UPDATE USER
================================================= */

async function updateUser(user) {

    return await saveUser(user);
}


/* =================================================
   UPDATE YOUTUBE CONNECTION
   يحافظ على بيانات المستخدم الأخرى
================================================= */

async function updateYouTube(userId, youtubeData) {

    const user = await findUserById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    user.youtube = {
        ...(user.youtube || {}),
        ...youtubeData
    };

    return await saveUser(user);
}


/* =================================================
   DELETE USER
================================================= */

async function deleteUser(user) {

    if (isDenoKVAvailable()) {

        const kv =
            await getKV();

        const email =
            cleanEmail(user.email);

        const phone =
            cleanPhone(user.phone);

        await kv.delete(
            idKey(user.id)
        );

        await kv.delete(
            emailKey(email)
        );

        if (phone) {

            await kv.delete(
                phoneKey(phone)
            );
        }

        return true;
    }


    /* NODE / TERMUX */

    const users =
        readUsers();

    const targetId =
        String(user.id);

    const filtered =
        users.filter(
            existing =>
                String(existing.id) !==
                targetId
        );

    writeUsers(filtered);

    return true;
}


/* =================================================
   GET ALL USERS
================================================= */

async function getAllUsers() {

    if (isDenoKVAvailable()) {

        const kv =
            await getKV();

        const users = [];

        const entries =
            kv.list({
                prefix: [
                    "ultraai",
                    "users",
                    "by-id"
                ]
            });

        for await (
            const entry of entries
        ) {

            if (entry.value) {
                users.push(entry.value);
            }
        }

        return users;
    }


    /* NODE / TERMUX */

    return readUsers();
}


/* =================================================
   EXPORT
================================================= */

module.exports = {

    getKV,

    findUserByEmail,
    findUserByUsername,

    findUserById,

    findUserByPhone,

    saveUser,

    updateUser,
    updateYouTube,

    deleteUser,

    getAllUsers
};
