import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminCalendarData } from "../../lib/api/subscriptions";
import { queryClient } from "../../lib/queryClient";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Shared helper: determine if a subscription is scheduled on a given date and what quantity
const getSubscriptionStatusForDate = (sub, dateObj) => {
    const subStart = new Date(sub.startDate);
    subStart.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < subStart) return { isScheduled: false, quantity: 0 };
    if (sub.status === "paused") return { isScheduled: false, quantity: 0 };
    if (sub.status === "cancelled") return { isScheduled: false, quantity: 0 };
    if (sub.endDate) {
        const endDate = new Date(sub.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (checkDate > endDate) return { isScheduled: false, quantity: 0 };
    }

    const dayOfWeek = checkDate.getDay(); // 0=Sun
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

    let baseQuantity = sub.quantity;
    let isScheduled = false;

    switch (sub.frequency) {
        case "Daily":
            isScheduled = true;
            break;

        case "Alternate Days": {
            const startZero = new Date(subStart.getFullYear(), subStart.getMonth(), subStart.getDate());
            const currentZero = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
            const diffTime = currentZero - startZero;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays % 2 === 0) {
                isScheduled = true;
            } else {
                const altQty = sub.alternateQuantity || 0;
                if (altQty > 0) {
                    isScheduled = true;
                    baseQuantity = altQty;
                } else {
                    isScheduled = false;
                }
            }
            break;
        }

        case "Weekdays":
        case "Weekday":
            isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
            break;

        case "Weekends":
        case "Weekend":
            isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
            break;

        case "Custom": {
            const customSchedule = sub.customSchedule;
            if (customSchedule) {
                const qty = typeof customSchedule.get === 'function'
                    ? customSchedule.get(dayName)
                    : customSchedule[dayName];
                if (qty !== undefined && qty > 0) {
                    isScheduled = true;
                    baseQuantity = qty;
                }
            }
            if (!isScheduled && sub.customDays && sub.customDays.includes(dayName)) {
                isScheduled = true;
            }
            break;
        }

        default:
            isScheduled = false;
    }

    return { isScheduled, quantity: isScheduled ? baseQuantity : 0 };
};

