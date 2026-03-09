const Distributor = require("../models/Distributor");
const User = require("../models/User");

// @desc    Create a new Distributor
// @route   POST /api/distributors
// @access  Private (Admin/SuperAdmin)
exports.createDistributor = async (req, res) => {
    try {
        const {
            name,
            contactPerson,
            mobile,
            email,
            password,
            hubs,
            deliveryPoints,
            address,
            commissionRate,
            gstNumber,
            panNumber,
            bankDetails,
        } = req.body;

        // 1. Check if user already exists
        let user = await User.findOne({ mobile });
        if (user) {
            return res.status(400).json({ success: false, message: "User with this mobile already exists" });
        }

        // 2. Create User account first
        user = await User.create({
            name: contactPerson,
            mobile,
            email,
            password: password || "123456",
            role: "DISTRIBUTOR",
        });

        // 3. Create Distributor Profile
        const distributor = await Distributor.create({
            name,
            contactPerson,
            mobile,
            email,
            user: user._id,
            hubs,
            deliveryPoints,
            address,
            commissionRate,
            gstNumber,
            panNumber,
            bankDetails,
        });

        // 4. Link Distributor to User
        user.distributor = distributor._id;
        await user.save();

        res.status(201).json({
            success: true,
            data: distributor
        });

    } catch (error) {
        console.error("Create Distributor Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all Distributors
// @route   GET /api/distributors
// @access  Private (Admin/SuperAdmin)
exports.getAllDistributors = async (req, res) => {
    try {
        const { hub } = req.query;
        const query = {};

        if (hub) query.hubs = hub; // Filter by hub

        const distributors = await Distributor.find(query)
            .populate({
                path: "hubs",
                select: "name areas",
                populate: {
                    path: "areas",
                    select: "name city",
                    populate: { path: "city", select: "name" }
                }
            })
            .populate("deliveryPoints", "name code")
            .populate("user", "name mobile")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: distributors.length,
            data: distributors
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single Distributor
// @route   GET /api/distributors/:id
// @access  Private
exports.getDistributorById = async (req, res) => {
    try {
        const distributor = await Distributor.findById(req.params.id)
            .populate({
                path: "hubs",
                select: "name areas",
                populate: {
                    path: "areas",
                    select: "name city",
                    populate: { path: "city", select: "name" }
                }
            })
            .populate("deliveryPoints", "name code")
            .populate("user", "-password");

        if (!distributor) {
            return res.status(404).json({ success: false, message: "Distributor not found" });
        }

        res.status(200).json({
            success: true,
            data: distributor
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Distributor
// @route   PUT /api/distributors/:id
// @access  Private (Admin)
exports.updateDistributor = async (req, res) => {
    try {
        let distributor = await Distributor.findById(req.params.id);
        if (!distributor) {
            return res.status(404).json({ success: false, message: "Distributor not found" });
        }

        distributor = await Distributor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: distributor
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete Distributor (Soft delete)
// @route   DELETE /api/distributors/:id
// @access  Private (Admin)
exports.deleteDistributor = async (req, res) => {
    try {
        const distributor = await Distributor.findById(req.params.id);
        if (!distributor) {
            return res.status(404).json({ success: false, message: "Distributor not found" });
        }

        // Deactivate distributor
        distributor.isActive = false;
        await distributor.save();

        // Deactivate linked User
        if (distributor.user) {
            await User.findByIdAndUpdate(distributor.user, { isActive: false });
        }

        res.status(200).json({
            success: true,
            message: "Distributor deactivated successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
