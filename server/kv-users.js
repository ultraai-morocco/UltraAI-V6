const db = require("./database");

let kvPromise = null;

async function getKV() {
    if (
        typeof Deno === "undefined" ||
        typeof Deno.openKv !== "function"
    ) {
        return null;
    }

    if (!kvPromise) {
        kvPromise = Deno.openKv();
    }

    return await kvPromise;
}

async function findUserByEmail(email) {
    const cleanEmail =
        String(email || "").trim().toLowerCase();

    const kv = await getKV();

    if (kv) {
        const result = await kv.get([
            "ultraai",
            "users",
            "by-email",
            cleanEmail
        ]);

        if (result.value) {
            return result.value;
        }

        /*
         * Migration / fallback:
         * إذا كان الحساب موجوداً في users.json
         * ننسخه تلقائياً إلى Deno KV.
         */
        const users = db.loadUsers();

        const user = users.find(
            u =>
                String(u.email || "")
                    .trim()
                    .toLowerCase() === cleanEmail
        );

        if (user) {
            await kv.set(
                ["ultraai", "users", "by-email", cleanEmail],
                user
            );

            return user;
        }

        return null;
    }

    const users = db.loadUsers();

    return users.find(
        u =>
            String(u.email || "")
                .trim()
                .toLowerCase() === cleanEmail
    ) || null;
}

async function saveUser(user) {
    const cleanEmail =
        String(user.email || "").trim().toLowerCase();

    const kv = await getKV();

    if (kv) {
        await kv.set(
            ["ultraai", "users", "by-email", cleanEmail],
            user
        );

        return user;
    }

    const users = db.loadUsers();

    const index = users.findIndex(
        u =>
            String(u.email || "")
                .trim()
                .toLowerCase() === cleanEmail
    );

    if (index >= 0) {
        users[index] = user;
    } else {
        users.push(user);
    }

    db.saveUsers(users);

    return user;
}

module.exports = {
    getKV,
    findUserByEmail,
    saveUser
};
