const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        orderId: { type: Number, unique: true, sparse: true }, // Auto-increment
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        products: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"],
            default: "pending",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        paymentMode: {
            type: String,
            enum: ["ONLINE", "CASH", "UPI", "WALLET", "CARD", "Online", "Cash"],
            default: "ONLINE"
        },
        deliveryDate: {
            type: Date,
            required: true,
        },
        bottlesIssued: {
            type: Number,
            default: 0,
        },
        bottlesReturned: {
            type: Number,
            default: 0,
        },
        deliveredAssets: [{ type: String }],
        returnedAssets: [{ type: String }],
        assignedRider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        // Delivery Details
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        orderType: {
            type: String,
            enum: ["DELIVERY", "BOTTLE_COLLECTION", "ONE_TIME", "SPOT_SALE"],
            default: "DELIVERY",
        },
        cashCollected: { type: Number, default: 0 },
        chequeCollected: { type: Number, default: 0 },
        chequeNumber: { type: String },
        noteType: { type: String },
        deliveryNote: { type: String },
        notes: { type: String, default: "" }, // Admin notes / spot sale reason
        cancelReason: { type: String },
        deliveryProofImages: [{ type: String }],
        // Delivery Time Slot
        deliverySlot: {
            label: { type: String },       // e.g. "Morning"
            startTime: { type: String },   // e.g. "05:00"
            endTime: { type: String },     // e.g. "07:00"
        },
    },
    { timestamps: true }
);

// Performance Indexes
orderSchema.index({ customer: 1, deliveryDate: -1 });
orderSchema.index({ assignedRider: 1, status: 1 });
orderSchema.index({ deliveryDate: 1, _id: 1 });
orderSchema.index({ status: 1 });


orderSchema.pre("save", async function () {
    if (this.isNew && !this.orderId) {
        const Counter = require("./Counter");
        this.orderId = await Counter.getNextSequence("orderId");
    }
});

module.exports = mongoose.model("Order", orderSchema);
