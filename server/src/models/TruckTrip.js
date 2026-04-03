const mongoose = require("mongoose");

const truckTripSchema = new mongoose.Schema(
    {
        tripId: { type: String, unique: true }, // Auto-generated ID
        driver: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
        date: { type: Date, required: true }, // Scheduled Date
        status: { 
            type: String, 
            enum: ["PENDING", "LOADING", "IN_TRANSIT", "HUB_DROPS", "COMPLETED", "CANCELLED"], 
            default: "PENDING" 
        },
        // Telemetry
        startKm: { type: Number, default: 0 },
        endKm: { type: Number, default: 0 },
        startTime: { type: Date },
        endTime: { type: Date },
        distanceTravelled: { type: Number, default: 0 },
        // Manifest & Pickup
        manifest: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
                name: { type: String },
                scheduledUnits: { type: Number },
                confirmedUnits: { type: Number, default: 0 },
                unit: { type: String }
            }
        ],
        isConfirmed: { type: Boolean, default: false },
        confirmedAt: { type: Date },
        // Hubs covered in this trip (snapshot of route)
        hubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hub" }],
        notes: { type: String }
    },
    { timestamps: true }
);

// Performance Indexes
truckTripSchema.index({ driver: 1, date: -1 });
truckTripSchema.index({ vehicle: 1, status: 1 });
truckTripSchema.index({ date: 1, tripId: 1 });

truckTripSchema.pre("save", async function() {
    if (this.isNew && !this.tripId) {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const count = await mongoose.model("TruckTrip").countDocuments({ date: this.date });
        this.tripId = `TRIP-${date}-${(count + 1).toString().padStart(3, '0')}`;
    }
    if (this.status === "COMPLETED" && this.endKm > this.startKm) {
        this.distanceTravelled = this.endKm - this.startKm;
    }
});

module.exports = mongoose.model("TruckTrip", truckTripSchema);
