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
    return String(email || "")
        .trim()
        .toLowerCase();
}

function emailKey(email) {
    return [
        "ultraai",
        "users",
        "by-email",
        cleanEmail(email)
    ];
}

async function findUserByEmail(email) {

    const clean = cleanEmail(email);

    if (!clean) {
        return null;
    }

    const kv = await getKV();

    const result = await kv.get(
        emailKey(clean)
    );

    return result.value || null;
}

async function saveUser(user) {

    if (!user || !user.email) {
        throw new Error("User email is required");
    }

    const email = cleanEmail(user.email);

    const kv = await getKV();

    await kv.set(
        emailKey(email),
        {
            ...user,
            email
        }
    );

    return user;
}

async function deleteUserByEmail(email) {

    const kv = await getKV();

    await kv.delete(
        emailKey(email)
    );
}

module.exports = {
    getKV,
    findUserByEmail,
    saveUser,
    deleteUserByEmail
};
