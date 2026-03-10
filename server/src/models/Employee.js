const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const employeeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        mobile: { type: String, required: true, unique: true },
        email: { type: String },
        password: { type: String }, // For login
        role: {
            type: String,
            enum: [
                "SUPERADMIN",
                "ADMIN",
                "LAB_INCHARGE",
                "FACTORY_INCHARGE",
                "HUB_INCHARGE",
                "STOCK_AREA_INCHARGE",
                "DELIVERY_MANAGER",
                "RIDER",
                "FINANCE_TEAM",
                "CUSTOMER_RELATIONS",
                "FIELD_MARKETING",
                "ONLINE_MARKETING",
                "MILK_COLLECTION_PERSON",
                "TRUCK_DRIVER"
            ],

            required: true
        },
        otp: String,
        otpExpires: Date,
        customRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },

        // Role specific assignments
        factory: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
        hub: { type: mongoose.Schema.Types.ObjectId, ref: "Hub" },
        // Rider/Employee coverage — areas or specific delivery points
        areas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Area" }],
        deliveryPoints: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPoint" }],

        // Rider specific
        walletBalance: { type: Number, default: 0 }, // Riders might have a collection wallet
        isActive: { type: Boolean, default: true },

        // Personal Details
        fatherName: String,
        aadharNumber: String,
        joiningDate: Date,
        employeeType: { type: String, enum: ["Full Time", "Part Time", "Contract"], default: "Full Time" },
        canCollectCash: { type: Boolean, default: false },

        // Address/Location (for Riders)
        address: {
            fullAddress: String,
            location: {
                type: { type: String, default: "Point" },
                coordinates: [Number],
            },
        },

        // Bank Details
        bankDetails: {
            bankName: String,
            accountName: String,
            accountNumber: String,
            ifsc: String
        },

        // Emergency Contact
        emergencyContact: {
            name: String,
            relationship: String,
            contactNumber: String
        },

        // Vehicle Details
        vehicleDetails: {
            vehicleType: String,
            number: String,
            loadCapacity: String,
            owner: String
        },

        // Documents (URLs)
        documents: {
            frontId: String,
            backId: String,
            licenseFront: String,
            licenseBack: String,
            photo: String
        },

        // Salary & Commission
        salaryDetails: {
            isSalaried: { type: Boolean, default: true },
            salaryType: { type: String, enum: ["Daily", "Weekly", "Biweekly", "Monthly"], default: "Monthly" },
            salary: Number,
            perKmCharge: { type: Number, default: 0 }, // Per KM compensation
            relatedAdminUser: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            productCommission: { type: Boolean, default: false }
        },

        // Financial Tracking
        earnedSalary: { type: Number, default: 0 },   // Total salary earned (from attendance)
        cashInHand: { type: Number, default: 0 },      // Cash collected from customers currently held
        kmEarnings: { type: Number, default: 0 },      // Total earnings from per-km charges

        // KM Logs (daily odometer readings)
        kmLogs: [{
            date: { type: Date, required: true },
            startReading: { type: Number, required: true },
            endReading: { type: Number, default: null },
            gpsDistance: { type: Number, default: 0 }, // GPS tracked distance in km
            totalKm: { type: Number, default: 0 },
            kmCharge: { type: Number, default: 0 }, // perKmCharge * totalKm
            status: { type: String, enum: ["active", "completed"], default: "active" }
        }],

        // Cash Collection Records (Admin collects cash from rider)
        cashCollections: [{
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            notes: String
        }],

        // Advance Salary Payments (Admin pays salary advance to rider)
        advancePayments: [{
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
            notes: String
        }],

        // Salary Ledger (auto-generated from attendance)
        salaryLedger: [{
            date: { type: Date, required: true },
            type: { type: String, enum: ["salary", "km_charge", "cash_collection", "settlement", "advance_payment"], required: true },
            amount: { type: Number, required: true },
            description: String,
            balanceAfter: Number
        }],

        // Attendance
        attendance: [{
            date: { type: Date, required: true },
            status: { type: String, enum: ["Present", "Absent", "Half Day", "Leave"], default: "Present" },
            checkIn: Date,
            checkOut: Date,
            notes: String
        }],

        // Live Location (updated by rider app GPS tracking)
        liveLocation: {
            coordinates: {
                type: { type: String, default: "Point" },
                coordinates: [Number], // [lng, lat]
            },
            speed: { type: Number, default: 0 },
            heading: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 },
            battery: { type: Number, default: null },
            lastUpdated: { type: Date, default: null },
            isTracking: { type: Boolean, default: false },
        },

        // Route Sorting (Ordered list of Customer IDs)
        route: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    },
    { timestamps: true }
);

employeeSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

employeeSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Employee", employeeSchema);
