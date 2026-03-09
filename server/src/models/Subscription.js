const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
    {
        subscriptionId: { type: Number, unique: true, sparse: true }, // Auto-increment
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        frequency: {
            type: String,
            enum: ["Daily", "Alternate Days", "Custom", "Weekdays", "Weekends"],
            required: true
        },
        alternateQuantity: { type: Number, default: 0 }, // For "Alternate Days": 0 means skip, >0 means rotate
        customDays: [{ type: String }], // Legacy support or simple day list
        customSchedule: { // New: quantity per day mapping e.g. { "Monday": 2 }
            type: Map,
            of: Number,
            default: {}
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date }, // Optional: for fixed term or trial end
        status: {
            type: String,
            enum: ["pending", "active", "paused", "cancelled"],
            default: "active"
        },
        isTrial: { type: Boolean, default: false },
        trialPaidAmount: { type: Number, default: 0 },
        pausedUntil: { type: Date }, // If paused, when to resume (optional)
        pauseReason: { type: String }, // Reason for pausing (e.g., "Insufficient wallet balance")
        assignedRider: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Delivery Boy
    },
    { timestamps: true }
);

subscriptionSchema.pre("save", async function () {
    if (this.isNew && !this.subscriptionId) {
        const Counter = require("./Counter");
        this.subscriptionId = await Counter.getNextSequence("subscriptionId");
    }
});

// Ensure a user can only have one active subscription per product
// We'll handle this logic in the controller for more flexibility (e.g. allowing cancelled then re-subscribed)
// But a unique compound index on user+product where status is NOT cancelled would be ideal if Mongo supported partial indexes easily.
// For now, we'll rely on controller logic.

module.exports = mongoose.model("Subscription", subscriptionSchema);
