const auth = require("../auth");

module.exports = function (req, res, next) {

    const token =
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "❌ يجب تسجيل الدخول."
        });
    }

    const user = auth.verifyToken(token);

    if (!user) {
        return res.status(403).json({
            success: false,
            message: "🚫 هذا الحساب محظور أو الجلسة غير صالحة."
        });
    }

    req.user = user;

    next();
};
