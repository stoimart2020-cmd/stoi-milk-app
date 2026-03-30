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

/**
 * Granular Permission Middleware
 * @param {string} module - e.g., 'customers', 'orders', 'payments'
 * @param {string} action - 'view', 'add', 'edit', 'delete', 'export'
 */
exports.checkPermission = (module, action = 'view') => {
    return async (req, res, next) => {
        const user = req.user;

        // 1. Always allow SUPERADMIN
        if (user.role === 'SUPERADMIN') return next();

        // 2. Allow FIELD_MARKETING / FIELD_OFFICER / RIDER for modules they need
        if (user.role === 'FIELD_MARKETING' || user.role === 'FIELD_OFFICER' || user.role === 'RIDER') {
            const allowedModules = ['customers', 'payments', 'subscriptions', 'products', 'settings'];
            if (allowedModules.includes(module)) return next();
        }

        // 3. Not an Admin/Staff? Block.
        if (user.role === 'CUSTOMER' || user.role === 'USER') {
            return res.status(403).json({ success: false, message: "Customer access denied to admin module" });
        }

        // 3. Populate Role if missing
        if (!user.customRole && user.role !== 'SUPERADMIN') {
            const Employee = require("../models/Employee");
            const populatedUser = await Employee.findById(user._id).populate('role');
            if (populatedUser && populatedUser.role) {
                user.customRole = populatedUser.role;
            }
        }

        // 4. Handle Legacy Roles (Old way: if no custom role, allow if ADMIN)
        if (!user.customRole) {
            if (user.role === 'ADMIN') return next();
            return res.status(403).json({ success: false, message: "Permission denied: No assigned role." });
        }

        const permissions = user.customRole.permissions || {};

        // 5. Check Dashboard (simple boolean)
        if (module === 'dashboard') {
            if (permissions.dashboard === true) return next();
            return res.status(403).json({ success: false, message: "Dashboard access denied" });
        }

        // 6. Check Granular Module Permissions
        const modulePerms = permissions[module];

        // If simple boolean in DB
        if (typeof modulePerms === 'boolean') {
            if (modulePerms) return next();
        } 
        // If object { view: true, edit: false, ... }
        else if (modulePerms && modulePerms[action] === true) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Permission denied: ${action} access to ${module} required.`
        });
    };
};
