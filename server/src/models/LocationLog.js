const mongoose = require("mongoose");

const locationLogSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        location: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], required: true }, // [lng, lat]
        },
        speed: { type: Number, default: 0 },
        heading: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        battery: { type: Number, default: null },
        timestamp: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

// Index for geo-spatial queries
locationLogSchema.index({ location: "2dsphere" });
// Index for historical queries
locationLogSchema.index({ employee: 1, timestamp: -1 });

module.exports = mongoose.model("LocationLog", locationLogSchema);
