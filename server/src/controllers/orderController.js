const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Settings = require("../models/Settings");
const Transaction = require("../models/Transaction");
const { createNotification } = require("./notificationController");
const { logAction } = require("./activityLogController");
const { resolveHubs } = require("../utils/logisticsHelper");
const { sendInvoiceNotification } = require("../utils/notification");

exports.createOrder = async (req, res) => {
    try {
        const { products, totalAmount, deliveryDate, paymentMode, customerId, bottlesReturned, assignedRider, deliveryBoy, deliverySlot } = req.body;

        // Determine the customer
        let targetCustomerId = req.user._id;

        // If Admin/Employee is creating the order, they must provide customerId
        if (req.user.role !== "CUSTOMER") {
            if (!customerId) {
                return res.status(400).json({ success: false, message: "Customer ID is required when creating order as Admin" });
            }
            targetCustomerId = customerId;
        }

        const customer = await User.findById(targetCustomerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        // --- Cutoff Time Validation ---
        const settings = await Settings.findOne();

        // --- Service Area Validation ---
        if (!customer.serviceArea) {
            // Attempt real-time geo-lookup in case serviceArea wasn't set during address save
            const ServiceArea = require("../models/ServiceArea");
            const coords = customer.address?.location?.coordinates;
            console.log('[createOrder] No serviceArea on customer, checking coordinates:', coords);

            if (coords && coords.length === 2) {
                const matchedArea = await ServiceArea.findOne({
                    isActive: true,
                    polygon: {
                        $geoIntersects: {
                            $geometry: { type: "Point", coordinates: coords }
                        }
                    }
                });

                if (matchedArea) {
                    console.log('[createOrder] Found service area via geo-lookup:', matchedArea.name || matchedArea._id);
                    customer.serviceArea = matchedArea._id;
                    await customer.save();
                } else {
                    console.log('[createOrder] No matching service area found for coords:', coords);
                    return res.status(400).json({
                        success: false,
                        message: "This customer's location is currently outside our active service areas. Orders cannot be placed."
                    });
                }
            } else {
                console.log('[createOrder] Customer has no location coordinates');
                return res.status(400).json({
                    success: false,
                    message: "This customer's location is currently outside our active service areas. Orders cannot be placed."
                });
            }
        }

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: "Products list is required" });
        }

        // Fetch Product Details for per-product validation
        const productIds = products.map(p => p.product);
        const productDetails = await Product.find({ _id: { $in: productIds } });
        const productMap = {};
        productDetails.forEach(p => productMap[p._id.toString()] = p);

        // Setup IST Time (Shared Logic)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
        const nowIST = new Date(utc + istOffset);

        // Delivery Date Handling
        const deliveryDateObj = new Date(deliveryDate);
        const todayIST = new Date(nowIST);
        todayIST.setHours(0, 0, 0, 0);

        const tomorrowIST = new Date(todayIST);
        tomorrowIST.setDate(tomorrowIST.getDate() + 1);

        const deliveryDay = new Date(deliveryDateObj);
        deliveryDay.setHours(0, 0, 0, 0);

        // Validate Past Dates
        if (deliveryDay < todayIST) {
            return res.status(400).json({
                success: false,
                message: `Delivery date cannot be in the past.`
            });
        }

        const currentHour = nowIST.getHours();
        const currentMinute = nowIST.getMinutes();

        const isSpotSale = req.body.orderType === "spot_sale";

        // Validate Orders (Same Day / Next Day Logic)
        for (const item of products) {
            if (isSpotSale) continue;

            const product = productMap[item.product];
            // Determine effective Cutoff Time (Fallback to global)
            const globalCutoffTime = settings?.order?.customerCutoffTime; // e.g. "19:00"
            const effectiveCutoffTime = (product && product.cutoffTime) ? product.cutoffTime : globalCutoffTime;

            // Determine Cutoff Type (-1 = Previous Day, 0 = Same Day)
            const globalCutoffDay = settings?.order?.customerCutoffDay !== undefined ? settings.order.customerCutoffDay : -1;
            const effectiveCutoffDay = (product && product.cutoffDay !== undefined && product.cutoffDay !== null) ? Number(product.cutoffDay) : globalCutoffDay;

            if (effectiveCutoffTime) {
                const [cutoffHour, cutoffMinute] = effectiveCutoffTime.split(":").map(Number);
                const isPastCutoff = (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute));

                if (effectiveCutoffDay === 0) {
                    // SAME DAY Config (Or "Order Today for Today")
                    if (deliveryDay.getTime() === todayIST.getTime()) {
                        if (isPastCutoff) {
                            const productName = product ? product.name : "Product";
                            return res.status(400).json({
                                success: false,
                                message: `Order cutoff time for '${productName}' (Same Day Delivery) is ${effectiveCutoffTime}. It's too late for today.`
                            });
                        }
                    }
                    // For Tomorrow, it is always allowed (unless some other rule exists, but cutoff doesn't block tomorrow)
                } else {
                    // PREVIOUS DAY Config (Order Today for Tomorrow) - Default
                    // Validate: Cannot deliver TODAY (requires D-1 notice)
                    if (deliveryDay.getTime() === todayIST.getTime()) {
                        const productName = product ? product.name : "Product";
                        return res.status(400).json({
                            success: false,
                            message: `'${productName}' requires ordering the previous day. Earliest delivery is Tomorrow.`
                        });
                    }

                    // Validate: If delivering TOMORROW, must be ordered BEFORE cutoff TODAY
                    if (deliveryDay.getTime() === tomorrowIST.getTime()) {
                        if (isPastCutoff) {
                            const productName = product ? product.name : "Product";
                            return res.status(400).json({
                                success: false,
                                message: `Order cutoff time for '${productName}' is ${effectiveCutoffTime}. It's too late for tomorrow's delivery.`
                            });
                        }
                    }
                }
            }
        }

        // --- Delivery Slot Validation ---
        let validatedSlot = null;
        const configuredSlots = settings?.order?.deliverySlots || [];
        const activeSlots = configuredSlots.filter(s => s.isActive);

        if (activeSlots.length > 0) {
            // Delivery slots are configured — require one
            if (deliverySlot && deliverySlot.label) {
                const matchedSlot = activeSlots.find(s => s.label === deliverySlot.label);
                if (!matchedSlot) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid delivery slot '${deliverySlot.label}'. Available: ${activeSlots.map(s => s.label).join(', ')}`
                    });
                }
                validatedSlot = {
                    label: matchedSlot.label,
                    startTime: matchedSlot.startTime,
                    endTime: matchedSlot.endTime
                };
            } else {
                // Auto-assign first active slot if customer didn't pick one
                validatedSlot = {
                    label: activeSlots[0].label,
                    startTime: activeSlots[0].startTime,
                    endTime: activeSlots[0].endTime
                };
            }
        } else if (deliverySlot && deliverySlot.label) {
            // No slots configured but customer sent one — store as-is
            validatedSlot = deliverySlot;
        }


        // --- Wallet Check & Deduction Logic (for Wallet payments) ---
        const isWalletPayment = paymentMode?.toUpperCase() === "WALLET";

        // Deduct from wallet if the payment mode is WALLET (works for both One Time and Spot Sale now)
        if (isWalletPayment) {
            if (customer.walletBalance < totalAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient wallet balance. Order requires ₹${totalAmount}. Current balance: ₹${customer.walletBalance}. Please recharge your wallet.`,
                    requiredAmount: totalAmount,
                    currentBalance: customer.walletBalance,
                    shortfall: totalAmount - customer.walletBalance
                });
            }

            // Deduct from Wallet
            customer.walletBalance -= totalAmount;
            await customer.save();
        }

        // Determine initial statuses based on frontend payload or defaults
        const initialStatus = (req.user.role !== "CUSTOMER" && req.body.status) ? req.body.status : "pending";
        // If Spot sale -> Paid. If Wallet -> Paid. Otherwise -> Pending (cash/online later)
        const initialPaymentStatus = (req.user.role !== "CUSTOMER" && req.body.paymentStatus)
            ? req.body.paymentStatus
            : (isWalletPayment ? "paid" : "pending");

        // Auto-resolve rider from customer's deliveryBoy if not provided
        const resolvedRider = assignedRider || customer.deliveryBoy || null;

        // Create Order
        const order = await Order.create({
            customer: targetCustomerId,
            products,
            totalAmount,
            deliveryDate,
            paymentMode, // Store as provided (e.g., "WALLET", "CASH")
            status: initialStatus,
            paymentStatus: initialPaymentStatus,
            assignedRider: resolvedRider,
            deliveryBoy: deliveryBoy || resolvedRider || null,
            orderType: req.body.orderType === "spot_sale" ? "SPOT_SALE" : "ONE_TIME",
            notes: req.body.notes || "",
            deliverySlot: validatedSlot || undefined,
        });

        // --- DEDUCT STOCK (if tracking enabled) ---
        for (const item of products) {
            const productDef = productMap[item.product.toString()];
            if (productDef && productDef.trackInventory) {
                // We use findByIdAndUpdate to be more atomic
                const updatedProd = await Product.findByIdAndUpdate(
                    productDef._id,
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                );
                
                // If stock somehow went negative (race condition), log it
                if (updatedProd.stock < 0) {
                    console.warn(`[Order] Product ${productDef.name} stock went negative (${updatedProd.stock}) after order ${order._id}`);
                }
            }
        }

        // Create Transaction if Wallet Payment
        if (isWalletPayment) {
            await Transaction.create({
                user: targetCustomerId,
                amount: totalAmount,
                type: "DEBIT",
                mode: "WALLET", // Ensure uppercase for enum validation
                status: "SUCCESS",
                description: `Order #${order.orderId || order._id}`,
                order: order._id,
                performedBy: req.user._id,
                balanceAfter: customer.walletBalance
            });
        }

        // --- Bottle Tracking Logic ---
        let totalBottlesIssued = 0;

        for (const item of products) {
            const productDef = await Product.findById(item.product);
            if (productDef && productDef.reverseLogistic) {
                totalBottlesIssued += Number(item.quantity);
            }
        }

        if (totalBottlesIssued > 0) {
            // Update Order with expected bottles (but do NOT issue to customer yet unless immediate delivery)
            order.bottlesIssued = totalBottlesIssued;
            if (initialStatus === "delivered") {
                customer.bottlesInHand = (customer.bottlesInHand || 0) + totalBottlesIssued;
            }
            await order.save();
            if (initialStatus === "delivered") {
                await customer.save();
            }
        }

        // Handle Bottle Returns (especially relevant for Spot Sales)
        if (bottlesReturned && Number(bottlesReturned) > 0) {
            order.bottlesReturned = Number(bottlesReturned);
            await order.save();

            // If it's a spot sale (already delivered), deduct returned bottles from customer's hand
            if (initialStatus === "delivered") {
                customer.bottlesInHand = Math.max(0, (customer.bottlesInHand || 0) - Number(bottlesReturned));
                await customer.save();
            }
        }

        // Notify Admins (if Customer created it)
        if (req.user.role === "CUSTOMER") {
            const Employee = require("../models/Employee");
            const admins = await Employee.find({ role: { $in: ["SUPERADMIN", "ADMIN", "HUB_INCHARGE"] } });
            for (const admin of admins) {
                await createNotification({
                    recipient: admin._id,
                    title: "New Order Placed",
                    message: `Order #${order.orderId || order._id} placed by ${req.user.name || req.user.mobile}`,
                    type: "success",
                    link: "/administrator/dashboard/orders"
                });
            }
        }

        // NOTE: Auto-assignment to riders happens via cron job at cutoff time
        // See: jobs/dynamicCronJobs.js - autoAssignOrders()

        // Log Activity
        await logAction(
            targetCustomerId,
            req.user.role === "CUSTOMER" ? "CUSTOMER" : "ADMIN",
            "CREATE_ORDER",
            `Order #${order.orderId || order._id} placed`,
            {
                orderId: order._id,
                amount: totalAmount,
                items: products.length,
                paymentMode
            },
            req
        );

        // --- AUTOMATIC INVOICE NOTIFICATION ---
        try {
            await sendInvoiceNotification(customer, order);
        } catch (notifErr) {
            console.error("Failed to send order invoice notification", notifErr);
        }

        res.status(201).json({
            success: true,
            message: isWalletPayment
                ? `Order placed successfully! ₹${totalAmount} deducted from wallet.`
                : "Order placed successfully",
            result: order,
            walletBalance: customer.walletBalance
        });

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createBottleCollectionRequest = async (req, res) => {
    try {
        const { customerId, deliveryDate, assignedRider } = req.body;

        if (!customerId || !deliveryDate) {
            return res.status(400).json({ success: false, message: "Customer ID and delivery date are required" });
        }

        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const order = await Order.create({
            customer: customerId,
            products: [], // Empty products for bottle collection
            totalAmount: 0,
            deliveryDate,
            paymentMode: "CASH",
            status: assignedRider ? "confirmed" : "pending",
            paymentStatus: "paid",
            orderType: "BOTTLE_COLLECTION",
            assignedRider: assignedRider || null
        });

        // Notify Customer
        await createNotification({
            recipient: customerId,
            title: "Bottle Collection Request",
            message: `A bottle collection has been scheduled for ${new Date(deliveryDate).toLocaleDateString()}. Please keep your empty bottles ready!`,
            type: "info",
            link: "/dashboard/orders"
        });

        res.status(201).json({
            success: true,
            message: "Bottle collection request created successfully",
            result: order
        });
    } catch (error) {
        console.error("Create Bottle Collection Request Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { scopeCustomerFilter, scopeOrderFilter } = require("../middleware/scope");
        const { status, orderType, page = 1, limit = 20, factory, district, city, hub, stockPoint, area } = req.query;
        let query = {};
        if (status) query.status = status;
        if (orderType) query.orderType = orderType;

        // Logistical Filters (handled by resolving hubs first)
        const hubIds = await resolveHubs({ factory, district, city, area, hub });

        // Base scoped customer query
        let customerQuery = { role: "CUSTOMER" };
        customerQuery = scopeCustomerFilter(req.scope, customerQuery);

        if (hubIds) customerQuery.hub = { $in: hubIds };
        if (stockPoint) customerQuery.deliveryPoints = stockPoint;

        // Fetch valid customer IDs matching UI filters AND User Scope
        if (!req.scope?.fullAccess || hubIds || stockPoint) {
            const matchingCustomers = await User.find(customerQuery).select("_id").lean();
            const validCustomerIds = matchingCustomers.map(c => c._id);
            query = scopeOrderFilter(req.scope, query, validCustomerIds);
        }

        // Role based filtering
        if (req.user.role === "CUSTOMER") {
            query.customer = req.user._id;
        }

        const orders = await Order.find(query)
            .populate("customer", "name mobile address") // Added address
            .populate("products.product", "name price image unit unitValue")
            .populate("assignedRider", "name mobile")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            result: orders,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAssignedOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { assignedRider: req.user._id };

        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        // If no status specified, return ALL assigned orders (let frontend filter)

        const orders = await Order.find(query)
            .populate({
                path: "customer",
                select: "name mobile address bottleBalances remainingBottles",
                populate: {
                    path: "bottleBalances.product",
                    select: "name shortDescription"
                }
            })
            .populate("products.product", "name price")
            .sort({ deliveryDate: -1 }); // Sort by delivery date descending (most recent first)

        res.status(200).json({ success: true, result: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status, bottlesReturned, bottlesBroken,
            cashAmount, chequeAmount, chequeNumber,
            note, noteType, cancelReason, deliveryProofImages, products,
            deliveredAssets, returnedAssets, bypassAssetWarning
        } = req.body;

        let query = { _id: id };
        // If the user is a RIDER, they can only update their assigned orders
        if (req.user.role === 'RIDER') {
            query.assignedRider = req.user._id;
        }

        const order = await Order.findOne(query)
            .populate("customer")
            .populate("products.product");
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or access denied" });
        }

        if (status === "delivered" && returnedAssets && Array.isArray(returnedAssets) && returnedAssets.length > 0) {
            const customerObj = await User.findById(order.customer._id);
            if (customerObj && customerObj.assetsInHand) {
                const invalidAssets = returnedAssets.filter(asset => !customerObj.assetsInHand.includes(asset));
                if (invalidAssets.length > 0 && !bypassAssetWarning) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Warning: Asset number(s) ${invalidAssets.join(', ')} were not assigned to this customer! It does not match the delivered ones. Please verify.`,
                        needsBypass: true
                    });
                }
            }
        }

        if (deliveredAssets && Array.isArray(deliveredAssets)) order.deliveredAssets = deliveredAssets;
        if (returnedAssets && Array.isArray(returnedAssets)) order.returnedAssets = returnedAssets;

        // Apply product modifications if any (partial delivery/cancellation)
        if (products && Array.isArray(products)) {
            const ProductModel = require("../models/Product");
            const productIds = products.map(p => (p.product._id || p.product));
            const productDetails = await ProductModel.find({ _id: { $in: productIds } });
            const productMap = {};
            productDetails.forEach(p => productMap[p._id.toString()] = p);

            let newTotal = 0;
            let totalBottlesIssued = 0;
            const newProductsList = [];

            for (const item of products) {
                const productId = (item.product._id || item.product).toString();
                const details = productMap[productId];
                if (!details) continue;

                const quantity = Number(item.quantity) || 0;
                if (quantity > 0) {
                    newTotal += details.price * quantity;
                    if (details.reverseLogistic) totalBottlesIssued += quantity;
                    newProductsList.push({
                        product: details._id,
                        quantity,
                        price: details.price
                    });
                }
            }
            order.products = newProductsList;
            order.totalAmount = newTotal;
            order.bottlesIssued = totalBottlesIssued;
        }

        // Extra info mapping
        if (noteType) order.noteType = noteType;
        if (note) order.deliveryNote = note;
        if (cancelReason) order.cancelReason = cancelReason;
        if (chequeNumber) order.chequeNumber = chequeNumber;
        if (deliveryProofImages && Array.isArray(deliveryProofImages)) order.deliveryProofImages = deliveryProofImages;

        if (status === "delivered") {
            const deliveryCustomer = await User.findById(order.customer._id || order.customer);
            // Check for Silent Delivery preference
            const isSilent = deliveryCustomer?.silentDelivery || false;
            if (isSilent && (!deliveryProofImages || deliveryProofImages.length === 0)) {
                // We don't block yet, but we'll tag the order for Admin review if no photo
                order.deliveryNote = (order.deliveryNote || "") + " [Silent Delivery - Photo missing]";
            } else if (isSilent) {
                order.deliveryNote = (order.deliveryNote || "") + " [Silent Delivery - Photo provided]";
            }

            const previousStatus = order.paymentStatus;
            order.paymentStatus = "paid";

            // If cash/cheque collected, apply robust logic to Wallets
            if (previousStatus !== "paid") {
                let customerInstance = await User.findById(order.customer._id || order.customer);
                if (customerInstance) {
                    const mode = (order.paymentMode || "").toUpperCase();
                    if (mode === "WALLET") {
                        // Re-deduct from wallet
                        customerInstance.walletBalance = Number(customerInstance.walletBalance || 0) - Number(order.totalAmount);
                        await customerInstance.save();

                        const Transaction = require("../models/Transaction");
                        await Transaction.create({
                            user: customerInstance._id,
                            amount: order.totalAmount,
                            type: "DEBIT",
                            mode: "WALLET",
                            status: "SUCCESS",
                            description: `Payment for Delivered Order #${order.orderId || order._id}`,
                            order: order._id,
                            performedBy: req.user._id,
                            balanceAfter: customerInstance.walletBalance
                        });
                    } else if (order.paymentMode === "Cash" || order.paymentMode === "CASH") {
                        // Start by charging the customer for the order they are receiving
                        customerInstance.walletBalance = (customerInstance.walletBalance || 0) - order.totalAmount;

                        const cashCollectedValue = (cashAmount !== undefined && cashAmount !== "") ? Number(cashAmount) : order.totalAmount;
                        const chequeValue = (chequeAmount !== undefined && chequeAmount !== "") ? Number(chequeAmount) : 0;

                        customerInstance.walletBalance += (cashCollectedValue + chequeValue);
                        await customerInstance.save();

                        order.cashCollected = cashCollectedValue;
                        order.chequeCollected = chequeValue;

                        const Employee = require("../models/Employee");
                        const rider = await Employee.findById(req.user._id);
                        if (rider && cashCollectedValue > 0) {
                            rider.walletBalance = (rider.walletBalance || 0) + cashCollectedValue;
                            await rider.save();
                        }
                    }
                }
            }

            // --- HANDLE BOTTLE ISSUANCE & RETURN ---
            // Process bottle transactions ONLY if they haven't been processed yet for this order
            const customer = deliveryCustomer || await User.findById(order.customer._id || order.customer);
            if (customer && !order.bottlesProcessed) {
                let balanceChanged = false;
                const BottleTransaction = require("../models/BottleTransaction");
                const Transaction = require("../models/Transaction");
                const Product = require("../models/Product");

                // 1. Issue Bottles (What the customer is taking today)
                if (order.bottlesIssued > 0) {
                    customer.remainingBottles = (customer.remainingBottles || 0) + order.bottlesIssued;
                    balanceChanged = true;

                    // Update per-product pending balances
                    for (const item of order.products) {
                        const productDef = await Product.findById(item.product._id || item.product);
                        if (productDef && productDef.reverseLogistic) {
                            let balance = customer.bottleBalances.find(b => b.product.toString() === productDef._id.toString());
                            if (!balance) {
                                balance = { product: productDef._id, pending: 0, penalized: 0 };
                                customer.bottleBalances.push(balance);
                            }
                            balance.pending += item.quantity;

                            await BottleTransaction.create({
                                customer: customer._id,
                                rider: req.user._id,
                                order: order._id,
                                product: productDef._id,
                                type: "issued",
                                quantity: item.quantity,
                                notes: `Issued via Order #${order.orderId || order._id}`,
                                recordedBy: req.user._id
                            });
                        }
                    }
                }
                
                // Add Assets to hand
                if (deliveredAssets && Array.isArray(deliveredAssets) && deliveredAssets.length > 0) {
                    customer.assetsInHand = customer.assetsInHand || [];
                    customer.assetsInHand.push(...deliveredAssets);
                    balanceChanged = true;
                }

                // 2. Handle Returns (What the rider collected today)
                // bottlesReturned can be a Number (old) or Object { [productId]: qty } (new)
                const returnsMap = (typeof bottlesReturned === 'object' && bottlesReturned !== null) 
                    ? bottlesReturned 
                    : (order.bottlesIssued > 0 && Number(bottlesReturned) > 0) // Backward compat: assume first reverseLogistic product
                        ? { [(order.products.find(p => p.product?.reverseLogistic)?.product?._id || order.products[0]?.product?._id || order.products[0]?.product).toString()]: Number(bottlesReturned) }
                        : {};

                let totalCollectedQty = 0;
                for (const [prodId, qty] of Object.entries(returnsMap)) {
                    const collectedQty = Number(qty) || 0;
                    if (collectedQty <= 0) continue;

                    totalCollectedQty += collectedQty;
                    const productDef = await Product.findById(prodId);
                    
                    // Update bottle balances
                    let balance = customer.bottleBalances.find(b => b.product.toString() === prodId);
                    if (balance) {
                        balance.pending = Math.max(0, balance.pending - collectedQty);
                        
                        // Check if we need to refund for previously penalized bottles
                        if (balance.penalized > 0 && productDef && productDef.unreturnedBottleCharge > 0) {
                            const refundQty = Math.min(collectedQty, balance.penalized);
                            const refundAmount = refundQty * productDef.unreturnedBottleCharge;
                            
                            balance.penalized -= refundQty;
                            customer.walletBalance += refundAmount;
                            
                            // Log Wallet Credit
                            await Transaction.create({
                                user: customer._id,
                                amount: refundAmount,
                                type: "CREDIT",
                                mode: "WALLET",
                                status: "SUCCESS",
                                description: `Refund: Returned ${refundQty} penalized ${productDef.name} bottles`,
                                order: order._id,
                                balanceAfter: customer.walletBalance
                            });
                        }
                    }

                    await BottleTransaction.create({
                        customer: customer._id,
                        rider: req.user._id,
                        order: order._id,
                        product: prodId,
                        type: "returned",
                        quantity: collectedQty,
                        notes: "Collected on delivery",
                        recordedBy: req.user._id,
                    });
                }

                if (totalCollectedQty > 0) {
                    order.bottlesReturned = totalCollectedQty;
                    customer.remainingBottles = Math.max(0, (customer.remainingBottles || 0) - totalCollectedQty);
                    balanceChanged = true;
                }

                // 3. Handle Broken Bottles reported during delivery
                const brokenMap = (typeof bottlesBroken === 'object' && bottlesBroken !== null) ? bottlesBroken : {};
                for (const [prodId, qty] of Object.entries(brokenMap)) {
                    const brokenQty = Number(qty) || 0;
                    if (brokenQty <= 0) continue;

                    const productDef = await Product.findById(prodId);
                    const charge = (productDef?.brokenBottleCharge || 0) * brokenQty;

                    if (charge > 0) {
                        customer.walletBalance -= charge;
                        await Transaction.create({
                            user: customer._id,
                            amount: charge,
                            type: "DEBIT",
                            mode: "WALLET",
                            status: "SUCCESS",
                            description: `Broken Bottle Charge: ${brokenQty} x ${productDef.name}`,
                            order: order._id,
                            balanceAfter: customer.walletBalance
                        });
                    }

                    // Update balance (decrement pending)
                    let balance = customer.bottleBalances.find(b => b.product.toString() === prodId);
                    if (balance) {
                        balance.pending = Math.max(0, balance.pending - brokenQty);
                    }
                    
                    customer.remainingBottles = Math.max(0, (customer.remainingBottles || 0) - brokenQty);
                    balanceChanged = true;

                    await BottleTransaction.create({
                        customer: customer._id,
                        rider: req.user._id,
                        order: order._id,
                        product: prodId,
                        type: "broken",
                        quantity: brokenQty,
                        penaltyAmount: charge,
                        notes: "Reported during delivery",
                        recordedBy: req.user._id,
                    });
                }
                
                // Remove Assets from hand
                if (returnedAssets && Array.isArray(returnedAssets) && returnedAssets.length > 0) {
                    customer.assetsInHand = (customer.assetsInHand || []).filter(asset => !returnedAssets.includes(asset));
                    balanceChanged = true;
                }

                if (balanceChanged) {
                    await customer.save();
                }
                
                // Mark this order's bottles as officially processed in the database
                order.bottlesProcessed = true;
            }

            // Send Delivery SMS
            const { sendDeliveryNotification } = require("../utils/notification");
            try {
                await sendDeliveryNotification(order.customer, order);
            } catch (smsErr) {
                console.error("Delivery SMS failed", smsErr);
            }

            // --- Phase 2: Automated Loyalty Loop ---
            // If this is the customer's very first delivered order, issue the referral rewards!
            const { processReferralRewards } = require("../utils/loyaltyLoop");
            await processReferralRewards(order.customer._id || order.customer, req.user._id);

        } else if (status === "cancelled" && order.status !== "cancelled") {
            // 1. REFUND WALLET (if paid via Wallet)
            const mode = (order.paymentMode || "").toUpperCase();
            if (order.paymentStatus === "paid" && mode === "WALLET") {
                let customerInstance = await User.findById(order.customer._id || order.customer);
                if (customerInstance) {
                    customerInstance.walletBalance = Number(customerInstance.walletBalance || 0) + Number(order.totalAmount);
                    await customerInstance.save();

                    const Transaction = require("../models/Transaction");
                    await Transaction.create({
                        user: customerInstance._id,
                        amount: order.totalAmount,
                        type: "CREDIT",
                        mode: "WALLET",
                        status: "SUCCESS",
                        description: `Refund: Cancelled Order #${order.orderId || order._id}`,
                        order: order._id,
                        performedBy: req.user._id,
                        balanceAfter: customerInstance.walletBalance
                    });

                    order.paymentStatus = "refunded";
                }
            }

            // 2. REVERSE BOTTLE ISSUANCE (if bottles were already processed)
            if (order.bottlesProcessed && order.bottlesIssued > 0) {
                let customerInstance = await User.findById(order.customer._id || order.customer);
                if (customerInstance) {
                    // Subtract what was issued
                    customerInstance.remainingBottles = Math.max(0, (customerInstance.remainingBottles || 0) - order.bottlesIssued);
                    
                    // Add back what was returned (since the order is cancelled, we assume the collection didn't happen or is void)
                    if (order.bottlesReturned > 0) {
                        customerInstance.remainingBottles += order.bottlesReturned;
                    }
                    
                    await customerInstance.save();

                    const BottleTransaction = require("../models/BottleTransaction");
                    await BottleTransaction.create({
                        customer: customerInstance._id,
                        rider: req.user._id,
                        order: order._id,
                        type: "adjustment",
                        quantity: order.bottlesIssued,
                        notes: `Reversed via Cancellation of Order #${order.orderId || order._id}`,
                        recordedBy: req.user._id
                    });
                    
                    // Reset processed flag so it can be re-delivered if needed
                    order.bottlesProcessed = false;
                    order.bottlesReturned = 0;
                }
            }
            // 3. RECLAIM PRODUCT STOCK
            if (order.products && order.products.length > 0) {
                const ProductModel = require("../models/Product");
                for (const item of order.products) {
                    const prod = await ProductModel.findById(item.product._id || item.product);
                    if (prod && prod.trackInventory) {
                        prod.stock += (item.quantity || 0);
                        await prod.save();
                    }
                }
            }
        }

        order.status = status;
        await order.save();

        // Notify Customer
        await createNotification({
            recipient: order.customer._id,
            title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Your order #${order.orderId || order._id} has been ${status}.`,
            type: "info",
            link: "/dashboard/orders"
        });

        res.status(200).json({ success: true, message: "Order status updated", result: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.assignRider = async (req, res) => {
    try {
        const { id } = req.params;
        const { riderId } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const Employee = require("../models/Employee"); // Lazy load
        const rider = await Employee.findById(riderId);
        if (!rider || rider.role !== 'RIDER') {
            return res.status(400).json({ success: false, message: "Invalid rider" });
        }

        order.assignedRider = riderId;
        if (order.status === 'pending') {
            order.status = 'confirmed';
        }
        await order.save();

        // Notify Rider
        await createNotification({
            recipient: rider._id,
            title: "New Order Assigned",
            message: `Order #${order._id} has been manually assigned to you.`,
            type: "info",
            link: "/rider/dashboard"
        });

        res.status(200).json({ success: true, message: "Rider assigned successfully", result: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            deliveryDate,
            products,
            status,
            paymentStatus,
            paymentMode,
            notes,
            assignedRider,
        } = req.body;

        const order = await Order.findById(id).populate('customer');
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const oldStatus = order.status;
        const oldPaymentStatus = order.paymentStatus;
        const mode = (paymentMode || order.paymentMode || "").toUpperCase();

        // ── Transition & Wallet Logic (BEFORE field updates) ──────────────────
        if (status === "delivered" && oldStatus !== "delivered") {
            // Re-deduct from wallet if it was not previously paid
            if (oldPaymentStatus !== "paid" && oldPaymentStatus !== "Paid") {
                let customerInstance = await User.findById(order.customer._id || order.customer);
                if (customerInstance && mode === "WALLET") {
                    customerInstance.walletBalance = Number(customerInstance.walletBalance || 0) - Number(order.totalAmount);
                    await customerInstance.save();
                    
                    const Transaction = require("../models/Transaction");
                    await Transaction.create({
                        user: customerInstance._id,
                        amount: order.totalAmount,
                        type: "DEBIT",
                        mode: "WALLET",
                        status: "SUCCESS",
                        description: `Payment for Delivered Order #${order.orderId || order._id}`,
                        order: order._id,
                        performedBy: req.user._id,
                        balanceAfter: customerInstance.walletBalance
                    });
                    order.paymentStatus = "paid";
                }
            }

            // --- Phase 2: Automated Loyalty Loop ---
            const { processReferralRewards } = require("../utils/loyaltyLoop");
            await processReferralRewards(order.customer._id || order.customer, req.user._id);

        } else if (status === "cancelled" && oldStatus !== "cancelled") {
            // Refund wallet if moving to cancelled and it was paid
            if ((oldPaymentStatus === "paid" || oldPaymentStatus === "Paid") && mode === "WALLET") {
                let customerInstance = await User.findById(order.customer._id || order.customer);
                if (customerInstance) {
                    customerInstance.walletBalance = Number(customerInstance.walletBalance || 0) + Number(order.totalAmount);
                    await customerInstance.save();

                    const Transaction = require("../models/Transaction");
                    await Transaction.create({
                        user: customerInstance._id,
                        amount: order.totalAmount,
                        type: "CREDIT",
                        mode: "WALLET",
                        status: "SUCCESS",
                        description: `Refund for Cancelled Order #${order.orderId || order._id}`,
                        order: order._id,
                        performedBy: req.user._id,
                        balanceAfter: customerInstance.walletBalance
                    });
                    order.paymentStatus = "refunded";
                }
            }
        }

        // ── Scalar fields update ──────────────────────────────────────────────
        if (deliveryDate) order.deliveryDate = new Date(deliveryDate);
        if (status) order.status = status;
        if (paymentStatus && !order.isModified('paymentStatus')) order.paymentStatus = paymentStatus;
        if (paymentMode) order.paymentMode = paymentMode;
        if (notes !== undefined) order.notes = notes;
        if (assignedRider) order.assignedRider = assignedRider || null;

        // ── Products ──────────────────────────────────────────────────────────
        if (products && Array.isArray(products) && products.length > 0) {
            const productIds = products.map(p => (p.product?._id || p.product));
            const productDetails = await Product.find({ _id: { $in: productIds } });
            const productMap = {};
            productDetails.forEach(p => (productMap[p._id.toString()] = p));

            let newTotal = 0;
            let totalBottlesIssued = 0;
            const newProductsList = [];

            for (const item of products) {
                const productId = (item.product?._id || item.product).toString();
                const details = productMap[productId];
                if (!details) throw new Error(`Product not found: ${productId}`);

                const quantity = Number(item.quantity);
                if (quantity <= 0) continue; // skip zero-qty items

                // Use price from request if provided (admin override), else catalog price
                const price = item.price ?? details.price;
                newTotal += price * quantity;
                if (details.reverseLogistic) totalBottlesIssued += quantity;

                newProductsList.push({ product: details._id, quantity, price });
            }

            if (newProductsList.length === 0) {
                return res.status(400).json({ success: false, message: "Order must have at least one product" });
            }

            order.products = newProductsList;
            order.totalAmount = newTotal;
            order.bottlesIssued = totalBottlesIssued;
        }

        await order.save();

        // Activity log
        try {
            await logAction({
                user: req.user._id,
                action: "UPDATE_ORDER",
                target: "Order",
                targetId: order._id,
                details: `Order #${order.orderId || order._id} updated by ${req.user.name || req.user.role}`
            });
        } catch (_) { }

        const populated = await Order.findById(order._id)
            .populate('customer', 'name mobile customerId')
            .populate('products.product', 'name price')
            .populate('assignedRider', 'name mobile');

        res.status(200).json({ success: true, message: "Order updated successfully", result: populated });
    } catch (error) {
        console.error("Update Order Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

