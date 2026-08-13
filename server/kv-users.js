let kvPromise = null;

async function getKV() {
    if (
        typeof Deno === "undefined" ||
        typeof Deno.openKv !== "function"
    ) {
        throw new Error("Deno KV is not available");
    }

    if (!kvPromise) {
        kvPromise = Deno.openKv();
    }

    return await kvPromise;
}

function cleanEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function emailKey(email) {
    return ["ultraai", "users", "by-email", cleanEmail(email)];
}

function idKey(id) {
    return ["ultraai", "users", "by-id", String(id)];
}

function phoneKey(phone) {
    return ["ultraai", "users", "by-phone", String(phone || "").trim()];
}

function safeUser(user) {
    const copy = { ...user };

    /*
     * Deno KV has a 64 KiB value limit.
     * Large base64 avatars are therefore rejected rather than
     * breaking the whole account record.
     */
    if (
        copy.avatar &&
        Buffer.byteLength(String(copy.avatar), "utf8") > 60000
    ) {
        copy.avatar = "";
    }

    return copy;
}

async function findUserByEmail(email) {
    const kv = await getKV();

    const result = await kv.get(emailKey(email));

    return result.value || null;
}

async function findUserById(id) {
    const kv = await getKV();

    const result = await kv.get(idKey(id));

    return result.value || null;
}

async function findUserByPhone(phone) {
    const cleanPhone = String(phone || "").trim();

    if (!cleanPhone) return null;

    const kv = await getKV();

    const result = await kv.get(phoneKey(cleanPhone));

    return result.value || null;
}

async function saveUser(user) {
    const kv = await getKV();

    const cleanEmail = cleanEmailValue(user.email);
    const cleanPhone = String(user.phone || "").trim();

    const safe = safeUser({
        ...user,
        email: cleanEmail,
        phone: cleanPhone
    });

    /*
     * Save the same account under multiple global indexes.
     */
    await kv.set(idKey(safe.id), safe);
    await kv.set(emailKey(cleanEmail), safe);

    if (cleanPhone) {
        await kv.set(phoneKey(cleanPhone), safe);
    }

    return safe;
}

function cleanEmailValue(email) {
    return String(email || "").trim().toLowerCase();
}

async function updateUser(user) {
    return await saveUser(user);
}

async function deleteUser(user) {
    const kv = await getKV();

    const email = cleanEmail(user.email);
    const phone = String(user.phone || "").trim();

    await kv.delete(idKey(user.id));
    await kv.delete(emailKey(email));

    if (phone) {
        await kv.delete(phoneKey(phone));
    }

    return true;
}

async function getAllUsers() {
    const kv = await getKV();

    const users = [];

    const entries = kv.list({
        prefix: ["ultraai", "users", "by-id"]
    });

    for await (const entry of entries) {
        if (entry.value) {
            users.push(entry.value);
        }
    }

    return users;
}

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
