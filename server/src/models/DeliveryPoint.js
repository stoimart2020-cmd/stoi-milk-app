const mongoose = require("mongoose");

const deliveryPointSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String, unique: true, sparse: true },

        // Delivery Point belongs to a Hub
        hub: { type: mongoose.Schema.Types.ObjectId, ref: "Hub", required: true },

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
        currentStock: { type: Number, default: 0 },
        contactPerson: { type: String },
        contactNumber: { type: String },
        isActive: { type: Boolean, default: true },
        notes: { type: String }
    },
    { timestamps: true }
);

deliveryPointSchema.index({ location: "2dsphere" });
deliveryPointSchema.index({ hub: 1 });

module.exports = mongoose.model("DeliveryPoint", deliveryPointSchema);
