const mongoose = require("mongoose");

const subscriptionModificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
        date: { type: String, required: true }, // YYYY-MM-DD string to avoid timezone issues
        quantity: { type: Number, required: true, min: 0 }, // 0 means skipped
        status: {
            type: String,
            enum: ["modified", "skipped"],
            default: "modified"
        },
    },
    { timestamps: true }
);

// Ensure one modification per subscription per date
subscriptionModificationSchema.index({ subscription: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("SubscriptionModification", subscriptionModificationSchema);
