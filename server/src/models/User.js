const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        customerId: { type: Number, unique: true, sparse: true }, // Auto-increment for customers
        name: { type: String },
        mobile: { type: String, required: true, unique: true },
        alternateMobile: { type: String },
        email: { type: String },
        profilePicture: { type: String },
        role: {
            type: String,
            enum: [
                "CUSTOMER",
                "LEAD",
                "SUPERADMIN",
                "ADMIN",
                "LAB_INCHARGE",
                "FACTORY_INCHARGE",
                "HUB_INCHARGE",
                "STOCK_AREA_INCHARGE",
                "DELIVERY_MANAGER",
                "RIDER", // Delivery Boy
                "FINANCE_TEAM",
                "CUSTOMER_RELATIONS",
                "FIELD_MARKETING",
                "ONLINE_MARKETING",
                "MILK_COLLECTION_PERSON",
                "TRUCK_DRIVER",
                "DISTRIBUTOR"
            ],
            default: "CUSTOMER",
        },
        // Role specific links
        factory: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
        hub: { type: mongoose.Schema.Types.ObjectId, ref: "Hub" },
        // Rider coverage — can be assigned areas or specific delivery points under their hub
        areas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Area" }],
        deliveryPoints: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPoint" }],
        distributor: { type: mongoose.Schema.Types.ObjectId, ref: "Distributor" },

        // Location Hierarchy
        district: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
        city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
        area: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
        serviceArea: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceArea" }, // Delivery Point

        walletBalance: { type: Number, default: 0 },

        // Address
        address: {
            houseNo: String,
            floor: String,
            area: String,
            landmark: String,
            fullAddress: String,
            location: {
                type: { type: String, default: "Point" },
                coordinates: [Number], // [longitude, latitude]
            },
        },
        addresses: [{
            tag: String, // Home, Work, Other
            houseNo: String,
            floor: String,
            area: String,
            landmark: String,
            fullAddress: String,
            location: {
                type: { type: String, default: "Point" },
                coordinates: [Number]
            },
            isDefault: { type: Boolean, default: false }
        }],

        // Delivery settings
        deliveryPreference: {
            type: String,
            enum: ["Ring Bell", "Doorstep", "In Hand", "Bag/Basket"],
            default: "Ring Bell",
        },
        deliveryPreferences: {
            Monday: { type: String, default: "Ring Bell" },
            Tuesday: { type: String, default: "Ring Bell" },
            Wednesday: { type: String, default: "Ring Bell" },
            Thursday: { type: String, default: "Ring Bell" },
            Friday: { type: String, default: "Ring Bell" },
            Saturday: { type: String, default: "Ring Bell" },
            Sunday: { type: String, default: "Ring Bell" },
        },
        deliveryInstruction: { type: String },
        deliveryShift: { type: String, enum: ["Morning", "Evening"], default: "Morning" },
        deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

        // Customer details
        gstNumber: { type: String },
        type: { type: String, enum: ["Consumer", "Business", "Reseller"], default: "Consumer" },
        referrerMobile: { type: String },
        isPostPaid: { type: Boolean, default: false },
        notificationSubscription: { type: String },
        fcmToken: { type: String }, // Firebase Cloud Messaging token for push notifications
        notes: { type: String },
        source: { type: String },
        subSource: { type: String },
        createdBy: { type: String },
        paymentMode: { type: String, enum: ["Online", "Cash", "UPI"], default: "Online" },
        dateOfBirth: { type: Date },
        tempCustomerStatus: { type: String },

        // --- Delivery Preferences ---
        silentDelivery: { type: Boolean, default: false }, // "Don't ring bell" toggle

        // --- Referrals & Growth ---
        referralCode: { type: String, unique: true, sparse: true },
        referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        totalReferrals: { type: Number, default: 0 },
        referralEarnings: { type: Number, default: 0 },
        milestoneRewards: [{
            milestone: Number,
            rewarded: { type: Boolean, default: false },
            rewardDate: Date
        }],
        subscribedToNewsletters: { type: Boolean, default: false },

        // Status
        isActive: { type: Boolean, default: true },
        dnd: { type: Boolean, default: false },

        // Vacation Mode
        vacation: {
            isActive: { type: Boolean, default: false },
            startDate: { type: Date },
            endDate: { type: Date },
            reason: { type: String },
            createdAt: { type: Date },
            createdBy: { type: String }, // "customer" | "admin"
        },

        // Financial
        creditLimit: { type: Number, default: 0 },
        unbilledConsumption: { type: Number, default: 0 },

        // Other
        // hub: { type: String }, // Removed duplicate
        crmAgent: { type: String },
        temporaryStatus: { type: String },
        billingType: { type: String, default: "Prepaid" },
        deviceType: { type: String },
        followUpDate: { type: Date },
        openTickets: { type: Number, default: 0 },
        remainingBottles: { type: Number, default: 0 },
        bottleBalances: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            pending: { type: Number, default: 0 }, // Unreturned bottles of this type
            penalized: { type: Number, default: 0 } // Bottles already charged for (Sunday penalty)
        }],
        bottleDeposit: { type: Number, default: 0 }, // Total deposit amount for bottles
        assetsInHand: [{ type: String }], // Asset tracking numbers
        adjustmentSoFar: { type: Number, default: 0 },

        // Auth
        otp: { type: String },
        otpExpires: { type: Date },
        temporaryOtp: { type: String }, // Temporary fallback OTP
        password: { type: String }, // For Admin Users
        pin: { type: String }, // 4 digit PIN for login
        isMobileVerified: { type: Boolean, default: false },
    },
    { timestamps: true, strictPopulate: false }
);

// Auto-increment customerId for CUSTOMER role (also when converting from LEAD)
userSchema.pre("save", async function () {
    if (this.role === "CUSTOMER" && !this.customerId) {
        const Counter = require("./Counter");
        const User = this.constructor;

        // Sync counter with actual max customerId to prevent duplicates
        const maxUser = await User.findOne({ customerId: { $exists: true } })
            .sort({ customerId: -1 })
            .select("customerId")
            .lean();
        const maxId = maxUser?.customerId || 0;

        // Ensure counter is at least as high as the max existing customerId
        await Counter.findByIdAndUpdate(
            "customerId",
            { $max: { seq: maxId } },
            { upsert: true }
        );

        this.customerId = await Counter.getNextSequence("customerId");
    }
});

userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        if (!this.isModified("pin") || !this.pin) {
            return;
        }
    }

    const salt = await bcrypt.genSalt(10);
    
    if (this.isModified("password") && this.password) {
        this.password = await bcrypt.hash(this.password, salt);
    }
    
    if (this.isModified("pin") && this.pin) {
        this.pin = await bcrypt.hash(this.pin, salt);
    }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.matchPin = async function (enteredPin) {
    if (!this.pin) return false;
    return await bcrypt.compare(enteredPin, this.pin);
};

userSchema.index({ "address.location": "2dsphere" });

module.exports = mongoose.model("User", userSchema);
