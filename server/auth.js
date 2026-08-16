const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.ULTRAAI_JWT_SECRET;

if (!SECRET) {
    throw new Error(
        "ULTRAAI_JWT_SECRET is required. Set it in server/.env before starting UltraAI."
    );
}

if (SECRET.length < 32) {
    throw new Error(
        "ULTRAAI_JWT_SECRET must be at least 32 characters long."
    );
}

function hashPassword(password) {
    return bcrypt.hashSync(String(password), 12);
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

        try {
            const kvUsers = require("./kv-users");
            const user = await kvUsers.findUserById(decoded.id);

            if (user) {
                return user.banned === true ? null : user;
            }
        } catch (kvError) {
            console.log(
                "KV unavailable, using users.json fallback:",
                kvError.message
            );
        }

        const fs = require("fs");
        const path = require("path");

        const usersFile = path.join(
            __dirname,
            "data",
            "users.json"
        );

        if (!fs.existsSync(usersFile)) {
            return null;
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, "utf8")
        );

        if (!Array.isArray(users)) {
            return null;
        }

        const user = users.find(
            u => String(u.id) === String(decoded.id)
        );

        if (!user || user.banned === true) {
            return null;
        }

        return user;

    } catch (error) {
        console.log("JWT / USER ERROR:", error.message);
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
        const user = await kvUsers.findUserById(userId);

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
