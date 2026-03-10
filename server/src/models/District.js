const mongoose = require("mongoose");

const districtSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        factory: { type: mongoose.Schema.Types.ObjectId, ref: "Factory", required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("District", districtSchema);
