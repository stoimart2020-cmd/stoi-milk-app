const District = require("../models/District");

exports.createDistrict = async (req, res) => {
    try {
        const district = await District.create(req.body);
        res.status(201).json({ success: true, result: district });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllDistricts = async (req, res) => {
    try {
        const districts = await District.find().populate("factory");
        res.status(200).json({ success: true, result: districts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDistrictById = async (req, res) => {
    try {
        const district = await District.findById(req.params.id).populate("factory");
        if (!district) return res.status(404).json({ success: false, message: "District not found" });
        res.status(200).json({ success: true, result: district });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateDistrict = async (req, res) => {
    try {
        const district = await District.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: district });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDistrict = async (req, res) => {
    try {
        await District.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "District deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
