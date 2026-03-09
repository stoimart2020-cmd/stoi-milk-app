const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
    {
        // The user who shared their referral code
        referrer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // The new user who signed up with the referral code
        referee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // The referral code used
        referralCode: {
            type: String,
            required: true,
        },
        // Status of the referral
        status: {
            type: String,
            enum: ["pending", "completed", "expired", "cancelled"],
            default: "pending",
        },
        // Reward amounts at the time of referral (in case settings change later)
        referrerReward: {
            type: Number,
            default: 0,
        },
        refereeReward: {
            type: Number,
            default: 0,
        },
        // Whether rewards have been credited
        referrerRewarded: {
            type: Boolean,
            default: false,
        },
        refereeRewarded: {
            type: Boolean,
            default: false,
        },
        // When rewards were credited
        referrerRewardedAt: {
            type: Date,
        },
        refereeRewardedAt: {
            type: Date,
        },
        // Expiry date for pending referrals
        expiresAt: {
            type: Date,
        },
        // Notes/metadata
        notes: {
            type: String,
        },
    },
    { timestamps: true }
);

// Indexes for faster queries
referralSchema.index({ referrer: 1 });
referralSchema.index({ referee: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1 });

module.exports = mongoose.model("Referral", referralSchema);
