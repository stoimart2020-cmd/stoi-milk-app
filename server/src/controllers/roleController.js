const Role = require("../models/Role");

exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, result: roles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        res.status(200).json({ success: true, result: role });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const existing = await Role.findOne({ name });
        if (existing) return res.status(400).json({ success: false, message: "Role already exists" });

        const role = await Role.create({ name, permissions });
        res.status(201).json({ success: true, message: "Role created", result: role });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { permissions } = req.body;
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });

        if (role.name === "SUPERADMIN") {
            // Ensure SUPERADMIN always has full access, preventing accidental lockout
            // But we might allow editing some things. For now, let's just update permissions.
        }

        role.permissions = permissions;
        await role.save();

        res.status(200).json({ success: true, message: "Role updated", result: role });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        if (role.isSystem) return res.status(400).json({ success: false, message: "Cannot delete system role" });

        await role.deleteOne();
        res.status(200).json({ success: true, message: "Role deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
