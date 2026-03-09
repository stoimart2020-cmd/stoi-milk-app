const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

        // Check User (Customer) first
        let user = await User.findById(decoded.id);

        // If not found, check Employee
        if (!user) {
            const Employee = require("../models/Employee");
            user = await Employee.findById(decoded.id);
        }

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Not authorized" });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Always allow SUPERADMIN
        if (req.user.role === 'SUPERADMIN') {
            return next();
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`,
            });
        }
        next();
    };
};

// Admin only middleware (SUPERADMIN or ADMIN)
exports.adminOnly = (req, res, next) => {
    if (req.user.role === 'SUPERADMIN' || req.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Admin access required'
    });
};
