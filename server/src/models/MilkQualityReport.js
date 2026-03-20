const mongoose = require("mongoose");

const milkQualityReportSchema = new mongoose.Schema(
    {
        date: { type: Date, required: true, unique: true },
        fatPercent: { type: Number, required: true },
        snfPercent: { type: Number, required: true },
        clrValue: { type: Number },
        waterAdded: { type: Number, default: 0 },
        toxinFree: { type: Boolean, default: true },
        isOrganic: { type: Boolean, default: false },
        labReportImageUrl: { type: String },
        notes: { type: String },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("MilkQualityReport", milkQualityReportSchema);
