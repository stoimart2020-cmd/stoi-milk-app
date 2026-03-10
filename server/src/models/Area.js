const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        hub: { type: mongoose.Schema.Types.ObjectId, ref: "Hub", required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Area", areaSchema);
