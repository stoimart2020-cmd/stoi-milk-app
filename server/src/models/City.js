const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        district: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("City", citySchema);
