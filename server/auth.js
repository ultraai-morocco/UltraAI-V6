const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET =
    process.env.ULTRAAI_JWT_SECRET ||
    "UltraAI_SECRET_KEY";

function hashPassword(password) {
    return bcrypt.hashSync(String(password), 10);
}

function checkPassword(password, hash) {
    return bcrypt.compareSync(String(password), String(hash));
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email
        },
        SECRET,
        {
            expiresIn: "30d"
        }
    );
}

async function getUserFromToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET);

        /*
         * Deno Deploy:
         * نستعمل Deno KV.
         *
         * Termux / Node:
         * إذا KV غير متوفر، نستعمل users.json
         * حتى تبقى لوحة الإدارة خدامة أثناء التجربة المحلية.
         */

        try {
            const kvUsers = require("./kv-users");
            const user = await kvUsers.findUserById(decoded.id);

            if (user) {
                if (user.banned === true) {
                    return null;
                }

                return user;
            }
        } catch (kvError) {
            console.log(
                "⚠️ KV unavailable, using users.json fallback:",
                kvError.message
            );
        }

        /*
         * Fallback لـ Termux / Node
         */
        const fs = require("fs");
        const path = require("path");

        const usersFile = path.join(
            __dirname,
            "data",
            "users.json"
        );

        if (!fs.existsSync(usersFile)) {
            console.log(
                "❌ users.json not found:",
                usersFile
            );
            return null;
        }

        const raw = fs.readFileSync(
            usersFile,
            "utf8"
        );

        const users = JSON.parse(raw);

        if (!Array.isArray(users)) {
            return null;
        }

        const user = users.find(
            u => String(u.id) === String(decoded.id)
        );

        if (!user) {
            return null;
        }

        if (user.banned === true) {
            return null;
        }

        return user;

    } catch (error) {
        console.log(
            "JWT / USER ERROR:",
            error.message
        );

        return null;
    }
}

function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET);
    } catch {
        return null;
    }
}

async function isUserBanned(userId) {
    try {
        const kvUsers = require("./kv-users");

        const user =
            await kvUsers.findUserById(userId);

        return !!(
            user &&
            user.banned === true
        );

    } catch {
        return false;
    }
}

module.exports = {
    hashPassword,
    checkPassword,
    createToken,
    verifyToken,
    getUserFromToken,
    isUserBanned
};
