const User = require("../models/User");
const Employee = require("../models/Employee");
const Order = require("../models/Order");
const { createNotification } = require("./notificationController");
const path = require("path");
const fs = require("fs");

exports.updateShiftStatus = async (req, res) => {
    try {
        const { shiftStatus } = req.body;

        const rider = await Employee.findByIdAndUpdate(
            req.user._id,
            { isActive: shiftStatus === "Active" },
            { new: true }
        );

        const admins = await Employee.find({ role: { $in: ["SUPERADMIN", "ADMIN", "DELIVERY_MANAGER"] } });
        for (const admin of admins) {
            await createNotification({
                recipient: admin._id,
                title: "Rider Shift Update",
                message: `${rider.name} is now ${shiftStatus}`,
                type: "info",
                link: "/administrator/dashboard/riders"
            });
        }

        res.status(200).json({ success: true, message: `Shift updated to ${shiftStatus}`, result: rider });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRiderCustomers = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch rider to get route order and areas
        const rider = await Employee.findById(id).select("route areas deliveryPoints");
        const routeOrder = rider && rider.route ? rider.route.map(r => r.toString()) : [];

        // 1. Customers directly assigned to this rider (deliveryBoy field)
        const assignedCustomers = await User.find({ deliveryBoy: id, role: "CUSTOMER" }).select("_id");
        const assignedIds = assignedCustomers.map(c => c._id.toString());

        // 2. Customers from orders assigned to this rider
        const orderCustomerIds = await Order.distinct("customer", { assignedRider: id });
        const orderIds = orderCustomerIds.map(cid => cid.toString());

        // 3. Customers from the rider's assigned areas (serviceArea on User matches rider's areas)
        let areaCustomerIds = [];
        if (rider?.areas?.length > 0) {
            const areaCustomers = await User.find({
                serviceArea: { $in: rider.areas },
                role: "CUSTOMER"
            }).select("_id");
            areaCustomerIds = areaCustomers.map(c => c._id.toString());
        }

        // Combine all sources (deduplicate)
        const allCustomerIds = [...new Set([
            ...assignedIds,
            ...orderIds,
            ...routeOrder,
            ...areaCustomerIds
        ])];

        // Fetch customer details
        let customers = await User.find({ _id: { $in: allCustomerIds } })
            .select("name mobile address walletBalance serviceArea customerId")
            .populate("serviceArea", "name");

        // Sort customers based on route order
        if (routeOrder.length > 0) {
            customers.sort((a, b) => {
                const indexA = routeOrder.indexOf(a._id.toString());
                const indexB = routeOrder.indexOf(b._id.toString());

                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return 0;
            });
        }

        res.status(200).json({ success: true, result: customers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// ATTENDANCE (with salary calculation)
// ========================
exports.markAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, status, checkIn, checkOut, notes } = req.body;

        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Check if attendance already exists for this date
        const existingIdx = employee.attendance.findIndex(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === targetDate.getTime();
        });

        // Track if this is a new "Present" or "Half Day" entry (salary-eligible)
        let salaryAdded = 0;
        const wasAlreadyPresent = existingIdx !== -1 &&
            (employee.attendance[existingIdx].status === "Present" || employee.attendance[existingIdx].status === "Half Day");

        if (existingIdx !== -1) {
            // Update existing
            employee.attendance[existingIdx].status = status;
            if (checkIn) employee.attendance[existingIdx].checkIn = checkIn;
            if (checkOut) employee.attendance[existingIdx].checkOut = checkOut;
            if (notes !== undefined) employee.attendance[existingIdx].notes = notes;
        } else {
            // Add new
            employee.attendance.push({
                date: targetDate,
                status,
                checkIn: checkIn || null,
                checkOut: checkOut || null,
                notes: notes || ""
            });
        }

        // ---- SALARY CALCULATION ----
        const salaryDetails = employee.salaryDetails || {};
        const isSalaried = salaryDetails.isSalaried;
        const salaryType = salaryDetails.salaryType || "Monthly";
        const salaryAmount = salaryDetails.salary || 0;

        if (isSalaried && salaryAmount > 0) {
            const isPresent = status === "Present";
            const isHalfDay = status === "Half Day";

            if (salaryType === "Daily") {
                // Daily: Add salary immediately when attendance is Present
                if (isPresent && !wasAlreadyPresent) {
                    salaryAdded = salaryAmount;
                    employee.earnedSalary = (employee.earnedSalary || 0) + salaryAmount;

                    employee.salaryLedger.push({
                        date: targetDate,
                        type: "salary",
                        amount: salaryAmount,
                        description: `Daily salary for ${targetDate.toLocaleDateString()}`,
                        balanceAfter: employee.earnedSalary
                    });
                } else if (isHalfDay && !wasAlreadyPresent) {
                    salaryAdded = salaryAmount / 2;
                    employee.earnedSalary = (employee.earnedSalary || 0) + salaryAdded;

                    employee.salaryLedger.push({
                        date: targetDate,
                        type: "salary",
                        amount: salaryAdded,
                        description: `Half-day salary for ${targetDate.toLocaleDateString()}`,
                        balanceAfter: employee.earnedSalary
                    });
                }

                // If changed FROM present/halfday to absent/leave, reverse salary
                if (wasAlreadyPresent && !isPresent && !isHalfDay) {
                    const prevStatus = employee.attendance[existingIdx]?.status;
                    const reverseAmount = prevStatus === "Half Day" ? salaryAmount / 2 : salaryAmount;
                    employee.earnedSalary = (employee.earnedSalary || 0) - reverseAmount;
                    salaryAdded = -reverseAmount;

                    employee.salaryLedger.push({
                        date: targetDate,
                        type: "salary",
                        amount: -reverseAmount,
                        description: `Salary reversed for ${targetDate.toLocaleDateString()} (changed to ${status})`,
                        balanceAfter: employee.earnedSalary
                    });
                }
            } else if (salaryType === "Monthly") {
                // Monthly: Calculate working days and add salary on the last day of the month
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth();
                const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

                if (targetDate.getDate() === lastDayOfMonth) {
                    // Count present days this month
                    const monthAttendance = employee.attendance.filter(a => {
                        const d = new Date(a.date);
                        return d.getMonth() === month && d.getFullYear() === year;
                    });

                    const presentDays = monthAttendance.filter(a => a.status === "Present").length;
                    const halfDays = monthAttendance.filter(a => a.status === "Half Day").length;
                    const totalWorkingDays = presentDays + (halfDays * 0.5);
                    const dailyRate = salaryAmount / lastDayOfMonth;
                    salaryAdded = Math.round(dailyRate * totalWorkingDays);

                    employee.earnedSalary = (employee.earnedSalary || 0) + salaryAdded;

                    employee.salaryLedger.push({
                        date: targetDate,
                        type: "salary",
                        amount: salaryAdded,
                        description: `Monthly salary: ${totalWorkingDays} working days × ₹${Math.round(dailyRate)}/day`,
                        balanceAfter: employee.earnedSalary
                    });
                }
            } else if (salaryType === "Weekly") {
                // Weekly: Add salary on Sunday (day 0) for the past week
                if (targetDate.getDay() === 0) {
                    const weekStart = new Date(targetDate);
                    weekStart.setDate(weekStart.getDate() - 6);

                    const weekAttendance = employee.attendance.filter(a => {
                        const d = new Date(a.date);
                        return d >= weekStart && d <= targetDate;
                    });

                    const presentDays = weekAttendance.filter(a => a.status === "Present").length;
                    const halfDays = weekAttendance.filter(a => a.status === "Half Day").length;
                    const totalWorkingDays = presentDays + (halfDays * 0.5);
                    const dailyRate = salaryAmount / 7;
                    salaryAdded = Math.round(dailyRate * totalWorkingDays);

                    employee.earnedSalary = (employee.earnedSalary || 0) + salaryAdded;

                    employee.salaryLedger.push({
                        date: targetDate,
                        type: "salary",
                        amount: salaryAdded,
                        description: `Weekly salary: ${totalWorkingDays} days × ₹${Math.round(dailyRate)}/day`,
                        balanceAfter: employee.earnedSalary
                    });
                }
            }
        }

        await employee.save();
        res.status(200).json({
            success: true,
            message: `Attendance marked${salaryAdded ? ` (₹${salaryAdded} salary ${salaryAdded > 0 ? 'added' : 'adjusted'})` : ''}`,
            result: employee.attendance,
            salaryAdded
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;

        const employee = await Employee.findById(id).select("attendance name salaryDetails earnedSalary");
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        let attendance = employee.attendance || [];

        // Filter by month/year if provided
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            attendance = attendance.filter(a => {
                const d = new Date(a.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
        }

        // Sort by date
        attendance.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Summary
        const presentDays = attendance.filter(a => a.status === "Present").length;
        const absentDays = attendance.filter(a => a.status === "Absent").length;
        const halfDays = attendance.filter(a => a.status === "Half Day").length;
        const leaveDays = attendance.filter(a => a.status === "Leave").length;
        const totalWorkingDays = presentDays + (halfDays * 0.5);

        const summary = {
            present: presentDays,
            absent: absentDays,
            halfDay: halfDays,
            leave: leaveDays,
            total: attendance.length
        };

        // ---- SALARY CALCULATION for this period ----
        const salaryDetails = employee.salaryDetails || {};
        const isSalaried = salaryDetails.isSalaried;
        const salaryType = salaryDetails.salaryType || "Monthly";
        const salaryAmount = salaryDetails.salary || 0;

        let monthEarnedSalary = 0;
        if (isSalaried && salaryAmount > 0) {
            if (salaryType === "Daily") {
                monthEarnedSalary = Math.round(salaryAmount * totalWorkingDays);
            } else if (salaryType === "Monthly") {
                const m = month ? parseInt(month) - 1 : new Date().getMonth();
                const y = year ? parseInt(year) : new Date().getFullYear();
                const daysInMonth = new Date(y, m + 1, 0).getDate();
                const dailyRate = salaryAmount / daysInMonth;
                monthEarnedSalary = Math.round(dailyRate * totalWorkingDays);
            } else if (salaryType === "Weekly") {
                const dailyRate = salaryAmount / 6;
                monthEarnedSalary = Math.round(dailyRate * totalWorkingDays);
            } else if (salaryType === "Biweekly") {
                const dailyRate = salaryAmount / 12;
                monthEarnedSalary = Math.round(dailyRate * totalWorkingDays);
            }
        }

        res.status(200).json({
            success: true,
            result: {
                attendance,
                summary,
                salary: {
                    salaryType,
                    salaryAmount,
                    isSalaried,
                    monthEarnedSalary,
                    totalEarnedSalary: employee.earnedSalary || 0,
                    totalWorkingDays,
                    presentDays,
                    halfDays
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// FINANCIALS
// ========================
exports.getRiderFinancials = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;

        const employee = await Employee.findById(id)
            .select("name earnedSalary cashInHand kmEarnings walletBalance salaryDetails kmLogs cashCollections advancePayments salaryLedger attendance");
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        // Calculate cash collected from orders
        const orderQuery = { assignedRider: employee._id, status: 'delivered', paymentMode: 'Cash' };
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            const start = new Date(y, m, 1);
            const end = new Date(y, m + 1, 0, 23, 59, 59);
            orderQuery.deliveryDate = { $gte: start, $lte: end };
        }

        const cashStats = await Order.aggregate([
            { $match: orderQuery },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const totalCashCollected = cashStats[0]?.total || 0;

        // Calculate total cash collected by admin from this rider
        let totalAdminCollected = 0;
        const collections = employee.cashCollections || [];
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            totalAdminCollected = collections
                .filter(c => {
                    const d = new Date(c.date);
                    return d.getMonth() === m && d.getFullYear() === y;
                })
                .reduce((sum, c) => sum + c.amount, 0);
        } else {
            totalAdminCollected = collections.reduce((sum, c) => sum + c.amount, 0);
        }

        // Outstanding calculation
        const cashWithRider = totalCashCollected - totalAdminCollected;

        // ---- DYNAMICALLY CALCULATE EARNED SALARY FROM ATTENDANCE ----
        const salaryDetails = employee.salaryDetails || {};
        const isSalaried = salaryDetails.isSalaried;
        const salaryType = salaryDetails.salaryType || "Daily";
        const salaryAmount = salaryDetails.salary || 0;

        // Filter attendance records by month/year if provided
        let attRecords = employee.attendance || [];
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            attRecords = attRecords.filter(a => {
                const d = new Date(a.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
        }

        const presentDays = attRecords.filter(a => a.status === "Present").length;
        const halfDays = attRecords.filter(a => a.status === "Half Day").length;
        const totalWorkingDays = presentDays + (halfDays * 0.5);

        // Calculate earned salary dynamically
        let earnedSalary = 0;
        if (isSalaried && salaryAmount > 0) {
            if (salaryType === "Daily") {
                // Daily: salary per present day, half for half-day
                earnedSalary = Math.round(salaryAmount * totalWorkingDays);
            } else if (salaryType === "Monthly") {
                // Monthly: pro-rate based on calendar days in the month
                const m = month ? parseInt(month) - 1 : new Date().getMonth();
                const y = year ? parseInt(year) : new Date().getFullYear();
                const daysInMonth = new Date(y, m + 1, 0).getDate();
                const dailyRate = salaryAmount / daysInMonth;
                earnedSalary = Math.round(dailyRate * totalWorkingDays);
            } else if (salaryType === "Weekly") {
                // Weekly: salary per 6-day work week
                const dailyRate = salaryAmount / 6;
                earnedSalary = Math.round(dailyRate * totalWorkingDays);
            } else if (salaryType === "Biweekly") {
                const dailyRate = salaryAmount / 12;
                earnedSalary = Math.round(dailyRate * totalWorkingDays);
            }
        }

        // ---- DYNAMICALLY CALCULATE KM EARNINGS FROM KM LOGS ----
        let kmLogs = employee.kmLogs || [];
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            kmLogs = kmLogs.filter(l => {
                const d = new Date(l.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
        }
        const kmEarnings = kmLogs.reduce((sum, l) => sum + (l.kmCharge || 0), 0);
        const totalGpsKm = kmLogs.reduce((sum, l) => sum + (l.gpsDistance || 0), 0);
        const totalManualKm = kmLogs.reduce((sum, l) => sum + (l.totalKm || 0), 0);
        kmLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalEarnings = earnedSalary + kmEarnings;

        // ---- CALCULATE ADVANCE PAYMENTS ----
        let advancePayments = employee.advancePayments || [];
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            advancePayments = advancePayments.filter(a => {
                const d = new Date(a.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
        }
        const totalAdvancePaid = advancePayments.reduce((sum, a) => sum + a.amount, 0);

        // Net payable = totalEarnings - cashWithRider - advancePaid
        // cashWithRider can be negative (meaning admin collected more cash than rider had — excess/advance)
        const netPayable = totalEarnings - cashWithRider - totalAdvancePaid;

        // Filter salary ledger by month if needed
        let ledger = employee.salaryLedger || [];
        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            ledger = ledger.filter(l => {
                const d = new Date(l.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
        }
        ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            success: true,
            result: {
                summary: {
                    earnedSalary,
                    kmEarnings,
                    totalEarnings,
                    totalCashCollected,
                    totalAdminCollected,
                    cashWithRider,
                    totalAdvancePaid,
                    netPayable,
                    perKmCharge: employee.salaryDetails?.perKmCharge || 0,
                    salaryRate: salaryAmount,
                    salaryType,
                    presentDays,
                    halfDays,
                    totalWorkingDays,
                    totalGpsKm: Math.round(totalGpsKm * 10) / 10,
                    totalManualKm
                },
                ledger,
                kmLogs,
                cashCollections: collections,
                advancePayments
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// KM LOG (Rider submits or Admin submits)
// ========================
exports.submitKmLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { startReading, endReading, gpsDistance, date } = req.body;

        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        // Use the provided date or default to today
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        // Check if there's already a log for this date
        const existingLogIdx = employee.kmLogs.findIndex(l => {
            const d = new Date(l.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === targetDate.getTime();
        });

        const perKmCharge = employee.salaryDetails?.perKmCharge || 0;

        if (existingLogIdx !== -1) {
            const log = employee.kmLogs[existingLogIdx];

            if (endReading !== undefined && endReading !== null) {
                // Update with end reading
                log.endReading = endReading;
                log.totalKm = endReading - log.startReading;
                if (gpsDistance) log.gpsDistance = gpsDistance;
                log.kmCharge = Math.round(log.totalKm * perKmCharge);
                log.status = "completed";

                // Add km earnings
                employee.kmEarnings = (employee.kmEarnings || 0) + log.kmCharge;

                if (log.kmCharge > 0) {
                    employee.salaryLedger.push({
                        date: targetDate,
                        type: "km_charge",
                        amount: log.kmCharge,
                        description: `KM charge: ${log.totalKm} km × ₹${perKmCharge}/km`,
                        balanceAfter: (employee.earnedSalary || 0) + (employee.kmEarnings || 0)
                    });
                }
            } else if (startReading !== undefined) {
                // Admin updating start reading for existing log
                log.startReading = startReading;
                if (gpsDistance !== undefined) log.gpsDistance = gpsDistance;
            } else if (gpsDistance !== undefined) {
                // Update GPS distance while in progress
                log.gpsDistance = gpsDistance;
            }
        } else {
            // Create new log
            const totalKm = endReading ? endReading - startReading : 0;
            const kmCharge = endReading ? Math.round(totalKm * perKmCharge) : 0;

            employee.kmLogs.push({
                date: targetDate,
                startReading,
                endReading: endReading || null,
                gpsDistance: gpsDistance || 0,
                totalKm,
                kmCharge,
                status: endReading ? "completed" : "active"
            });

            // If creating a complete log (both start + end), add earnings immediately
            if (endReading && kmCharge > 0) {
                employee.kmEarnings = (employee.kmEarnings || 0) + kmCharge;
                employee.salaryLedger.push({
                    date: targetDate,
                    type: "km_charge",
                    amount: kmCharge,
                    description: `KM charge: ${totalKm} km × ₹${perKmCharge}/km`,
                    balanceAfter: (employee.earnedSalary || 0) + (employee.kmEarnings || 0)
                });
            }
        }

        await employee.save();

        const currentLog = employee.kmLogs.find(l => {
            const d = new Date(l.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === targetDate.getTime();
        });

        res.status(200).json({
            success: true,
            message: endReading ? "KM log completed" : "KM log started",
            result: currentLog
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get today's KM log for rider (self-service)
exports.getTodayKmLog = async (req, res) => {
    try {
        const riderId = req.user._id;
        const employee = await Employee.findById(riderId).select("kmLogs salaryDetails");
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayLog = employee.kmLogs.find(l => {
            const d = new Date(l.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });

        res.status(200).json({
            success: true,
            result: todayLog || null,
            perKmCharge: employee.salaryDetails?.perKmCharge || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// CASH COLLECTION (Admin collects from rider)
// ========================
exports.collectCashFromRider = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, notes } = req.body;

        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // Add collection record
        employee.cashCollections.push({
            date: new Date(),
            amount: numAmount,
            collectedBy: req.user._id,
            notes: notes || ""
        });

        // Update wallet balance (reduce outstanding)
        employee.walletBalance = Math.max(0, (employee.walletBalance || 0) - numAmount);
        employee.cashInHand = Math.max(0, (employee.cashInHand || 0) - numAmount);

        // Add to ledger
        employee.salaryLedger.push({
            date: new Date(),
            type: "cash_collection",
            amount: -numAmount,
            description: `Cash collected by admin: ₹${numAmount}${notes ? ` (${notes})` : ''}`,
            balanceAfter: employee.walletBalance
        });

        await employee.save();

        res.status(200).json({
            success: true,
            message: `₹${numAmount} collected from rider`,
            result: {
                newWalletBalance: employee.walletBalance,
                cashInHand: employee.cashInHand,
                totalCollections: employee.cashCollections.reduce((sum, c) => sum + c.amount, 0)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// ADVANCE PAYMENT (Admin pays salary advance to rider)
// ========================
exports.payAdvanceToRider = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, notes } = req.body;

        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // Add advance payment record
        employee.advancePayments.push({
            date: new Date(),
            amount: numAmount,
            paidBy: req.user._id,
            notes: notes || ""
        });

        // Add to ledger
        employee.salaryLedger.push({
            date: new Date(),
            type: "advance_payment",
            amount: -numAmount,
            description: `Advance payment to rider: ₹${numAmount}${notes ? ` (${notes})` : ''}`,
            balanceAfter: 0
        });

        await employee.save();

        res.status(200).json({
            success: true,
            message: `₹${numAmount} advance paid to rider`,
            result: {
                totalAdvancePaid: employee.advancePayments.reduce((sum, a) => sum + a.amount, 0)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// RIDER SELF-SERVICE FINANCIALS
// ========================
exports.getRiderSelfFinancials = async (req, res) => {
    try {
        const riderId = req.user._id;
        const employee = await Employee.findById(riderId)
            .select("name earnedSalary cashInHand kmEarnings walletBalance salaryDetails kmLogs cashCollections advancePayments salaryLedger attendance");
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        // Cash collected from orders (current month only)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

        const cashStats = await Order.aggregate([
            {
                $match: {
                    assignedRider: employee._id,
                    status: 'delivered',
                    paymentMode: 'Cash',
                    deliveryDate: { $gte: start, $lte: end }
                }
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalCashCollected = cashStats[0]?.total || 0;

        // Filter cash collections by current month
        const totalAdminCollected = (employee.cashCollections || [])
            .filter(c => {
                const d = new Date(c.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, c) => sum + c.amount, 0);

        const cashWithRider = totalCashCollected - totalAdminCollected;

        // ---- DYNAMICALLY CALCULATE EARNED SALARY FROM ATTENDANCE ----
        const salaryDetails = employee.salaryDetails || {};
        const isSalaried = salaryDetails.isSalaried;
        const salaryType = salaryDetails.salaryType || "Daily";
        const salaryAmount = salaryDetails.salary || 0;

        // Current month attendance
        const attRecords = (employee.attendance || []).filter(a => {
            const d = new Date(a.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const presentDays = attRecords.filter(a => a.status === "Present").length;
        const halfDays = attRecords.filter(a => a.status === "Half Day").length;
        const totalWorkingDays = presentDays + (halfDays * 0.5);

        let earnedSalary = 0;
        if (isSalaried && salaryAmount > 0) {
            if (salaryType === "Daily") {
                earnedSalary = Math.round(salaryAmount * totalWorkingDays);
            } else if (salaryType === "Monthly") {
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const dailyRate = salaryAmount / daysInMonth;
                earnedSalary = Math.round(dailyRate * totalWorkingDays);
            } else if (salaryType === "Weekly") {
                const dailyRate = salaryAmount / 6;
                earnedSalary = Math.round(dailyRate * totalWorkingDays);
            } else if (salaryType === "Biweekly") {
                const dailyRate = salaryAmount / 12;
                earnedSalary = Math.round(dailyRate * totalWorkingDays);
            }
        }

        // KM earnings from logs for current month
        const kmLogs = (employee.kmLogs || []).filter(l => {
            const d = new Date(l.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const kmEarnings = kmLogs.reduce((sum, l) => sum + (l.kmCharge || 0), 0);

        // Calculate advance payments for current month
        const advancePayments = (employee.advancePayments || []).filter(a => {
            const d = new Date(a.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const totalAdvancePaid = advancePayments.reduce((sum, a) => sum + a.amount, 0);

        const totalEarnings = earnedSalary + kmEarnings;
        const netPayable = totalEarnings - cashWithRider - totalAdvancePaid;

        res.status(200).json({
            success: true,
            result: {
                earnedSalary,
                kmEarnings,
                totalEarnings,
                cashWithRider,
                totalAdminCollected,
                totalAdvancePaid,
                netPayable,
                presentDays,
                halfDays,
                totalWorkingDays,
                salaryDetails: employee.salaryDetails,
                recentLedger: (employee.salaryLedger || []).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// DOCUMENT UPLOAD (Base64)
// ========================
exports.uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType, base64Data, fileName } = req.body;

        const validTypes = ["frontId", "backId", "licenseFront", "licenseBack", "photo"];
        if (!validTypes.includes(documentType)) {
            return res.status(400).json({ success: false, message: "Invalid document type" });
        }

        if (!base64Data) {
            return res.status(400).json({ success: false, message: "No file data provided" });
        }

        // Save base64 as file
        const uploadsDir = path.join(__dirname, "..", "..", "uploads", "documents", id);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = fileName ? path.extname(fileName) : ".jpg";
        const savedFileName = `${documentType}_${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, savedFileName);

        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(base64Clean, "base64"));

        const fileUrl = `/uploads/documents/${id}/${savedFileName}`;

        await Employee.findByIdAndUpdate(id, {
            [`documents.${documentType}`]: fileUrl
        });

        res.status(200).json({ success: true, message: "Document uploaded", result: { url: fileUrl } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findById(id).select("documents name");
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        res.status(200).json({ success: true, result: employee.documents || {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateMyRoute = async (req, res) => {
    try {
        const riderId = req.user._id;
        const { route } = req.body;

        if (!Array.isArray(route)) {
            return res.status(400).json({ success: false, message: "Route must be an array of customer IDs" });
        }

        await Employee.findByIdAndUpdate(riderId, { route });

        res.status(200).json({ success: true, message: "Route updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// BULK SALARY SUMMARY (All employees for a month)
// ========================
exports.getAllSalarySummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const m = month ? parseInt(month) - 1 : new Date().getMonth();
        const y = year ? parseInt(year) : new Date().getFullYear();
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const employees = await Employee.find({ isActive: { $ne: false } })
            .select("name mobile role employeeType salaryDetails attendance earnedSalary")
            .lean();

        let overallRiderSalary = 0;
        let overallStaffSalary = 0;
        let overallTotal = 0;

        const employeeSummaries = employees.map(emp => {
            const salaryDetails = emp.salaryDetails || {};
            const isSalaried = salaryDetails.isSalaried;
            const salaryType = salaryDetails.salaryType || "Monthly";
            const salaryAmount = salaryDetails.salary || 0;

            // Filter attendance for the given month
            const monthAttendance = (emp.attendance || []).filter(a => {
                const d = new Date(a.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });

            const presentDays = monthAttendance.filter(a => a.status === "Present").length;
            const halfDays = monthAttendance.filter(a => a.status === "Half Day").length;
            const absentDays = monthAttendance.filter(a => a.status === "Absent").length;
            const leaveDays = monthAttendance.filter(a => a.status === "Leave").length;
            const totalWorkingDays = presentDays + (halfDays * 0.5);

            // Calculate earned salary for this month
            let monthEarned = 0;
            if (isSalaried && salaryAmount > 0) {
                if (salaryType === "Daily") {
                    monthEarned = Math.round(salaryAmount * totalWorkingDays);
                } else if (salaryType === "Monthly") {
                    const dailyRate = salaryAmount / daysInMonth;
                    monthEarned = Math.round(dailyRate * totalWorkingDays);
                } else if (salaryType === "Weekly") {
                    monthEarned = Math.round((salaryAmount / 6) * totalWorkingDays);
                } else if (salaryType === "Biweekly") {
                    monthEarned = Math.round((salaryAmount / 12) * totalWorkingDays);
                }
            }

            if (emp.role === "RIDER") overallRiderSalary += monthEarned;
            else overallStaffSalary += monthEarned;
            overallTotal += monthEarned;

            return {
                _id: emp._id,
                name: emp.name,
                mobile: emp.mobile,
                role: emp.role,
                employeeType: emp.employeeType,
                salaryType,
                salaryAmount,
                isSalaried,
                presentDays,
                halfDays,
                absentDays,
                leaveDays,
                totalWorkingDays,
                monthEarned,
                totalEarnedSalary: emp.earnedSalary || 0
            };
        });

        res.status(200).json({
            success: true,
            period: { month: m + 1, year: y, monthName: new Date(y, m).toLocaleString("default", { month: "long" }) },
            overall: {
                totalSalary: overallTotal,
                riderSalary: overallRiderSalary,
                staffSalary: overallStaffSalary,
                employeeCount: employeeSummaries.length,
                riderCount: employeeSummaries.filter(e => e.role === "RIDER").length,
                staffCount: employeeSummaries.filter(e => e.role !== "RIDER").length,
            },
            employees: employeeSummaries.sort((a, b) => b.monthEarned - a.monthEarned)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTempOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        // Use the dedicated temporaryOtp field
        let otp = employee.temporaryOtp;
        if (!otp) {
            otp = Math.floor(1000 + Math.random() * 9000).toString();
            employee.temporaryOtp = otp;
            await employee.save();
        }

        res.status(200).json({ success: true, result: otp });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
