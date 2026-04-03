const mongoose = require("mongoose");

const bottleTransactionSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        rider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null, // Could be null for manual adjustments
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null, // Could be null for standalone transactions
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null, // Optional: for per-product tracking
        },
        type: {
            type: String,
            enum: ["issued", "returned", "broken", "unreturned_penalty", "penalty_reversed"],
            required: true,
        },
        penaltyAmount: { type: Number, default: 0 },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        notes: {
            type: String,
            default: "",
        },
        bottleCondition: {
            type: String,
            enum: ["new", "good", "fair", "poor", "damaged"],
            default: "good",
        },
        refundAmount: {
            type: Number,
            default: 0,
        },
        qrCode: {
            type: String, // Base64 encoded QR code data
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Admin or Rider who recorded this
        },
    },
    { timestamps: true }
);

// Indexes for efficient queries
bottleTransactionSchema.index({ customer: 1, createdAt: -1 });
bottleTransactionSchema.index({ rider: 1, createdAt: -1 });
bottleTransactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("BottleTransaction", bottleTransactionSchema);
