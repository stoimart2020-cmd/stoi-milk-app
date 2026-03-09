const City = require("../models/City");

exports.createCity = async (req, res) => {
    try {
        const city = await City.create(req.body);
        res.status(201).json({ success: true, result: city });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllCities = async (req, res) => {
    try {
        const cities = await City.find().populate("district");
        res.status(200).json({ success: true, result: cities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCityById = async (req, res) => {
    try {
        const city = await City.findById(req.params.id).populate("district");
        if (!city) return res.status(404).json({ success: false, message: "City not found" });
        res.status(200).json({ success: true, result: city });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCity = async (req, res) => {
    try {
        const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, result: city });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCity = async (req, res) => {
    try {
        await City.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "City deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
