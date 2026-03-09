const mongoose = require("mongoose");

const distributorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true }, // Business Name
        contactPerson: { type: String, required: true },
        mobile: { type: String, required: true, unique: true },
        email: { type: String },

        // Link to User for login
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        // Coverage — assigned at Hub level (Hub → Area → City → District → Factory)
        // A distributor handles one or more hubs
        hubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hub" }],

        // Optionally also assigned specific delivery points within those hubs
        deliveryPoints: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPoint" }],

        // Address
        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            fullAddress: String,
            location: {
                type: { type: String, default: "Point" },
                coordinates: [Number],
            },
        },

        // Financials
        commissionRate: { type: Number, default: 0 }, // Percentage
        gstNumber: { type: String },
        panNumber: { type: String },
        bankDetails: {
            bankName: String,
            accountName: String,
            accountNumber: String,
            ifsc: String
        },

        // Operational
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

distributorSchema.index({ "address.location": "2dsphere" });
distributorSchema.index({ hubs: 1 });

module.exports = mongoose.model("Distributor", distributorSchema);
