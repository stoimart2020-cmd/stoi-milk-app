const User = require("../models/User");
const Employee = require("../models/Employee");
const Settings = require("../models/Settings");
const jwt = require("jsonwebtoken");
const { createNotification } = require("./notificationController");
const { sendOtp, sendWelcome } = require("../utils/notification");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
        expiresIn: "30d",
    });
};

exports.sendOtp = async (req, res) => {
    console.log("sendOtp called with body:", req.body);
    const { mobile: rawMobile } = req.body;
    const mobile = String(rawMobile);
    if (mobile === "admin") {
        return res.status(200).json({ success: true, message: "OTP sent successfully" });
    }
    try {
        let otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Development / Test Accounts
        if (mobile === "9876543210" || mobile === "admin") {
            otp = "1234";
        }

        let user = await Employee.findOne({ mobile });

        if (!user) {
            // Check if it's a customer
            user = await User.findOne({ mobile });
        }

        if (!user) {
            user = await User.create({
                mobile,
                address: {
                    location: {
                        type: "Point",
                        coordinates: [77.4119, 8.1833] // Default Nagercoil
                    }
                }
            });
        }

        // If user is an Employee, ensure they also exist in User collection for dual-role support
        if (user instanceof Employee) {
            const shadowUser = await User.findById(user._id);
            if (!shadowUser) {
                await User.create({
                    _id: user._id,
                    mobile: user.mobile,
                    name: user.name,
                    role: user.role,
                    isActive: true
                });
            }
        }

        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save();

        // Send SMS
        if (mobile !== "admin") {
            await sendOtp(mobile, otp);
        }

        res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error in sendOtp:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.firebaseVerifyOtp = async (req, res) => {
    const { idToken, mobile } = req.body;
    try {
        const { admin } = require("../config/firebase");
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Security check: ensure token phone matches submitted mobile
        const tokenPhone = decodedToken.phone_number || "";
        const normalizedMobile = String(mobile).replace(/\D/g, "").slice(-10);
        if (tokenPhone && !tokenPhone.endsWith(normalizedMobile)) {
            return res.status(401).json({ success: false, message: "Phone number mismatch" });
        }

        let user = await User.findOne({ mobile });
        if (!user) {
            user = await Employee.findOne({ mobile });
        }

        const isNewUser = !user;

        if (!user) {
            user = await User.create({
                mobile,
                role: "CUSTOMER",
                isMobileVerified: true,
                address: {
                    location: {
                        type: "Point",
                        coordinates: [77.4119, 8.1833]
                    }
                }
            });
        } else if (user instanceof User) {
            user.isMobileVerified = true;
            await user.save();
        }

        const token = generateToken(user._id);
        res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });

        // Notify admins on new signup
        if (isNewUser) {
            const admins = await User.find({ role: { $in: ["SUPERADMIN", "ADMIN", "CUSTOMER_RELATIONS"] } });
            for (const a of admins) {
                await createNotification({
                    recipient: a._id,
                    title: "New Customer Signup",
                    message: `New customer joined (Firebase): ${mobile}`,
                    type: "success",
                    link: "/administrator/dashboard/customers"
                });
            }
        }

        res.status(200).json({ success: true, result: user, token });

    } catch (error) {
        console.error("Firebase Auth Error:", error);
        res.status(401).json({ success: false, message: "Authentication failed" });
    }
};


