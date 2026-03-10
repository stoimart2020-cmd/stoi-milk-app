const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Customer
        subject: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            enum: ["Quality", "Delivery", "Billing", "Other"],
            default: "Other"
        },
        status: {
            type: String,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open"
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium"
        },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Staff
        resolution: { type: String },
        attachments: [
            {
                url: { type: String, required: true },
                filename: { type: String, required: true },
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
        history: [
            {
                action: { type: String }, // e.g., "Status changed to In Progress"
                by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                timestamp: { type: Date, default: Date.now },
                comment: { type: String },
                attachments: [{ type: String }] // URLs of images added in this update
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
