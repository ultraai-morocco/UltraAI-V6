const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");

const SECRET="UltraAI_SECRET_KEY";

function hashPassword(password){
return bcrypt.hashSync(password,10);
}

function checkPassword(password,hash){
return bcrypt.compareSync(password,hash);
}

function createToken(user){

return jwt.sign({

id:user.id,
username:user.username,
email:user.email

},SECRET,{expiresIn:"30d"});

}

function isUserBanned(userId) {

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

module.exports={

hashPassword,
checkPassword,
createToken,
verifyToken

};