exports.verifyOtp = async (req, res) => {
    const mobile = String(req.body.mobile);
    const otp = String(req.body.otp).trim(); // Ensure string and trim
    console.log(`Verifying OTP for ${mobile}, received: '${otp}'`);

    try {
        // Special Admin Bypass for Customer App
        if (mobile === "admin" && otp === "admin") {
            let user = await User.findOne({ mobile: "admin" });
            if (!user) {
                user = await User.create({
                    mobile: "admin",
                    name: "Test Admin",
                    role: "CUSTOMER" // Default role, can be changed to RIDER manually if needed for testing
                });
            }
            const token = generateToken(user._id);
            res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });
            return res.status(200).json({ success: true, result: user, token });
        }

        let user = await Employee.findOne({ mobile });

        if (!user) {
            // Check User
            user = await User.findOne({ mobile });
        }

        // OTP Fallback Logic:
        // 1. Check generated OTP (and expiry)
        // 2. Check Master OTP (from Settings)
        // 3. Check Temporary OTP (per user)
        const settings = await Settings.getSettings();
        const masterOtp = settings.site?.defaultOtp;
        const allowedMobiles = settings.site?.defaultOtpMobileNumbers; // Comma separated or -1

        let isMasterOtpValid = false;
        if (masterOtp && otp === masterOtp) {
            if (allowedMobiles === "-1") {
                isMasterOtpValid = true;
            } else if (allowedMobiles) {
                const mobileList = allowedMobiles.split(",").map(m => m.trim());
                if (mobileList.includes(mobile)) {
                    isMasterOtpValid = true;
                }
            }
        }

        const isTemporaryOtpValid = user.temporaryOtp && otp === user.temporaryOtp;
        const isGeneratedOtpValid = user.otp === otp && user.otpExpires > Date.now();
        const isTestOtp = otp === "1234"; // Legacy test OTP

        const isValid = isGeneratedOtpValid || isMasterOtpValid || isTemporaryOtpValid || isTestOtp;

        if (!user || !isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        if (user instanceof User) {
            user.isMobileVerified = true;
        }

        // Clean up temporary OTP and original OTP on successful login
        user.otp = undefined;
        user.otpExpires = undefined;
        user.temporaryOtp = undefined;

        // FORCE RIDER ROLE FOR TEST USER
        if (mobile === "9876543210" && user.role !== "RIDER") {
            console.log("Forcing RIDER role for test user");
            user.role = "RIDER";
            if (!user.name) user.name = "Test Rider";
        }

        // If user is an Employee, ensure they also exist in User collection for dual-role support
        if (user instanceof Employee) {
            const shadowUser = await User.findById(user._id);
            if (!shadowUser) {
                await User.create({
                    _id: user._id,
                    mobile: user.mobile,
                    name: user.name,
                    role: user.role,
                    isActive: true
                });
            }
        }

        await user.save();

        const token = generateToken(user._id);

        res.cookie("token", token, {
            httpOnly: true,
            // secure: process.env.NODE_ENV === "production", // Uncomment in production
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: "/",
        });

        // Notify Admins on New Signup (if name is not set, assume new)
        if (!user.name) {
            const admins = await User.find({ role: { $in: ["SUPERADMIN", "ADMIN", "CUSTOMER_RELATIONS"] } });
            for (const admin of admins) {
                await createNotification({
                    recipient: admin._id,
                    title: "New Customer Signup",
                    message: `New customer joined: ${mobile}`,
                    type: "success",
                    link: "/administrator/dashboard/customer"
                });
            }
        }

        res.status(200).json({
            success: true,
            result: user,
            token,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.onBoard = async (req, res) => {
    // This assumes the user is already authenticated via middleware (to be added)
    // For now, we might pass mobile or rely on a previous step if not strictly following middleware yet
    // But better to use middleware. Let's assume req.user is set.
    // Or if this is part of the flow where we just verified OTP, we might need to pass ID.
    // Let's stick to the standard flow: Verify OTP -> Get Token -> Call Onboard with Token.

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const isNewUser = !user.name; // Check if this is first-time onboarding

        const {
            name,
            email,
            deliveryPreference,
            dateOfBirth,
            alternateMobile,
            houseNo,
            floor,
            area,
            landmark,
            address, // This is the full address string from form
            location
        } = req.body;

        user.name = name;
        user.email = email;
        user.deliveryPreference = deliveryPreference;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (alternateMobile) user.alternateMobile = alternateMobile;

        // Construct address object
        // Note: Frontend sends location as [lat, lng], MongoDB expects [lng, lat]
        let coordinates = [77.4119, 8.1833]; // Default Nagercoil
        if (location && Array.isArray(location) && location.length === 2) {
            coordinates = [location[1], location[0]];

            // AUTO-ASSIGNMENT LOGIC
            // Find ServiceArea (Delivery Point) covering this location
            const ServiceArea = require("../models/ServiceArea"); // Lazy import or move to top
            const serviceArea = await ServiceArea.findOne({
                isActive: true,
                polygon: {
                    $geoIntersects: {
                        $geometry: {
                            type: "Point",
                            coordinates: coordinates // [lng, lat]
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
                user.serviceArea = serviceArea._id;
                if (serviceArea.area) {
                    user.area = serviceArea.area._id;
                    if (serviceArea.area.city) {
                        user.city = serviceArea.area.city._id;
                        if (serviceArea.area.city.district) {
                            user.district = serviceArea.area.city.district._id;
                            if (serviceArea.area.city.district.factory) {
                                user.factory = serviceArea.area.city.district.factory._id;
                            }
                        }
                    }
                    // Auto-assign Hub
                    const Hub = require("../models/Hub");
                    const matchedHub = await Hub.findOne({ areas: serviceArea.area._id, isActive: true });
                    if (matchedHub) user.hub = matchedHub._id;
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Sorry, we do not serve this area yet. Please select a valid service area."
                });
            }
        }

        user.address = {
            houseNo,
            floor,
            area,
            landmark,
            fullAddress: address,
            location: {
                type: "Point",
                coordinates: coordinates
            }
        };

        await user.save();

        // Send Welcome Message ONLY if it's a new user (first time onboarding)
        if (isNewUser) {
            try {
                await sendWelcome(user);
            } catch (e) {
                console.error("Failed to send welcome SMS", e);
            }
        }

        res.status(200).json({ success: true, message: "Profile updated", result: user });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}


exports.getCurrentUser = async (req, res) => {
    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            user = await Employee.findById(req.user.id).populate("customRole");
        }
        res.status(200).json({ success: true, result: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.superAdminLogin = async (req, res) => {
    const { username, password } = req.body;
    console.log("superAdminLogin attempt:", { username, password });

    try {
        // 1. Check Employee DB for user (allow mobile or email as username)
        const user = await Employee.findOne({
            $or: [{ mobile: username }, { email: username }]
        });

        if (user && user.password && (await user.matchPassword(password))) {
            if (user.isTwoStepEnabled) {
                return res.status(200).json({ 
                    success: true, 
                    requiresPin: true, 
                    mobile: user.mobile,
                    message: "PIN verification required." 
                });
            }

            const token = generateToken(user._id);
            res.cookie("token", token, { httpOnly: true, path: "/" });
            return res.status(200).json({ success: true, token, user });
        }

        // 2. Fallback/Backdoor for "admin" / "admin"
        if (username === "admin" && password === "admin") {
            let adminUser = await Employee.findOne({ role: "SUPERADMIN" });

            if (!adminUser) {
                // Check if user with default admin mobile exists
                adminUser = await Employee.findOne({ mobile: "0000000000" });

                if (adminUser) {
                    // Promote to SUPERADMIN
                    adminUser.role = "SUPERADMIN";
                    adminUser.password = "admin"; // Will be hashed

                    // Ensure valid location for 2dsphere index
                    if (!adminUser.address || !adminUser.address.location || !adminUser.address.location.coordinates || adminUser.address.location.coordinates.length === 0) {
                        adminUser.address = {
                            location: {
                                type: "Point",
                                coordinates: [77.4119, 8.1833]
                            }
                        };
                    }

                    await adminUser.save();
                } else {
                    // Create new Super Admin
                    adminUser = await Employee.create({
                        mobile: "0000000000",
                        role: "SUPERADMIN",
                        name: "Super Admin",
                        password: "admin",
                        address: {
                            location: {
                                type: "Point",
                                coordinates: [77.4119, 8.1833] // Default to Nagercoil
                            }
                        }
                    });
                }
            }

            // Always allow login for admin/admin
            const token = generateToken(adminUser._id);
            res.cookie("token", token, { httpOnly: true, path: "/" });
            return res.status(200).json({ success: true, token, user: adminUser });
        }

        res.status(401).json({ success: false, message: "Invalid credentials" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCurrentAdmin = async (req, res) => {
    try {
        const user = await Employee.findById(req.user.id).populate("customRole");
        if (!user) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.logout = async (req, res) => {
    try {
        // Clear the httpOnly cookie
        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0),
            path: "/",
        });
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ success: false, message: "FCM token required" });
        }

        let user = await User.findById(req.user.id);
        if (!user) {
            user = await Employee.findById(req.user.id);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.fcmToken = fcmToken;
        await user.save();

        res.status(200).json({ success: true, message: "FCM token updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PIN AUTHENTICATION WORKFLOWS ──────────────────────────────────────────

exports.checkUserStatus = async (req, res) => {
    const { mobile } = req.body;
    try {
        if (mobile === "admin") {
            return res.status(200).json({ 
                success: true, 
                exists: true, 
                needsOtp: false, 
                hasPin: true,
                message: "Admin bypass" 
            });
        }
        // Check User model first
        let user = await User.findOne({ mobile });
        
        // If not in User, check Employee model
        if (!user) {
            user = await Employee.findOne({ mobile });
        }

        if (!user) {
            return res.status(200).json({ 
                success: true, 
                exists: false, 
                needsOtp: true,
                message: "New user. Need OTP verification." 
            });
        }

        // For existing users, only need OTP if they have NEITHER a PIN nor a Password
        // This ensures they can set up their security credentials once.
        const hasCredentials = !!(user.pin || user.password);

        res.status(200).json({
            success: true,
            exists: true,
            needsOtp: !hasCredentials, 
            hasPin: !!user.pin,
            hasPassword: !!user.password,
            isTwoStepEnabled: !!user.isTwoStepEnabled,
            isMobileVerified: user.isMobileVerified
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.loginWithPin = async (req, res) => {
    const { mobile, pin } = req.body;
    try {
        let user = await User.findOne({ mobile });
        if (!user) {
            user = await Employee.findOne({ mobile });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.pin) {
            return res.status(400).json({ success: false, message: "PIN not set. Use OTP to login." });
        }

        const isMatch = await user.matchPin(pin);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid PIN" });
        }

        const token = generateToken(user._id);
        res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });

        res.status(200).json({ success: true, result: user, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.setPin = async (req, res) => {
    const { pin } = req.body;
    try {
        if (!pin || pin.length !== 4) {
            return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
        }

        let user = await User.findById(req.user.id);
        if (!user) user = await Employee.findById(req.user.id);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.pin = pin;
        if (user instanceof User) {
            user.isMobileVerified = true;
        }
        await user.save();

        res.status(200).json({ success: true, message: "PIN set successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.changePin = async (req, res) => {
    const { oldPin, newPin, confirmPin } = req.body;
    try {
        if (newPin !== confirmPin) {
            return res.status(400).json({ success: false, message: "New PINs do not match" });
        }
        if (newPin.length !== 4) {
            return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
        }

        let user = await User.findById(req.user.id);
        if (!user) user = await Employee.findById(req.user.id);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const isMatch = await user.matchPin(oldPin);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect old PIN" });
        }

        user.pin = newPin;
        await user.save();

        res.status(200).json({ success: true, message: "PIN changed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyTwoStep = async (req, res) => {
    const { mobile, pin } = req.body;
    try {
        const user = await Employee.findOne({ mobile });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (!user.pin) {
            return res.status(400).json({ success: false, message: "PIN not set for this account." });
        }

        const isMatch = await user.matchPin(pin);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid PIN" });
        }

        const token = generateToken(user._id);
        res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, path: "/" });

        res.status(200).json({ success: true, user, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


