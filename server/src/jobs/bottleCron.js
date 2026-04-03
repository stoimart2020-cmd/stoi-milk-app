const cron = require('node-cron');
const User = require('../models/User');
const Product = require('../models/Product');
const BottleTransaction = require('../models/BottleTransaction');
const Transaction = require('../models/Transaction');
const { createNotification } = require('../controllers/notificationController');

/**
 * Sunday Penalty Job
 * Runs every Sunday at 23:59 IST
 * Identifies unreturned bottles and deducts charges from customer wallets.
 */
const processSundayBottlePenalties = async () => {
    console.log('[BOTTLE-CRON] Starting Sunday Bottle Penalty Job...');
    
    try {
        // Find all users with pending bottles
        const users = await User.find({ 
            remainingBottles: { $gt: 0 },
            isActive: true 
        });

        console.log(`[BOTTLE-CRON] Found ${users.length} users with pending bottles.`);

        let totalPenalizedItems = 0;
        let totalDeductions = 0;

        for (const user of users) {
            let userDeduction = 0;
            let penalizedAny = false;

            for (const balance of user.bottleBalances) {
                const newPenaltyQty = balance.pending - balance.penalized;
                
                if (newPenaltyQty > 0) {
                    const product = await Product.findById(balance.product);
                    if (!product || product.unreturnedBottleCharge <= 0) continue;

                    const penaltyAmount = newPenaltyQty * product.unreturnedBottleCharge;
                    
                    // 1. Log Bottle Transaction
                    await BottleTransaction.create({
                        customer: user._id,
                        product: product._id,
                        type: 'unreturned_penalty',
                        quantity: newPenaltyQty,
                        penaltyAmount: penaltyAmount,
                        notes: 'Automated Sunday penalty for unreturned bottles',
                        recordedBy: null // System generated
                    });

                    // 2. Update balance
                    balance.penalized += newPenaltyQty;
                    userDeduction += penaltyAmount;
                    penalizedAny = true;
                    totalPenalizedItems++;
                }
            }

            if (userDeduction > 0) {
                // 3. Deduct from wallet
                user.walletBalance -= userDeduction;
                await user.save();

                // 4. Log Wallet Transaction
                await Transaction.create({
                    user: user._id,
                    amount: userDeduction,
                    type: 'DEBIT',
                    mode: 'WALLET',
                    status: 'SUCCESS',
                    description: 'Unreturned Bottle Penalty (Sunday automated)',
                    balanceAfter: user.walletBalance
                });

                // 5. Notify User
                await createNotification({
                    recipient: user._id,
                    title: "Bottle Penalty Charged",
                    message: `A penalty of ₹${userDeduction} has been deducted from your wallet for unreturned bottles. Return them to get a refund!`,
                    type: "warning",
                    link: "/customer/wallet"
                });

                totalDeductions += userDeduction;
            } else if (penalizedAny) {
                await user.save();
            }
        }

        console.log(`[BOTTLE-CRON] Job Completed. Penalized Items: ${totalPenalizedItems}, Total Deductions: ₹${totalDeductions}`);

    } catch (error) {
        console.error('[BOTTLE-CRON] Fatal Error in Sunday Penalty Job:', error);
    }
};

// Schedule the job: Sunday 23:59 IST
// Cron: 59 23 * * 0
const initBottleCron = () => {
    cron.schedule('59 23 * * 0', processSundayBottlePenalties, {
        timezone: 'Asia/Kolkata'
    });
    console.log('✅ [BOTTLE-CRON] Sunday Penalty Job scheduled for 23:59 IST');
};

module.exports = {
    initBottleCron,
    processSundayBottlePenalties // Exported for manual trigger/testing
};
