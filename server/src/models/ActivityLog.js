const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'userModel',
            required: true,
        },
        userModel: {
            type: String,
            required: true,
            enum: ['User', 'Employee'],
            default: 'User'
        },
        role: {
            type: String,
            required: true, // "CUSTOMER", "ADMIN", "RIDER", etc.
        },
        action: {
            type: String,
            required: true, // e.g., "LOGIN", "UPDATE_PROFILE", "CREATE_ORDER"
        },
        entityType: {
            type: String, // e.g., "order", "subscription", "payment"
        },
        entityId: {
            type: String,
        },
        description: {
            type: String,
            required: true,
        },
        oldData: {
            type: mongoose.Schema.Types.Mixed, // JSON of previous state
        },
        newData: {
            type: mongoose.Schema.Types.Mixed, // JSON of new state
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
    },
    { timestamps: true }
);

// Index for faster queries
activityLogSchema.index({ role: 1, createdAt: -1 });
activityLogSchema.index({ user: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
