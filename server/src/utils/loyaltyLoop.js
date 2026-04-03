const Referral = require("../models/Referral");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { createNotification } = require("./notification");

/**
 * Checks if this is a customer's first completed order and triggers the referral logic.
 * Should be called right after an order is marked as "delivered" for the first time.
 */
exports.processReferralRewards = async (customerId, performedById) => {
    try {
        // Find if this customer was referred and it's still pending
        const pendingReferral = await Referral.findOne({ 
            referee: customerId, 
            status: "pending" 
        });

        if (!pendingReferral) {
            return false; // Not a referred user or already processed
        }

        const referrer = await User.findById(pendingReferral.referrer);
        const customer = await User.findById(customerId);

        if (!referrer || !customer) return false;

        // 1. Credit Referrer
        if (pendingReferral.referrerReward > 0) {
            referrer.walletBalance = (referrer.walletBalance || 0) + pendingReferral.referrerReward;
            referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;
            referrer.referralEarnings = (referrer.referralEarnings || 0) + pendingReferral.referrerReward;
            await referrer.save();

            await Transaction.create({
                user: referrer._id,
                amount: pendingReferral.referrerReward,
                type: "CREDIT",
                mode: "WALLET",
                status: "SUCCESS",
                description: `Referral Reward: ${customer.name || "A friend"} completed their first delivery.`,
                performedBy: performedById,
                balanceAfter: referrer.walletBalance
            });

            await createNotification({
                recipient: referrer._id,
                title: "Referral Bonus Credited! 🎉",
                message: `You earned ₹${pendingReferral.referrerReward} because your friend completed their first order!`,
                type: "success",
                link: "/wallet"
            });
        }
        
        // 2. Credit Referee (The new customer)
        if (pendingReferral.refereeReward > 0) {
            customer.walletBalance = (customer.walletBalance || 0) + pendingReferral.refereeReward;
            await customer.save();

            await Transaction.create({
                user: customer._id,
                amount: pendingReferral.refereeReward,
                type: "CREDIT",
                mode: "WALLET",
                status: "SUCCESS",
                description: `Welcome Bonus: First delivery completed successfully.`,
                performedBy: performedById,
                balanceAfter: customer.walletBalance
            });

            await createNotification({
                recipient: customer._id,
                title: "Welcome Bonus Credited! 🎁",
                message: `You earned ₹${pendingReferral.refereeReward} as a welcome bonus for completing your first order.`,
                type: "success",
                link: "/wallet"
            });
        }

        // 3. Mark Referral Completed
        pendingReferral.status = "completed";
        pendingReferral.referrerRewarded = true;
        pendingReferral.refereeRewarded = true;
        pendingReferral.referrerRewardedAt = new Date();
        pendingReferral.refereeRewardedAt = new Date();
        await pendingReferral.save();

        console.log(`✅ Automated Loyalty Loop: Credited rewards for referral ${pendingReferral.referralCode}`);
        return true;

    } catch (err) {
        console.error("Automated Loyalty Loop Error:", err);
        return false;
    }
};