export const EditCalendarModal = ({ customer, products = [], isOpen, onClose, onSave }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date().getDate());
    const [searchProduct, setSearchProduct] = useState("");
    const [subscriptions, setSubscriptions] = useState([]);
    const [manualOrders, setManualOrders] = useState([]);

    // Fetch Calendar Data (Subscriptions + Modifications) for the current month view
    const { data: calendarData, refetch } = useQuery({
        queryKey: ['adminCalendar', customer?._id, currentDate.getFullYear(), currentDate.getMonth()],
        queryFn: () => getAdminCalendarData(customer?._id, currentDate.getFullYear(), currentDate.getMonth() + 1),
        enabled: !!customer?._id && !!isOpen
    });

    const modifications = calendarData?.result?.modifications || [];
    const vacation = calendarData?.result?.vacation || {};
    const orders = calendarData?.result?.orders || [];

    useEffect(() => {
        if (customer?.subscriptions) {
            updateSubscriptionsForDate(selectedDate);
        }
    }, [customer, selectedDate, calendarData]);

    const updateSubscriptionsForDate = (date) => {
        if (!date || !customer?.subscriptions) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateObj = new Date(year, month, date);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

        // Map real subscription data to modal state, filtering out cancelled ones
        const mappedSubs = customer.subscriptions
            .filter(sub => sub.status !== 'cancelled')
            .map(sub => {
                // Check for modification
                const mod = modifications.find(m =>
                    m.subscription === sub._id && m.date === dateStr
                );

                if (mod) {
                    return {
                        subscriptionId: sub._id,
                        productId: sub.product?._id || sub.product,
                        productName: sub.product?.name || "Unknown Product",
                        quantity: mod.quantity,
                        pricePerQty: sub.product?.price || 0,
                        frequency: sub.frequency,
                        isModified: true
                    };
                }

                // Check for vacation
                const checkDate = new Date(year, month, date);
                checkDate.setHours(0, 0, 0, 0);

                // Use the user-level vacation data as the source of truth
                const userVacation = customer?.vacation || vacation;

                let isOnVacation = false;
                if (userVacation && userVacation.startDate) {
                    const vStart = new Date(userVacation.startDate);
                    vStart.setHours(0, 0, 0, 0);
                    const vEnd = userVacation.endDate ? new Date(userVacation.endDate) : null;
                    if (vEnd) vEnd.setHours(23, 59, 59, 999);

                    if (checkDate >= vStart && (!vEnd || checkDate <= vEnd)) {
                        isOnVacation = true;
                    }
                }

                // Use the shared helper for frequency logic
                const { isScheduled, quantity: baseQuantity } = getSubscriptionStatusForDate(sub, dateObj);

                return {
                    subscriptionId: sub._id,
                    productId: sub.product?._id || sub.product,
                    productName: sub.product?.name || "Unknown Product",
                    quantity: (isScheduled && !isOnVacation) ? baseQuantity : 0,
                    pricePerQty: sub.product?.price || 0,
                    frequency: sub.frequency,
                    isModified: false,
                    isOnVacation
                };
            });
        setSubscriptions(mappedSubs);

        // Set manual orders for the selected date
        const dayOrders = orders.filter(o => o.deliveryDate === dateStr);
        setManualOrders(dayOrders);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];
        const prevMonth = new Date(year, month, 0);
        for (let i = startingDay - 1; i >= 0; i--) {
            days.push({ date: prevMonth.getDate() - i, isCurrentMonth: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: i, isCurrentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: i, isCurrentMonth: false });
        }
        return days;
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleQuantityChange = (index, value) => {
        const newSubs = [...subscriptions];
        newSubs[index].quantity = Math.max(0, parseInt(value) || 0);
        setSubscriptions(newSubs);
    };

    const addProduct = (product) => {
        if (!subscriptions.find(s => s.productId === product.id)) {
            setSubscriptions([...subscriptions, {
                productId: product.id,
                productName: product.name,
                quantity: 0,
                pricePerQty: product.price,
                frequency: "One Time",
            }]);
        }
    };

    const handleUpdate = async () => {
        if (!selectedDate) {
            alert("Please select a date to update");
            return;
        }

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;

        await onSave({
            date: dateStr,
            subscriptions: subscriptions,
            customerId: customer?._id
        });

        queryClient.invalidateQueries({ queryKey: ['adminCalendar', customer?._id] });

        onClose();
    };

    if (!isOpen) return null;

    const days = getDaysInMonth(currentDate);
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProduct.toLowerCase())
    );

    // Helper to get calendar cell status for visual styling
    const getCellStatus = (dayDate) => {
        if (!customer?.subscriptions) return "none";
        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayDate);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate).padStart(2, '0')}`;

        // Check modifications
        const mods = modifications.filter(m => m.date === dateStr);
        if (mods.some(m => m.status === "skipped" || m.quantity === 0)) return "skipped";

        // Check Vacation
        const userVacation = customer?.vacation || vacation;
        if (userVacation && userVacation.startDate) {
            const vStart = new Date(userVacation.startDate);
            vStart.setHours(0, 0, 0, 0);
            const vEnd = userVacation.endDate ? new Date(userVacation.endDate) : null;
            if (vEnd) vEnd.setHours(23, 59, 59, 999);

            if (dateObj >= vStart && (!vEnd || dateObj <= vEnd)) {
                return "skipped";
            }
        }

        if (mods.length > 0) {
            const now = new Date(); now.setHours(0, 0, 0, 0);
            return dateObj < now ? "delivered" : "scheduled";
        }

        // Check Orders (Manual deliveries)
        const dayOrders = orders.filter(o => o.deliveryDate === dateStr);
        if (dayOrders.length > 0) {
            const now = new Date(); now.setHours(0, 0, 0, 0);
            return dateObj < now ? "delivered" : "scheduled";
        }

        // Check subscriptions
        const hasScheduled = customer.subscriptions.some(sub => {
            if (sub.status === 'cancelled') return false;
            const { isScheduled } = getSubscriptionStatusForDate(sub, dateObj);
            return isScheduled;
        });

        if (hasScheduled) {
            const now = new Date(); now.setHours(0, 0, 0, 0);
            return dateObj < now ? "delivered" : "scheduled";
        }
        return "none";
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-2 md:mx-4 my-4">
                <div className="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Edit Calendar</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-4">
                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-2">
                        <button onClick={prevMonth} className="btn btn-sm btn-ghost">&lt;</button>
                        <h4 className="text-md font-semibold">
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h4>
                        <button onClick={nextMonth} className="btn btn-sm btn-ghost">&gt;</button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0 border border-gray-300 text-sm mb-4">
                        {/* Day Headers */}
                        {DAYS.map((day) => (
                            <div key={day} className="text-center font-semibold py-1 bg-gray-50 border-b border-gray-300">
                                {day}
                            </div>
                        ))}

                        {/* Day Cells */}
                        {days.map((day, index) => {
                            const isToday = day.isCurrentMonth &&
                                day.date === new Date().getDate() &&
                                currentDate.getMonth() === new Date().getMonth() &&
                                currentDate.getFullYear() === new Date().getFullYear();

                            const isSelected = selectedDate === day.date && day.isCurrentMonth;
                            const cellStatus = day.isCurrentMonth ? getCellStatus(day.date) : "none";

                            let statusDot = null;
                            if (cellStatus === "scheduled") statusDot = "bg-green-500";
                            else if (cellStatus === "delivered") statusDot = "bg-blue-500";
                            else if (cellStatus === "skipped") statusDot = "bg-red-500";

                            return (
                                <div
                                    key={index}
                                    className={`
                                        text-center py-2 border-b border-r border-gray-200 cursor-pointer relative
                                        ${!day.isCurrentMonth ? "text-gray-300 pointer-events-none" : "hover:bg-teal-50"}
                                        ${isSelected ? "bg-teal-600 text-white font-bold" : ""}
                                        ${!isSelected && isToday ? "border-2 border-teal-500 font-bold text-teal-700" : ""}
                                    `}
                                    onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
                                >
                                    {day.date}
                                    {statusDot && !isSelected && (
                                        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${statusDot}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Product Search */}
                    <div className="mb-4">
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Search Product"
                            value={searchProduct}
                            onChange={(e) => setSearchProduct(e.target.value)}
                        />
                        {searchProduct && (
                            <div className="bg-white border rounded-lg mt-1 max-h-32 overflow-y-auto shadow-lg">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id || product._id}
                                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => {
                                            addProduct(product);
                                            setSearchProduct("");
                                        }}
                                    >
                                        {product.name} - ₹{product.price}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subscriptions Table */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 px-2">
                            <div className="col-span-6">Product</div>
                            <div className="col-span-2 text-center">Quantity</div>
                            <div className="col-span-2 text-center">Price Per Qty</div>
                            <div className="col-span-2 text-center">Frequency</div>
                        </div>

                        {/* Manual Orders Section */}
                        {manualOrders.map((order) => (
                            <div key={order._id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 items-center p-2 rounded-lg bg-blue-100 border border-blue-200">
                                <div className="w-full sm:col-span-6 text-sm truncate font-medium flex items-center gap-2">
                                    <span className="badge badge-error badge-xs">Extra</span>
                                    {order.products?.map(p => p.name).join(", ")}
                                </div>
                                <div className="w-full sm:col-span-2 text-center font-bold">{order.products?.reduce((sum, p) => sum + p.quantity, 0)}</div>
                                <div className="w-full sm:col-span-2 text-center">₹{order.totalAmount}</div>
                                <div className="w-full sm:col-span-2 text-center text-xs opacity-70">Manual Order</div>
                            </div>
                        ))}

                        {subscriptions.map((sub, index) => (
                            <div
                                key={sub.productId || sub.subscriptionId}
                                className={`flex flex-col sm:grid sm:grid-cols-12 gap-2 items-center p-2 rounded-lg ${sub.quantity > 0 ? "bg-teal-500 text-white" : "bg-gray-100"
                                    }`}
                            >
                                <div className="w-full sm:col-span-6 text-sm truncate font-medium">
                                    {sub.productName}
                                    {sub.quantity === 0 && <span className="text-xs opacity-75"> (Not Scheduled)</span>}
                                </div>
                                <div className="w-full sm:col-span-2 flex justify-between sm:block items-center">
                                    <span className="sm:hidden text-xs">Qty:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        className={`input input-sm input-bordered w-20 sm:w-full text-center ${sub.quantity > 0 ? "bg-white text-black" : ""
                                            }`}
                                        value={sub.quantity}
                                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                                    />
                                </div>
                                <div className="w-full sm:col-span-2 flex justify-between sm:block items-center text-center text-sm">
                                    <span className="sm:hidden text-xs">Price:</span>
                                    <span>{sub.pricePerQty}</span>
                                </div>
                                <div className="w-full sm:col-span-2 flex justify-between sm:block items-center text-center text-sm">
                                    <span className="sm:hidden text-xs">Freq:</span>
                                    <span>{sub.frequency}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 mt-3 justify-center">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Scheduled</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Delivered</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Skipped</div>
                    </div>

                    {/* Help Text */}
                    <div className="mt-4 text-xs text-gray-500 text-center">
                        Click a date to view/edit subscription quantities for that day
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">✕ Close</button>
                    <button onClick={handleUpdate} className="btn btn-success text-white">⬆️ Update</button>
                </div>
            </div>
        </div>
    );
};

