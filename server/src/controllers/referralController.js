const Referral = require("../models/Referral");
const User = require("../models/User");
const Settings = require("../models/Settings");
const Transaction = require("../models/Transaction");

// Generate referral code: First 4 chars of name + last 2 digits of mobile
const generateReferralCode = (name, mobile) => {
    const namePart = (name || "USER")
        .toUpperCase()
        .replace(/[^A-Z]/g, "") // Remove non-alphabetic chars
        .padEnd(4, "X") // Pad with X if less than 4 chars
        .substring(0, 4); // Take first 4 chars

    const mobilePart = (mobile || "00").slice(-2); // Last 2 digits

    return `${namePart}${mobilePart}`;
};

// Get or create user's referral code
const getMyReferralCode = async (req, res) => {
    try {
        const userId = req.user.id;
        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Generate code if not exists
        if (!user.referralCode) {
            let code = generateReferralCode(user.name, user.mobile);

            // Check for uniqueness, append number if needed
            let existing = await User.findOne({ referralCode: code });
            let counter = 1;
            while (existing) {
                code = `${generateReferralCode(user.name, user.mobile)}${counter}`;
                existing = await User.findOne({ referralCode: code });
                counter++;
            }

            user.referralCode = code;
            await user.save();
        }

        // Get referral settings
        const settings = await Settings.getSettings();
        const referralSettings = settings.referral || {};

        res.json({
            success: true,
            result: {
                referralCode: user.referralCode,
                referralLink: `https://stoimilk.com/signup?ref=${user.referralCode}`,
                settings: {
                    referrerReward: referralSettings.referrerReward || 50,
                    refereeReward: referralSettings.refereeReward || 50,
                    enabled: referralSettings.enabled !== false,
                    shareMessage: referralSettings.shareMessage || "🥛 Join STOI Milk and get ₹{{REFEREE_REWARD}} on your first order! Use my referral code: {{CODE}}\n\n{{LINK}}",
                },
            },
        });
    } catch (error) {
        console.error("Error getting referral code:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Apply referral code when signing up
const applyReferralCode = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const userId = req.user.id;

        if (!referralCode) {
            return res.status(400).json({ success: false, message: "Referral code required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if user already has a referrer
        if (user.referredBy) {
            return res.status(400).json({ success: false, message: "You have already used a referral code" });
        }

        // Find referrer by code
        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (!referrer) {
            return res.status(404).json({ success: false, message: "Invalid referral code" });
        }

        // Can't refer yourself
        if (referrer._id.toString() === userId) {
            return res.status(400).json({ success: false, message: "You cannot use your own referral code" });
        }

        // Get settings
        const settings = await Settings.getSettings();
        const referralSettings = settings.referral || {};

        if (!referralSettings.enabled) {
            return res.status(400).json({ success: false, message: "Referral program is currently disabled" });
        }

        // Check max referrals limit
        if (referralSettings.maxReferralsPerUser > 0 && referrer.totalReferrals >= referralSettings.maxReferralsPerUser) {
            return res.status(400).json({ success: false, message: "Referrer has reached maximum referral limit" });
        }

        // Calculate expiry date
        const expiryDays = referralSettings.expiryDays || 30;
        const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

        // Create referral record
        const referral = await Referral.create({
            referrer: referrer._id,
            referee: user._id,
            referralCode: referralCode.toUpperCase(),
            status: "pending",
            referrerReward: referralSettings.referrerReward || 50,
            refereeReward: referralSettings.refereeReward || 50,
            expiresAt,
        });

        // Update user with referrer
        user.referredBy = referrer._id;
        await user.save();

        // If minOrdersForReward is 0, reward immediately
        if (referralSettings.minOrdersForReward === 0) {
            await processReferralReward(referral._id);
        }

        res.json({
            success: true,
            message: `Referral code applied! You'll receive ₹${referralSettings.refereeReward} after ${referralSettings.minOrdersForReward || 1} order(s).`,
            result: referral,
        });
    } catch (error) {
        console.error("Error applying referral code:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Process referral reward (called after conditions are met)
const processReferralReward = async (referralId) => {
    try {
        const referral = await Referral.findById(referralId).populate("referrer referee");
        if (!referral || referral.status !== "pending") {
            return false;
        }

        const settings = await Settings.getSettings();
        const rewardType = settings.referral?.rewardType || "wallet";

        // Credit referrer
        if (!referral.referrerRewarded && referral.referrerReward > 0) {
            if (rewardType === "wallet") {
                const referrer = await User.findByIdAndUpdate(referral.referrer._id, {
                    $inc: {
                        walletBalance: referral.referrerReward,
                        referralEarnings: referral.referrerReward,
                        totalReferrals: 1,
                    },
                }, { new: true });

                // Create Transaction for Referrer
                await Transaction.create({
                    user: referral.referrer._id,
                    amount: referral.referrerReward,
                    type: "CREDIT",
                    mode: "ADJUSTMENT",
                    status: "SUCCESS",
                    description: "Referral Reward",
                    balanceAfter: referrer.walletBalance
                });
            }
            referral.referrerRewarded = true;
            referral.referrerRewardedAt = new Date();
        }

        // Credit referee
        if (!referral.refereeRewarded && referral.refereeReward > 0) {
            if (rewardType === "wallet") {
                const referee = await User.findByIdAndUpdate(referral.referee._id, {
                    $inc: { walletBalance: referral.refereeReward },
                }, { new: true });

                // Create Transaction for Referee
                await Transaction.create({
                    user: referral.referee._id,
                    amount: referral.refereeReward,
                    type: "CREDIT",
                    mode: "ADJUSTMENT",
                    status: "SUCCESS",
                    description: "Referral Bonus",
                    balanceAfter: referee.walletBalance
                });
            }
            referral.refereeRewarded = true;
            referral.refereeRewardedAt = new Date();
        }

        referral.status = "completed";
        await referral.save();

        // --- MILESTONE REWARD CHECK ---
        const referrerId = referral.referrer._id;
        const referrer = await User.findById(referrerId);
        if (referrer) {
            const milestones = [5, 10, 25, 50, 100];
            const currentTotal = referrer.totalReferrals; // Already updated in previous block
            
            for (const m of milestones) {
                // Check if they hit exactly this milestone AND haven't been rewarded yet
                const alreadyRewarded = referrer.milestoneRewards?.some(mr => mr.milestone === m && mr.rewarded);
                
                if (currentTotal >= m && !alreadyRewarded) {
                    const milestoneBonus = m === 5 ? 250 : (m === 10 ? 500 : 1000); // Incremental bonuses
                    
                    referrer.walletBalance += milestoneBonus;
                    referrer.milestoneRewards = referrer.milestoneRewards || [];
                    referrer.milestoneRewards.push({
                        milestone: m,
                        rewarded: true,
                        rewardDate: new Date()
                    });
                    
                    await referrer.save();

                    // Create Milestone Transaction
                    const Transaction = require("../models/Transaction");
                    await Transaction.create({
                        user: referrer._id,
                        amount: milestoneBonus,
                        type: "CREDIT",
                        mode: "ADJUSTMENT",
                        status: "SUCCESS",
                        description: `Referral Milestone Bonus (${m} Referrals Hit!)`,
                        balanceAfter: referrer.walletBalance
                    });

                    // Notify them
                    const { createNotification } = require("./notificationController");
                    await createNotification({
                        recipient: referrer._id,
                        title: "🎉 Super Ambassador Reward!",
                        message: `Congratulations! You've referred ${m} friends. We've added a ₹${milestoneBonus} bonus to your wallet. Keep spreading the word!`,
                        type: "success",
                        link: "/dashboard/referrals"
                    });
                    
                    console.log(`[Referral] Milestone ${m} hit for user ${referrer.name}`);
                }
            }
        }

        return true;
    } catch (error) {
        console.error("Error processing referral reward:", error);
        return false;
    }
};

// Get user's referral stats
const getReferralStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        // Get all referrals made by this user
        const referrals = await Referral.find({ referrer: userId })
            .populate("referee", "name mobile createdAt")
            .sort({ createdAt: -1 });

        const stats = {
            totalReferrals: user.totalReferrals || 0,
            totalEarnings: user.referralEarnings || 0,
            pendingReferrals: referrals.filter(r => r.status === "pending").length,
            completedReferrals: referrals.filter(r => r.status === "completed").length,
            referrals: referrals.map(r => ({
                id: r._id,
                refereeName: r.referee?.name || "Unknown",
                refereeMobile: r.referee?.mobile ? `****${r.referee.mobile.slice(-4)}` : "",
                status: r.status,
                reward: r.referrerReward,
                rewarded: r.referrerRewarded,
                createdAt: r.createdAt,
            })),
        };

        res.json({ success: true, result: stats });
    } catch (error) {
        console.error("Error getting referral stats:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Admin: Get all referrals
const getAllReferrals = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const query = {};
        if (status) query.status = status;

        const referrals = await Referral.find(query)
            .populate("referrer", "name mobile")
            .populate("referee", "name mobile")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Referral.countDocuments(query);

        // Get summary stats
        const stats = await Referral.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalReferrerReward: { $sum: { $cond: ["$referrerRewarded", "$referrerReward", 0] } },
                    totalRefereeReward: { $sum: { $cond: ["$refereeRewarded", "$refereeReward", 0] } },
                },
            },
        ]);

        res.json({
            success: true,
            result: {
                referrals,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
                stats,
            },
        });
    } catch (error) {
        console.error("Error getting all referrals:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    generateReferralCode,
    getMyReferralCode,
    applyReferralCode,
    processReferralReward,
    getReferralStats,
    getAllReferrals,
};
