const mongoose = require("mongoose");

const stockPointSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        code: { type: String, unique: true },
        hub: { type: mongoose.Schema.Types.ObjectId, ref: "Hub", required: true },

        // Stock point serves specific route or area
        deliveryRoute: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryRoute" },
        area: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },

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

stockPointSchema.index({ location: "2dsphere" });
stockPointSchema.index({ deliveryRoute: 1 });
stockPointSchema.index({ area: 1 });
stockPointSchema.index({ hub: 1 });

module.exports = mongoose.model("StockPoint", stockPointSchema);
