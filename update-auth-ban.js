const fs = require("fs");

const file = "server/auth.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("function isUserBanned")) {
    console.log("⚠️ Ban check already exists");
    process.exit(0);
}

const start = s.indexOf("function verifyToken(token)");

if (start === -1) {
    console.log("❌ verifyToken not found");
    process.exit(1);
}

const end = s.indexOf(
    "\nmodule.exports",
    start
);

if (end === -1) {
    console.log("❌ module.exports not found");
    process.exit(1);
}

const newCode = `function isUserBanned(userId) {

    try {

        const db = require("./database");

        const users = db.loadUsers();

        const user = users.find(
            u => String(u.id) === String(userId)
        );

        return !!(
            user &&
            user.banned === true
        );

    } catch (error) {

        console.error(
            "BAN CHECK ERROR:",
            error.message
        );

        return false;
    }
}


function verifyToken(token) {

    try {

        const decoded =
            jwt.verify(token, SECRET);

        if (isUserBanned(decoded.id)) {

            console.log(
                "🚫 BLOCKED USER:",
                decoded.id
            );

            return null;
        }

        return decoded;

    } catch (e) {

        console.log(
            "JWT ERROR:",
            e.message
        );

        return null;
    }
}
`;

s =
    s.slice(0, start) +
    newCode +
    s.slice(end);

fs.writeFileSync(
    file,
    s,
    "utf8"
);

console.log(
    "✅ Global ban check added to auth.js"
);
