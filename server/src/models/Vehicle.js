const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
    {
        plateNumber: { type: String, required: true, unique: true, uppercase: true },
        model: { type: String, required: true }, // e.g. "Tata 407", "Mahindra Bolero"
        type: { type: String, enum: ["TRUCK", "VAN", "REFRIGERATED", "OTHER"], default: "TRUCK" },
        capacityLiters: { type: Number, default: 0 },
        capacityCrates: { type: Number, default: 0 },
        lastServiceDate: { type: Date },
        lastServiceKm: { type: Number, default: 0 },
        currentKm: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        notes: { type: String }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
