const mongoose = require("mongoose");

/**
 * Distributed Cron Lock
 * Prevents multiple instances of the backend from running the same cron job 
 * simultaneously, avoiding duplicate orders and double-billing.
 */
const cronLockSchema = new mongoose.Schema(
    {
        jobName: {
            type: String,
            required: true,
        },
        // The date string representing when this job is for (e.g., "2025-04-03")
        targetDate: {
            type: String,
            required: true,
        },
        instanceId: {
            type: String,
            required: true,
            default: () => Math.random().toString(36).substring(2, 15)
        },
        lockedAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
        }
    },
    { timestamps: true }
);

// Compound Unique Index: A single job can only run ONCE per target date
cronLockSchema.index({ jobName: 1, targetDate: 1 }, { unique: true });

// TTL Index to automatically clean up old locks after a few days
cronLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("CronLock", cronLockSchema);
