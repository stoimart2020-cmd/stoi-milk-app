const User = require("../models/User");
const { createNotification } = require("./notificationController");
const { logAction } = require("./activityLogController");
const { resolveHubs } = require("../utils/logisticsHelper");
const ServiceArea = require("../models/ServiceArea");
const Area = require("../models/Area");
const City = require("../models/City");
const District = require("../models/District");
const Hub = require("../models/Hub");
const mongoose = require("mongoose");
const { scopeCustomerFilter } = require("../middleware/scope");

exports.createCustomer = async (req, res) => {
    try {
        const { mobile } = req.body;
        let user = await User.findOne({ mobile });
        if (user) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }
        // Handle address structure
        let customerData = { ...req.body };
        if (!["CUSTOMER", "LEAD"].includes(customerData.role)) {
            customerData.role = "CUSTOMER"; // Default if not specified or invalid
        }

        if (!customerData.referralCode) {
            delete customerData.referralCode;
        }
        if (!customerData.email) {
            delete customerData.email;
        }

        // Ensure location is valid GeoJSON for queries
        if (typeof customerData.address === 'string') {
            customerData.address = {
                fullAddress: customerData.address,
                location: { type: "Point", coordinates: [77.4119, 8.1833] }
            };
        } else if (!customerData.address) {
            customerData.address = {
                location: { type: "Point", coordinates: [77.4119, 8.1833] }
            };
        } else if (customerData.latitude && customerData.longitude) {
            customerData.address.location = {
                type: "Point",
                coordinates: [parseFloat(customerData.longitude), parseFloat(customerData.latitude)]
            };
        }

        // AUTO-ASSIGN LOGISTICS
        if (customerData.address?.location?.coordinates) {
            const [lng, lat] = customerData.address.location.coordinates;
            const matchedServiceArea = await ServiceArea.findOne({
                isActive: true,
                polygon: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lng, lat] } } }
            }).populate("area");

            if (matchedServiceArea) {
                customerData.serviceArea = matchedServiceArea._id;
                if (matchedServiceArea.area) {
                    const areaDoc = await Area.findById(matchedServiceArea.area._id).populate({
                        path: "hub",
                        populate: { path: "city", populate: { path: "district", populate: { path: "factory" } } }
                    });

                    if (areaDoc) {
                        customerData.area = areaDoc._id;
                        if (areaDoc.hub) {
                            customerData.hub = areaDoc.hub._id;
                            if (areaDoc.hub.city) {
                                customerData.city = areaDoc.hub.city._id;
                                if (areaDoc.hub.city.district) {
                                    customerData.district = areaDoc.hub.city.district._id;
                                    if (areaDoc.hub.city.district.factory) customerData.factory = areaDoc.hub.city.district.factory._id;
                                }
                            }
                        }
                    }
                }
            }
        }

        user = await User.create(customerData);
        res.status(201).json({ success: true, result: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getRichStatus = (user, subscriptions) => {
    if (!user.isActive) return "suspended";
    if (user.vacation?.isActive && user.vacation.startDate <= new Date() && (!user.vacation.endDate || user.vacation.endDate >= new Date())) return "on_vacation";

    if (!subscriptions || subscriptions.length === 0) return "no_plan";

    const activeRegular = subscriptions.some(s => s.status === "active" && !s.isTrial);
    const activeTrial = subscriptions.some(s => s.status === "active" && s.isTrial);
    const hasAnyTrial = subscriptions.some(s => s.isTrial);

    if (activeRegular) return "active";
    if (activeTrial) return "trial_running";
    if (hasAnyTrial && !activeRegular) return "trial_ended";

    return "inactive";
};

exports.getAllCustomers = async (req, res) => {
    try {
        const { search, hub, serviceArea, factory, district, city, area, stockPoint, deliveryBoy } = req.query;
        let query = { role: { $in: ["CUSTOMER", "LEAD"] } };
        query = scopeCustomerFilter(req.scope, query);

        const hubIds = await resolveHubs({ factory, district, city, area, hub });
        if (hubIds) {
            query.hub = { $in: hubIds };
        }

        if (serviceArea) query.serviceArea = serviceArea;
        if (stockPoint) query.deliveryPoints = stockPoint;
        if (deliveryBoy) query.deliveryBoy = deliveryBoy;

        if (search) {
            const searchRegex = new RegExp(search, "i");
            const orConditions = [
                { name: searchRegex },
                { mobile: searchRegex },
                { email: searchRegex },
                { "address.houseNo": searchRegex },
                { "address.floor": searchRegex },
                { "address.area": searchRegex },
                { "address.landmark": searchRegex },
                { "address.fullAddress": searchRegex },
                { "address.address": searchRegex },
            ];

            if (require("mongoose").isValidObjectId(search)) {
                orConditions.push({ _id: search });
            }

            query.$or = orConditions;
        }

        const customers = await User.find(query)
            .populate("factory", "name")
            .populate("district", "name")
            .populate("city", "name")
            .populate("hub", "name")
            .populate("area", "name")
            .populate("serviceArea", "name")
            .populate("deliveryPoints", "name")
            .populate("deliveryBoy", "name")
            .sort({ createdAt: -1 })
            .lean();

        const Subscription = require("../models/Subscription");
        const enrichedCustomers = await Promise.all(customers.map(async (customer) => {
            const subs = await Subscription.find({ user: customer._id }).lean();
            return {
                ...customer,
                brilliantStatus: getRichStatus(customer, subs),
                hasActiveSub: subs.some(s => s.status === "active" && !s.isTrial),
                hasActiveTrial: subs.some(s => s.status === "active" && s.isTrial),
                hasEndedTrial: subs.some(s => s.isTrial) && !subs.some(s => s.status === "active"),
                hasAnySub: subs.length > 0
            };
        }));

        res.status(200).json({ success: true, result: enrichedCustomers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        let customer;

        const mongoose = require("mongoose");
        const Subscription = require("../models/Subscription");

        const query = mongoose.isValidObjectId(id) ? { _id: id } : { customerId: id };

        customer = await User.findOne(query)
            .populate("factory", "name")
            .populate("district", "name")
            .populate("city", "name")
            .populate("hub", "name")
            .populate("area", "name")
            .populate("serviceArea", "name")
            .populate("deliveryPoints", "name")
            .populate("deliveryBoy", "name")
            .lean();

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const subs = await Subscription.find({ user: customer._id }).lean();
        customer.brilliantStatus = getRichStatus(customer, subs);

        res.status(200).json({ success: true, result: customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Build address object if address fields are provided
        if (updateData.houseNo !== undefined || updateData.floor !== undefined || updateData.area !== undefined || updateData.landmark !== undefined) {
            updateData['address.houseNo'] = updateData.houseNo;
            updateData['address.floor'] = updateData.floor;
            updateData['address.area'] = updateData.area;
            updateData['address.landmark'] = updateData.landmark;
            updateData['address.fullAddress'] = `${updateData.houseNo || ""} ${updateData.floor || ""} ${updateData.area || ""} ${updateData.landmark || ""}`.trim();

            // Clean up flat fields
            delete updateData.houseNo;
            delete updateData.floor;
            delete updateData.area;
            delete updateData.landmark;
        }

        if (updateData.latitude && updateData.longitude) {
            updateData['address.location'] = {
                type: "Point",
                coordinates: [parseFloat(updateData.longitude), parseFloat(updateData.latitude)]
            };
            delete updateData.latitude;
            delete updateData.longitude;
        }

        // Sanitize Empty Fields (ObjectIds and Unique Strings) to null
        const objectIdFields = ["deliveryBoy", "area", "city", "district", "serviceArea", "factory", "hub", "stockPoint", "distributor", "referredBy"];
        objectIdFields.forEach(field => {
            if (updateData[field] === "") updateData[field] = null;
        });

        let unsetFields = {};
        if (updateData.referralCode === "" || updateData.referralCode === null) {
            unsetFields.referralCode = 1;
            delete updateData.referralCode;
        }
        if (updateData.email === "" || updateData.email === null) {
            unsetFields.email = 1;
            delete updateData.email;
        }

        if (updateData.dateOfBirth === "") updateData.dateOfBirth = null;

        // AUTO-ASSIGN LOGISTICS
        const newLocation = updateData['address.location'] || updateData.address?.location || (updateData["address.location.coordinates"] ? { type: "Point", coordinates: updateData["address.location.coordinates"] } : null);

        if (newLocation && newLocation.coordinates && newLocation.coordinates.length === 2) {
            const [lng, lat] = newLocation.coordinates;
            const matchedServiceArea = await ServiceArea.findOne({
                isActive: true,
                polygon: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lng, lat] } } }
            }).populate("area");

            if (matchedServiceArea) {
                updateData.serviceArea = matchedServiceArea._id;
                if (matchedServiceArea.area) {
                    const areaDoc = await Area.findById(matchedServiceArea.area._id).populate({
                        path: "hub",
                        populate: { path: "city", populate: { path: "district", populate: { path: "factory" } } }
                    });

                    if (areaDoc) {
                        updateData.area = areaDoc._id;
                        if (areaDoc.hub) {
                            updateData.hub = areaDoc.hub._id;
                            if (areaDoc.hub.city) {
                                updateData.city = areaDoc.hub.city._id;
                                if (areaDoc.hub.city.district) {
                                    updateData.district = areaDoc.hub.city.district._id;
                                    if (areaDoc.hub.city.district.factory) updateData.factory = areaDoc.hub.city.district.factory._id;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Handle deliveryPreferences - convert to dot notation for nested update
        if (updateData.deliveryPreferences) {
            const prefs = updateData.deliveryPreferences;
            for (const day of Object.keys(prefs)) {
                updateData[`deliveryPreferences.${day}`] = prefs[day];
            }
            delete updateData.deliveryPreferences;
        }

        const options = { new: true, runValidators: true };
        const updateQuery = { $set: updateData };
        if (Object.keys(unsetFields).length > 0) {
            updateQuery.$unset = unsetFields;
        }

        if (updateData.role === "CUSTOMER") {
            const existingUser = mongoose.isValidObjectId(id) ? await User.findById(id) : await User.findOne({ customerId: id });
            if (existingUser && !existingUser.customerId) {
                const Counter = require("../models/Counter");
                updateQuery.$set.customerId = await Counter.getNextSequence("customerId");
            }
        }

        let customer;
        if (mongoose.isValidObjectId(id)) {
            customer = await User.findByIdAndUpdate(id, updateQuery, options).populate("deliveryBoy", "name");
        } else {
            customer = await User.findOneAndUpdate({ customerId: id }, updateQuery, options).populate("deliveryBoy", "name");
        }

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        // Notify Admins on Status Change
        if (req.body.isActive !== undefined || req.body.tempCustomerStatus) {
            const admins = await User.find({ role: { $in: ["SUPERADMIN", "ADMIN", "CUSTOMER_RELATIONS"] } });
            let message = `Customer ${customer.name} updated.`;
            if (req.body.isActive !== undefined) message = `Customer ${customer.name} is now ${req.body.isActive ? 'Active' : 'Inactive'}`;
            if (req.body.tempCustomerStatus) message = `Customer ${customer.name} status: ${req.body.tempCustomerStatus}`;

            for (const admin of admins) {
                await createNotification({
                    recipient: admin._id,
                    title: "Customer Status Update",
                    message,
                    type: "warning",
                    link: `/administrator/dashboard/customer/${customer._id}`
                });
            }
        }

        // Log the activity
        await logAction(customer._id, "CUSTOMER", "UPDATE_PROFILE", `Customer profile updated by ${req.user ? req.user.name : "System"}`, {
            updatedFields: Object.keys(req.body),
            changedBy: req.user ? req.user._id : null
        }, req);

        res.status(200).json({ success: true, result: customer, message: "Customer updated successfully" });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCustomerByMobile = async (req, res) => {
    try {
        const { mobile } = req.params;
        const customer = await User.findOne({ mobile, role: { $in: ["CUSTOMER", "LEAD"] } })
            .select("name mobile walletBalance unbilledConsumption"); // Select only necessary fields for security

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        res.status(200).json({ success: true, result: customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCustomerSummary = async (req, res) => {
    try {
        const Subscription = require("../models/Subscription");
        const Order = require("../models/Order");
        const mongoose = require("mongoose");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        let baseQuery = { role: { $in: ["CUSTOMER", "LEAD"] } };
        baseQuery = scopeCustomerFilter(req.scope, baseQuery);

        // Fetch user segments concurrently for business logic
        const [
            allCustomers,
            activeSubscriptionUserIds,
            activeTrialUserIds,
            allSubscribedUserIds,
            trialUserIds,
            vacationUserIds,
            newTodayCount,
            last7DaysCount,
            suspendedCount,
            lowBalanceCount
        ] = await Promise.all([
            User.find(baseQuery).select("_id"),
            Subscription.distinct("user", { status: "active", isTrial: false }),
            Subscription.distinct("user", { status: "active", isTrial: true }),
            Subscription.distinct("user"), // Anyone who ever had a plan
            Subscription.distinct("user", { isTrial: true }), // Anyone who ever had a trial
            User.distinct("_id", { ...baseQuery, "vacation.isActive": true }),
            User.countDocuments({ ...baseQuery, createdAt: { $gte: today } }),
            User.countDocuments({ ...baseQuery, createdAt: { $gte: sevenDaysAgo } }),
            User.countDocuments({ ...baseQuery, tempCustomerStatus: "Suspended" }),
            // Low balance: simplified to balance < 100 (proxy for ~2 days) or negative
            User.countDocuments({ ...baseQuery, walletBalance: { $lt: 100 } }),
        ]);

        const validCustomerIds = new Set(allCustomers.map(c => c._id.toString()));

        const activeUserIdsSet = new Set(
            [...activeSubscriptionUserIds, ...activeTrialUserIds]
                .map(id => id.toString())
                .filter(id => validCustomerIds.has(id))
        );

        const allSubscribedIdsSet = new Set(
            allSubscribedUserIds
                .map(id => id.toString())
                .filter(id => validCustomerIds.has(id))
        );

        const vacationIdsSet = new Set(
            vacationUserIds
                .map(id => id.toString())
                .filter(id => validCustomerIds.has(id))
        );

        // Logic based on User definitions:
        // 1. Total: All customers
        const totalCustomers = allCustomers.length;

        // 2. Active: Subscribers + Trial Running
        const active = activeUserIdsSet.size;

        // 3. Inactive: Sub paused/stopped but NOT on vacation
        // (Must have had a sub before, not currently active, not on vacation)
        const inactive = allCustomers.filter(c =>
            allSubscribedIdsSet.has(c._id.toString()) &&
            !activeUserIdsSet.has(c._id.toString()) &&
            !vacationIdsSet.has(c._id.toString())
        ).length;

        // 4. No Plan: Signed up but no plan or trial started yet
        const noPlan = allCustomers.filter(c => !allSubscribedIdsSet.has(c._id.toString())).length;

        // 5. Normal Sub Running (Only active, non-trial)
        const subRunning = activeSubscriptionUserIds
            .map(id => id.toString())
            .filter(id => validCustomerIds.has(id)).length;

        // 6. Trial Running
        const trialRunning = activeTrialUserIds
            .map(id => id.toString())
            .filter(id => validCustomerIds.has(id)).length;

        // 7. Trial Ended / Not Converted: Had trial but no active trial AND no active sub
        const trialEnded = trialUserIds
            .map(id => id.toString())
            .filter(id => validCustomerIds.has(id) && !activeUserIdsSet.has(id)).length;

        res.status(200).json({
            success: true,
            result: {
                totalCustomers,
                active,
                inactive,
                onVacation: vacationUserIds.length,
                newCustomers: newTodayCount,
                suspended: suspendedCount,
                suspendedLowBalance: lowBalanceCount, // Low balance label
                subRunning,
                noPlan,
                trialRunning,
                trialEnded,
                notConverted: trialEnded,
                last7Days: last7DaysCount,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTempOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require("mongoose");
        const query = mongoose.isValidObjectId(id) ? { _id: id } : { customerId: id };

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        // If OTP exists and not expired, return it. Otherwise generate new.
        let otp = user.otp;
        if (!otp || !user.otpExpires || user.otpExpires < Date.now()) {
            otp = Math.floor(1000 + Math.random() * 9000).toString();
            user.otp = otp;
            user.otpExpires = Date.now() + 30 * 60 * 1000; // 30 mins for temp otp
            await user.save();
        }

        res.status(200).json({ success: true, result: otp });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.mergeCustomers = async (req, res) => {
    try {
        const { sourceId, targetId } = req.body;
        if (!sourceId || !targetId) {
            return res.status(400).json({ success: false, message: "Source and Target IDs are required" });
        }

        if (sourceId === targetId) {
            return res.status(400).json({ success: false, message: "Cannot merge a customer into themselves" });
        }

        const source = await User.findById(sourceId);
        const target = await User.findById(targetId);

        if (!source || !target) {
            return res.status(404).json({ success: false, message: "One or both customers not found" });
        }

        const Subscription = require("../models/Subscription");
        const Order = require("../models/Order");
        const Transaction = require("../models/Transaction");

        // 1. Transfer Wallet Balance
        const balanceToTransfer = source.walletBalance || 0;
        target.walletBalance = (target.walletBalance || 0) + balanceToTransfer;
        source.walletBalance = 0;

        // 2. Reassign Subscriptions
        await Subscription.updateMany({ user: sourceId }, { user: targetId });

        // 3. Reassign Orders
        await Order.updateMany({ customer: sourceId }, { customer: targetId });

        // 4. Reassign Transactions
        await Transaction.updateMany({ user: sourceId }, { user: targetId });

        // 5. Deactivate Source
        source.isActive = false;
        source.notes = (source.notes || "") + `\n[System] Merged into ${target.name} (${target._id}) on ${new Date().toLocaleDateString()}`;

        await target.save();
        await source.save();

        // Log Activity
        await logAction(targetId, "ADMIN", "MERGE_CUSTOMER", `Merged account ${source.name} into this account`, { sourceId }, req);

        res.status(200).json({ success: true, message: "Customers merged successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.uploadCustomers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded. Please upload a valid CSV or Excel file." });
        }

        const xlsx = require("xlsx");
        let workbook;
        try {
            workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        } catch (err) {
            return res.status(400).json({ success: false, message: "Failed to parse file. Please ensure it is a valid Excel or CSV file." });
        }

        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) {
            return res.status(400).json({ success: false, message: "File is empty or incorrectly formatted." });
        }

        let addedCount = 0;
        let updatedCount = 0;
        let skipCount = 0;
        let errors = [];

        for (const [index, row] of data.entries()) {
            try {
                const getFieldValue = (r, ...keys) => {
                    const rowKeys = Object.keys(r);
                    for (const key of keys) {
                        const lowerTarget = key.toLowerCase().trim();
                        for (const rKey of rowKeys) {
                            if (rKey.toLowerCase().trim() === lowerTarget) {
                                const val = r[rKey];
                                if (val !== undefined && val !== null && String(val).trim() !== "") {
                                    return val;
                                }
                            }
                        }
                    }
                    return undefined;
                };

                let rawId = getFieldValue(row, "Id", "customerId", "Customer Id", "Customer ID", "Customer");
                let id = (rawId !== undefined && !isNaN(parseInt(rawId))) ? parseInt(rawId) : undefined;
                
                let rawSubId = getFieldValue(row, "Sub. Id", "Subscription Id", "subId");
                let subId = (rawSubId !== undefined && !isNaN(parseInt(rawSubId))) ? parseInt(rawSubId) : undefined;
                
                let mobile = getFieldValue(row, "Mobile", "number", "Phone Number", "phone", "Mobile Number", "Alternate Mobile", "alternateMobile", "Contact", "Contact Number");

                if (mobile === undefined && id === undefined && subId === undefined) {
                    errors.push(`Row ${index + 2}: Missing contact, customer ID, and Sub. Id`);
                    skipCount++;
                    continue;
                }

                if (mobile !== undefined) mobile = String(mobile).trim();

                let userExists = null;
                const Subscription = require("../models/Subscription");
                
                if (id !== undefined) {
                    userExists = await User.findOne({ customerId: id });
                }
                if (!userExists && mobile) {
                    userExists = await User.findOne({ mobile });
                }
                if (!userExists && subId !== undefined) {
                    const sub = await Subscription.findOne({ subscriptionId: subId }).populate("user");
                    if (sub && sub.user) {
                        userExists = sub.user;
                    }
                }

                // Extract other fields matching the export system
                let name = getFieldValue(row, "Name", "Full Name", "firstName", "Customer Name", "Customer_1", "Customer_2", "Customer");
                let email = getFieldValue(row, "Email Id", "Email ID", "email", "Email");
                let addressStr = getFieldValue(row, "Address", "Full Address", "Location");
                let walletBalanceStr = getFieldValue(row, "Wallet Balance", "Effective Wallet Balance", "Wallet", "walletBalance", "wallet_balance", "Wallet Bal", "Effective E", "Effective Bal");
                let statusStr = getFieldValue(row, "Status", "Sub. Status", "Sub Status", "isActive");
                let isBlockedStr = getFieldValue(row, "Is Blocked", "isBlocked");
                let tempStatusStr = getFieldValue(row, "Temp Customer Status", "Temp Status", "temporaryStatus");
                let totalOrdersStr = getFieldValue(row, "Total Orders");
                let unbilledConsumptionStr = getFieldValue(row, "Current Consumption", "unbilledConsumption");
                let areaStr = getFieldValue(row, "Area", "area");
                let timeSlotStr = getFieldValue(row, "Time Slot", "timeSlot", "deliveryShift");

                let customerData = {};

                if (timeSlotStr !== undefined) {
                    let ts = String(timeSlotStr).trim().toLowerCase();
                    if (ts.includes("morning") || ts === "m") customerData.deliveryShift = "Morning";
                    else if (ts.includes("evening") || ts === "e") customerData.deliveryShift = "Evening";
                }

                if (id !== undefined && !isNaN(parseInt(id))) customerData.customerId = parseInt(id);
                if (name) customerData.name = name;
                if (mobile) customerData.mobile = mobile;
                if (email !== undefined) customerData.email = email;

                if (statusStr !== undefined) {
                    let s = String(statusStr).toLowerCase();
                    if (s === 'active' || s === 'true' || s === 'yes' || s === '1') customerData.isActive = true;
                    if (s === 'inactive' || s === 'false' || s === 'no' || s === '0') customerData.isActive = false;
                }
                if (isBlockedStr !== undefined) {
                    let b = String(isBlockedStr).toLowerCase();
                    if (b === 'yes' || b === 'true' || b === '1') customerData.isActive = false; // Blocked means inactive
                    if (b === 'no' || b === 'false' || b === '0') customerData.isActive = true;
                }

                if (tempStatusStr !== undefined) customerData.temporaryStatus = String(tempStatusStr);

                if (totalOrdersStr !== undefined && !isNaN(parseInt(totalOrdersStr))) {
                    customerData.totalOrders = parseInt(totalOrdersStr);
                }
                if (unbilledConsumptionStr !== undefined && !isNaN(parseFloat(unbilledConsumptionStr))) {
                    customerData.unbilledConsumption = parseFloat(unbilledConsumptionStr);
                }

                if (addressStr || areaStr) {
                    // Try to preserve existing location if updating
                    if (userExists && userExists.address && userExists.address.location) {
                        customerData.address = {
                            fullAddress: addressStr || userExists.address.fullAddress || "",
                            area: areaStr || userExists.address.area || "",
                            location: userExists.address.location
                        };
                    } else {
                        customerData.address = {
                            fullAddress: addressStr || "",
                            area: areaStr || "",
                            location: { type: "Point", coordinates: [77.4119, 8.1833] } // Default fallback coordinates
                        };
                    }
                }

                if (walletBalanceStr !== undefined) {
                    let walletBalance;
                    if (typeof walletBalanceStr === 'number') {
                        walletBalance = walletBalanceStr;
                    } else {
                        let str = String(walletBalanceStr);
                        let isNegative = str.includes('-') || (str.includes('(') && str.includes(')'));
                        let stripped = str.replace(/[^0-9.]+/g, "");
                        let parsed = parseFloat(stripped);
                        if (!isNaN(parsed)) {
                            walletBalance = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
                        }
                    }

                    if (walletBalance !== undefined && !isNaN(walletBalance)) {
                        customerData.walletBalance = walletBalance;
                    }
                }

                if (userExists) {
                    // Update existing
                    await User.findByIdAndUpdate(userExists._id, customerData);
                    updatedCount++;
                } else if (Object.keys(customerData).length > 0 && (mobile || id)) {
                    // Create new
                    customerData.role = "CUSTOMER";
                    if (!customerData.name) customerData.name = `Customer ${mobile || id}`;
                    if (!customerData.address) {
                        customerData.address = { location: { type: "Point", coordinates: [77.4119, 8.1833] } };
                    }
                    if (id && !isNaN(parseInt(id))) customerData.customerId = parseInt(id);

                    userExists = await User.create(customerData);
                    addedCount++;
                }

                // Sub. Id updates specifically for Subscription
                if (subId !== undefined) {
                    let subStatus = null;
                    if (statusStr !== undefined) {
                        let s = String(statusStr).toLowerCase();
                        if (s === 'active' || s === 'true' || s === 'yes' || s === '1') subStatus = 'active';
                        else if (s === 'paused') subStatus = 'paused';
                        else if (s === 'cancelled' || s === 'inactive' || s === 'false' || s === 'no' || s === '0') subStatus = 'cancelled';
                        else if (s === 'pending') subStatus = 'pending';
                    }
                    let subUpdate = {};
                    if (subStatus) subUpdate.status = subStatus;
                    
                    if (Object.keys(subUpdate).length > 0) {
                        await Subscription.findOneAndUpdate({ subscriptionId: subId }, subUpdate);
                    }
                }
            } catch (err) {
                errors.push(`Row ${index + 2}: ${err.message}`);
                skipCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully imported ${addedCount} new customers and updated ${updatedCount}. Skipped: ${skipCount}.`,
            errors,
            addedCount,
            updatedCount,
            skipCount
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: "Failed to process the uploaded file." });
    }
};
