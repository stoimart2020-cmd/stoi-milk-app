const User = require("../models/User");
const Employee = require("../models/Employee");
const Order = require("../models/Order");
const ServiceArea = require("../models/ServiceArea");
const { scopeEmployeeFilter, scopeCustomerFilter } = require("../middleware/scope");

exports.getAllUsers = async (req, res) => {
    try {
        const { role, search, type } = req.query;
        let query = {};

        // Determine which model to use and apply corresponding scope filter
        let Model = User;
        const userRoles = ["CUSTOMER", "LEAD"];
        if (type === "employee" || (role && !userRoles.includes(role))) {
            Model = Employee;
            query = scopeEmployeeFilter(req.scope, query);
        } else {
            query = scopeCustomerFilter(req.scope, query);
        }

        if (role) {
            query.role = role;
        }

        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { name: searchRegex },
                { mobile: searchRegex },
                { email: searchRegex },
                { "address.fullAddress": searchRegex },
                { "address.area": searchRegex },
                { "address.houseNo": searchRegex },
                { "address.landmark": searchRegex },
                { "address.floor": searchRegex }
            ];

            // If search is a valid number, add customerId to the search criteria
            if (!isNaN(search) && search.trim() !== "") {
                query.$or.push({ customerId: Number(search) });
            }
        }

        let queryBuilder = Model.find(query)
            .populate("factory", "name")
            .populate("hub", "name")
            .populate("areas", "name")
            .populate("deliveryPoints", "name")
            .sort({ createdAt: -1 });

        // Only populate customRole if it's the Employee model (or if Model isn't User)
        // Since we import User at top, we can compare.
        // Or check if Model.schema.paths.customRole exists
        if (Model.schema.paths.customRole) {
            queryBuilder.populate("customRole", "name");
        }

        const users = await queryBuilder;

        if (role === "RIDER") {
            const enrichedUsers = await Promise.all(users.map(async (user) => {
                const userObj = user.toObject();

                // Calculate Total Cash Collected (Lifetime)
                // Assuming 'delivered' status and 'Cash' payment mode
                const stats = await Order.aggregate([
                    {
                        $match: {
                            assignedRider: user._id,
                            status: 'delivered',
                            paymentMode: 'Cash'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$totalAmount" }
                        }
                    }
                ]);

                userObj.cashCollected = stats[0]?.total || 0;
                userObj.outstandingAmount = user.walletBalance || 0;

                return userObj;
            }));
            return res.status(200).json({ success: true, result: enrichedUsers });
        }

        res.status(200).json({ success: true, result: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, factory, hub, areas, deliveryPoints } = req.body;

        // Try to find in User first, then Employee
        let user = await User.findById(id);
        let Model = User;

        if (!user) {
            user = await Employee.findById(id);
            Model = Employee;
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // If changing from Customer to Employee or vice versa, we might need to migrate
        // For now, let's assume we are just updating fields within the same collection
        // unless the role change implies a collection change.
        // Complex migration logic omitted for simplicity, assuming role change stays within same type (e.g. Rider -> Admin)

        user.role = role;

        // Clear existing assignments
        user.factory = undefined;
        user.hub = undefined;
        user.areas = [];
        user.deliveryPoints = [];

        // Set new assignments based on role
        if (role === "FACTORY_INCHARGE" && factory) user.factory = factory;
        if (["HUB_INCHARGE", "DELIVERY_MANAGER", "RIDER"].includes(role) && hub) user.hub = hub;
        if (role === "RIDER") {
            if (areas) user.areas = areas;
            if (deliveryPoints) user.deliveryPoints = deliveryPoints;
        }

        await user.save();

        res.status(200).json({ success: true, message: "User role updated", result: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.mobile) {
            const existingUser = await User.findOne({ mobile: updates.mobile, _id: { $ne: id } });
            const existingEmployee = await Employee.findOne({ mobile: updates.mobile, _id: { $ne: id } });
            if (existingUser || existingEmployee) {
                return res.status(400).json({ success: false, message: "A user or staff member with this mobile number already exists." });
            }
        }

        let user = await User.findById(id);
        if (!user) {
            user = await Employee.findById(id);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const allowedUpdates = [
            "name", "mobile", "email", "password", "walletBalance",
            "fatherName", "aadharNumber", "joiningDate", "employeeType", "canCollectCash",
            "bankDetails", "emergencyContact", "vehicleDetails", "documents", "salaryDetails", "address",
            "isActive", "route", "customRole", "role",
            "hub", "areas", "deliveryPoints",
            "earnedSalary", "cashInHand", "kmEarnings"
        ];

        allowedUpdates.forEach((field) => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });

        // Password hashing is handled by pre-save hook if modified

        await user.save();

        res.status(200).json({ success: true, message: "User updated successfully", result: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        let user = await User.findById(id)
            .populate("factory", "name")
            .populate("hub", "name")
            .populate("areas", "name")
            .populate("deliveryPoints", "name")
            .populate("serviceArea", "name");

        if (!user) {
            user = await Employee.findById(id)
                .populate("factory", "name")
                .populate("hub", "name")
                .populate("areas", "name")
                .populate("deliveryPoints", "name");
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userObj = user.toObject();

        // If Rider, enrich with financials
        if (user.role === "RIDER") {
            const Order = require("../models/Order");
            const stats = await Order.aggregate([
                {
                    $match: {
                        assignedRider: user._id,
                        status: 'delivered',
                        paymentMode: 'Cash'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$totalAmount" }
                    }
                }
            ]);
            userObj.cashCollected = stats[0]?.total || 0;
            userObj.outstandingAmount = user.walletBalance || 0;
        }

        res.status(200).json({ success: true, result: userObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, mobile, email, password, role, factory, hub, areas, deliveryPoints, ...otherDetails } = req.body;

        // Determine Model
        const userRoles = ["CUSTOMER", "LEAD"];
        const Model = (userRoles.includes(role) || !role) ? User : Employee;

        // Check uniqueness across both collections to avoid login ambiguity
        const existingUser = await User.findOne({ mobile });
        const existingEmployee = await Employee.findOne({ mobile });

        if (existingUser || existingEmployee) {
            return res.status(400).json({ success: false, message: "User with this mobile already exists" });
        }

        const user = await Model.create({
            name,
            mobile,
            email,
            password,
            role,
            factory: role === "FACTORY_INCHARGE" ? factory : undefined,
            hub: ["HUB_INCHARGE", "DELIVERY_MANAGER", "RIDER"].includes(role) ? hub : undefined,
            areas: role === "RIDER" ? (areas || []) : [],
            deliveryPoints: role === "RIDER" ? (deliveryPoints || []) : [],
            ...otherDetails
        });

        // If an Employee was created, also create a "Shadow" User record with the same ID
        // This allows them to log in and use customer features (Subscriptions, Orders, etc.)
        if (Model === Employee) {
            try {
                // Check if user already exists (just in case)
                const existingUser = await User.findById(user._id);
                if (!existingUser) {
                    await User.create({
                        _id: user._id, // Share the same ID
                        name,
                        mobile,
                        email,
                        password,
                        role, // e.g., RIDER
                        isActive: true
                    });
                }
            } catch (userErr) {
                console.error("Failed to create shadow User for Employee:", userErr);
                // Non-blocking error, but should be logged
            }
        } else if (Model === User && role === "RIDER") {
            // Edge case: if created in User table with RIDER role, also ensure Employee record
             try {
                const existingEmployee = await Employee.findById(user._id);
                if (!existingEmployee) {
                    await Employee.create({
                        _id: user._id,
                        name,
                        mobile,
                        email,
                        password,
                        role,
                        isActive: true
                    });
                }
            } catch (empErr) {
                console.error("Failed to create shadow Employee for User:", empErr);
            }
        }

        res.status(201).json({ success: true, message: "User created successfully", result: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        let user = await User.findById(id);
        let employee = await Employee.findById(id);

        // If Employee exists but User not found by same ID, find the shadow User by employee's current mobile
        if (employee && !user) {
            user = await User.findOne({ mobile: employee.mobile });
        }

        let primaryRecord = user || employee;

        if (!primaryRecord) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check for mobile number conflicts if mobile is being changed
        if (updates.mobile) {
            const idsToExclude = [user?._id, employee?._id].filter(Boolean);
            const existingUser = await User.findOne({ mobile: updates.mobile, _id: { $nin: idsToExclude } });
            const existingEmployee = await Employee.findOne({ mobile: updates.mobile, _id: { $nin: idsToExclude } });
            if (existingUser || existingEmployee) {
                return res.status(400).json({ success: false, message: "A user or staff member with this mobile number already exists." });
            }
        }

        const allowedUpdates = [
            "name", "mobile", "email", "password", "walletBalance",
            "fatherName", "aadharNumber", "joiningDate", "employeeType", "canCollectCash",
            "bankDetails", "emergencyContact", "vehicleDetails", "documents", "salaryDetails", "address",
            "isActive", "route", "customRole", "role",
            "hub", "areas", "deliveryPoints",
            "earnedSalary", "cashInHand", "kmEarnings"
        ];

        // Shared fields to sync across both models if both exist
        const sharedFields = ["name", "mobile", "email", "password", "role", "isActive"];

        // Update Employee first (if exists) since it's the primary record for staff
        if (employee) {
            allowedUpdates.forEach((field) => {
                if (updates[field] !== undefined) {
                    employee[field] = updates[field];
                }
            });
            await employee.save();
        }

        // Update shadow User if exists (sync shared fields)
        if (user) {
            const fieldsToSync = employee ? sharedFields : allowedUpdates;
            fieldsToSync.forEach((field) => {
                if (updates[field] !== undefined) {
                    user[field] = updates[field];
                }
            });
            await user.save();
        }

        res.status(200).json({ success: true, message: "User updated successfully", result: employee || user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.seedRider = async (req, res) => {
    try {
        const Order = require("../models/Order");
        const Product = require("../models/Product");

        // 1. Create Rider
        const riderMobile = "9876543210";
        let rider = await Employee.findOne({ mobile: riderMobile });
        if (!rider) {
            rider = await Employee.create({
                name: "Ramesh Rider",
                mobile: riderMobile,
                role: "RIDER",
                walletBalance: 0,
            });
        } else {
            rider.role = "RIDER";
            await rider.save();
        }

        // 2. Create Customer
        const customerMobile = "9988776655";
        let customer = await User.findOne({ mobile: customerMobile });
        if (!customer) {
            customer = await User.create({
                name: "Priya Customer",
                mobile: customerMobile,
                role: "CUSTOMER",
                address: "123, Test Street, Chennai",
            });
        }

        // 3. Create Product
        let product = await Product.findOne({});
        if (!product) {
            product = await Product.create({
                name: "Test Milk",
                price: 50,
                description: "Fresh Milk",
                image: "test.png",
                category: "Milk",
                stock: 100
            });
        }

        // 4. Create Assigned Orders
        await Order.deleteMany({ assignedRider: rider._id });

        const orders = [
            {
                customer: customer._id,
                products: [{ product: product._id, quantity: 2, price: 50 }],
                totalAmount: 100,
                deliveryDate: new Date(),
                status: "pending",
                paymentMode: "Cash",
                paymentStatus: "pending",
                assignedRider: rider._id
            },
            {
                customer: customer._id,
                products: [{ product: product._id, quantity: 1, price: 50 }],
                totalAmount: 50,
                deliveryDate: new Date(),
                status: "pending",
                paymentMode: "Online",
                paymentStatus: "pending",
                assignedRider: rider._id
            },
            {
                customer: customer._id,
                products: [{ product: product._id, quantity: 1, price: 50 }],
                totalAmount: 50,
                deliveryDate: new Date(Date.now() - 86400000), // Yesterday
                status: "delivered",
                paymentMode: "Cash",
                paymentStatus: "paid",
                assignedRider: rider._id
            }
        ];

        await Order.insertMany(orders);

        res.status(200).json({ success: true, message: "Rider data seeded successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        console.log('[updateUserProfile] User ID:', userId, 'Body keys:', Object.keys(req.body));

        const user = await User.findById(userId);
        if (!user) {
            console.error('[updateUserProfile] User not found for ID:', userId);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const { name, email, alternateMobile, dateOfBirth, addresses, defaultAddressIndex } = req.body;

        // Handle field updates (support clearing fields with empty string)
        if (name !== undefined) user.name = name || user.name;
        if (email !== undefined) user.email = email || undefined;
        if (alternateMobile !== undefined) user.alternateMobile = alternateMobile || undefined;
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || undefined;
        if (req.body.password) user.password = req.body.password;

        if (addresses && Array.isArray(addresses)) {
            user.addresses = addresses;

            // Handle default address selection
            let activeAddress = null;
            if (typeof defaultAddressIndex === 'number' && addresses[defaultAddressIndex]) {
                // Set isDefault flags
                user.addresses.forEach((addr, idx) => {
                    addr.isDefault = idx === defaultAddressIndex;
                });
                activeAddress = addresses[defaultAddressIndex];
            } else {
                // Or find the one marked isDefault in the array
                const defaultAddr = addresses.find(a => a.isDefault);
                if (defaultAddr) {
                    activeAddress = defaultAddr;
                } else if (addresses.length > 0) {
                    // Fallback to first
                    user.addresses[0].isDefault = true;
                    activeAddress = addresses[0];
                }
            }

            // Sync legacy address field with active address
            if (activeAddress && activeAddress.location && activeAddress.location.coordinates) {
                const coordinates = activeAddress.location.coordinates; // [lng, lat]

                // Try to find matching service area (non-blocking)
                try {
                    const serviceArea = await ServiceArea.findOne({
                        isActive: true,
                        polygon: {
                            $geoIntersects: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: coordinates
                                }
                            }
                        }
                    }).populate({
                        path: "area",
                        populate: {
                            path: "city",
                            populate: {
                                path: "district",
                                populate: {
                                    path: "factory"
                                }
                            }
                        }
                    });

                    if (serviceArea) {
                        // Update Logic with Service Area
                        user.serviceArea = serviceArea._id;
                        user.area = serviceArea.area?._id;
                        user.city = serviceArea.area?.city?._id;
                        user.district = serviceArea.area?.city?.district?._id;
                        user.factory = serviceArea.area?.city?.district?.factory?._id;
                    } else {
                        console.warn('[updateUserProfile] No service area found for coordinates:', coordinates, '- saving address anyway');
                    }
                } catch (geoErr) {
                    console.warn('[updateUserProfile] Service area lookup failed:', geoErr.message, '- saving address anyway');
                }

                // Always update the address regardless of service area match
                user.address = {
                    houseNo: activeAddress.houseNo,
                    floor: activeAddress.floor,
                    area: activeAddress.area,
                    landmark: activeAddress.landmark,
                    fullAddress: activeAddress.fullAddress,
                    location: activeAddress.location
                };
            }
        } else if (req.body.address) {
            // Legacy direct address update support
            user.address = req.body.address;
        }

        if (req.body.deliveryPreference) user.deliveryPreference = req.body.deliveryPreference;
        if (req.body.deliveryPreferences) user.deliveryPreferences = req.body.deliveryPreferences;

        await user.save();
        console.log('[updateUserProfile] Profile updated successfully for user:', userId);
        res.status(200).json({ success: true, message: "Profile updated successfully", result: user });
    } catch (error) {
        console.error('[updateUserProfile] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.checkCustomerExistence = async (req, res) => {
    try {
        const { mobile } = req.query;
        if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

        const user = await User.findOne({ mobile }).select('name role');
        const employee = await Employee.findOne({ mobile }).select('name role');

        if (user || employee) {
            const foundUser = user || employee;
            return res.status(200).json({
                success: true,
                exists: true,
                message: "User already exists in the system",
                result: {
                    name: foundUser.name ? (foundUser.name.charAt(0) + "****" + foundUser.name.slice(-1)) : "Sensitive Name",
                    role: foundUser.role
                }
            });
        }

        res.status(200).json({ success: true, exists: false, message: "User not found" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
