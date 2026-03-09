const Area = require("../models/Area");

exports.createArea = async (req, res) => {
    try {
        const area = await Area.create(req.body);
        res.status(201).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllAreas = async (req, res) => {
    try {
        const areas = await Area.find().populate({
            path: "hub",
            populate: { path: "city" }
        });
        res.status(200).json({ success: true, result: areas });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAreaById = async (req, res) => {
    try {
        const area = await Area.findById(req.params.id).populate({
            path: "hub",
            populate: { path: "city" }
        });
        if (!area) return res.status(404).json({ success: false, message: "Area not found" });
        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateArea = async (req, res) => {
    try {
        const area = await Area.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: area });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteArea = async (req, res) => {
    try {
        await Area.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Area deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
