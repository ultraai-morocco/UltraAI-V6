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

        const kvUsers = require("./kv-users");

        const user =
            await kvUsers.findUserById(decoded.id);

        if (!user) {
            return null;
        }

        if (user.banned === true) {
            return null;
        }

        return user;

    } catch (error) {
        console.log(
            "JWT ERROR:",
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
