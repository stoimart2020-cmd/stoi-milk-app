const mongoose = require("mongoose");

const factorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String, unique: true },
        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            fullAddress: String,
        },
        location: {
            type: { type: String },
            coordinates: [Number], // [lng, lat]
        },
        contactPerson: { type: String },
        contactNumber: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

factorySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Factory", factorySchema);
