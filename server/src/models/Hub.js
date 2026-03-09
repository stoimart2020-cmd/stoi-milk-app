const mongoose = require("mongoose");

const hubSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String, unique: true, sparse: true },

        // A Hub belongs to a City
        city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },

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
        capacity: { type: Number, default: 0 },
        contactPerson: { type: String },
        contactNumber: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

hubSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Hub", hubSchema);
