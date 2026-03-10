const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ["info", "warning", "success", "error"],
            default: "info"
        },
        link: { type: String }, // URL to redirect to (e.g., /administrator/dashboard/complaints)
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
