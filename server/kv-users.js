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

        return result.value || null;
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

    const cleanEmailValue =
        cleanEmail(user.email);

    const cleanPhoneValue =
        cleanPhone(user.phone);

    const safe =
        safeUser({
            ...user,
            email: cleanEmailValue,
            phone: cleanPhoneValue
        });


    /* ===============================
       DENO KV
    =============================== */

    if (isDenoKVAvailable()) {

        const kv =
            await getKV();

        await kv.set(
            idKey(safe.id),
            safe
        );

        await kv.set(
            emailKey(cleanEmailValue),
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

    const users =
        readUsers();

    const index =
        users.findIndex(
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

    findUserById,

    findUserByPhone,

    saveUser,

    updateUser,

    deleteUser,

    getAllUsers
};
