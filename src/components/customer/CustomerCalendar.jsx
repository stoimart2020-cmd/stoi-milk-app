import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Plus, Minus, Save } from "lucide-react";
import { axiosInstance } from "../../lib/axios";
import { queryClient } from "../../lib/queryClient";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";

// Shared helper to determine if a subscription is active on a given date,
// and what quantity is expected. Returns { isScheduled, quantity }.
const getSubscriptionStatusForDate = (sub, date) => {
    const subStart = new Date(sub.startDate);
    subStart.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < subStart) return { isScheduled: false, quantity: 0 };
    if (sub.status === "paused") return { isScheduled: false, quantity: 0 };
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
                // Even days (0, 2, 4...) -> Standard Quantity
                isScheduled = true;
            } else {
                // Odd days -> Alternate Quantity
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
            // Mon=1 ... Fri=5
            isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
            break;

        case "Weekends":
            // Sat=6, Sun=0
            isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
            break;

        case "Custom": {
            // Check customSchedule Map first (has per-day quantities), then legacy customDays array
            const customSchedule = sub.customSchedule;
            if (customSchedule) {
                // Mongoose Map: can come as plain object or Map
                const qty = typeof customSchedule.get === 'function'
                    ? customSchedule.get(dayName)
                    : customSchedule[dayName];
                if (qty !== undefined && qty > 0) {
                    isScheduled = true;
                    baseQuantity = qty;
                }
            }
            // Fallback to customDays array
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

export const CustomerCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [editedQuantities, setEditedQuantities] = useState({});

    // Fetch calendar data for the current month
    const { data: calendarData, isLoading } = useQuery({
        queryKey: ["calendar", currentDate.getFullYear(), currentDate.getMonth() + 1],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/subscriptions/calendar", {
                params: {
                    year: currentDate.getFullYear(),
                    month: currentDate.getMonth() + 1
                }
            });
            return response.data;
        }
    });

    const subscriptions = calendarData?.result?.subscriptions || [];
    const modifications = calendarData?.result?.modifications || [];
    const vacation = calendarData?.result?.vacation || {};
    const orders = calendarData?.result?.orders || [];

    // Reset edited quantities when date changes
    useEffect(() => {
        setEditedQuantities({});
    }, [selectedDate]);

    // Helper to get days in month
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);

    // Navigation
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Format a day number to YYYY-MM-DD string using local date
    const formatDateStr = (day) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${month}-${d}`;
    };

    // Check status for a specific date
    const getDateStatus = (day) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = formatDateStr(day);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Check Vacation
        if (vacation.isActive && vacation.startDate && vacation.endDate) {
            const start = new Date(vacation.startDate);
            const end = new Date(vacation.endDate);
            if (date >= start && date <= end) return "vacation";
        }

        // Check Modifications
        const mods = modifications.filter(m => {
            const modDate = typeof m.date === 'string' ? m.date : new Date(m.date).toISOString().split('T')[0];
            return modDate === dateStr;
        });
        if (mods.some(m => m.status === "skipped" || m.quantity === 0)) return "skipped";
        // Modified dates count as delivered (past) or scheduled (future)
        if (mods.length > 0) {
            return date < now ? "delivered" : "scheduled";
        }

        // Check Subscriptions using the shared helper
        const activeSubs = subscriptions.filter(sub => {
            const { isScheduled } = getSubscriptionStatusForDate(sub, date);
            return isScheduled;
        });

        // Check Orders for this date
        const dayOrders = orders.filter(o => {
            const deliveryDate = typeof o.deliveryDate === 'string' ? o.deliveryDate : new Date(o.deliveryDate).toISOString().split('T')[0];
            return deliveryDate === dateStr;
        });

        if (activeSubs.length > 0 || dayOrders.length > 0) {
            if (date < now) return "delivered"; // Past
            return "scheduled"; // Future
        }

        return "none";
    };

    const handleDateClick = (day) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(date);
    };

    // Mutation for saving changes
    const mutation = useMutation({
        mutationFn: async ({ updates }) => {
            // Process all updates sequentially
            for (const update of updates) {
                await axiosInstance.put("/api/subscriptions/modification", update);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
            toast.success("Changes saved successfully");
            setEditedQuantities({});
        },
        onError: (err) => toast.error("Failed to save changes")
    });

    const handleSave = () => {
        if (!selectedDate) return;

        // Format date as YYYY-MM-DD using local time to avoid timezone shifts
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const updates = Object.entries(editedQuantities).map(([subscriptionId, quantity]) => ({
            subscriptionId,
            date: dateStr,
            quantity
        }));

        if (updates.length === 0) {
            toast("No changes to save");
            return;
        }

        mutation.mutate({ updates });
    };

    // Get subscriptions for selected date using the shared helper
    const getSelectedDateSubscriptions = () => {
        if (!selectedDate) return [];
        return subscriptions
            .filter(sub => {
                const { isScheduled } = getSubscriptionStatusForDate(sub, selectedDate);
                return isScheduled;
            })
            .map(sub => {
                const { quantity } = getSubscriptionStatusForDate(sub, selectedDate);
                return { ...sub, _scheduledQty: quantity };
            });
    };

    const selectedSubscriptions = getSelectedDateSubscriptions();

    // Get orders for selected date
    const getSelectedDateOrders = () => {
        if (!selectedDate) return [];
        let dateStr = "";
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;

        return orders.filter(o => {
            const deliveryDate = typeof o.deliveryDate === 'string' ? o.deliveryDate : new Date(o.deliveryDate).toISOString().split('T')[0];
            return deliveryDate === dateStr;
        });
    };

    const selectedOrders = getSelectedDateOrders();

    // Format date string locally for comparison
    let dateStr = "";
    if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
    }
    const isVacation = selectedDate && vacation.isActive &&
        new Date(vacation.startDate) <= selectedDate &&
        new Date(vacation.endDate) >= selectedDate;

    return (
        <div className="space-y-4 max-w-md mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                <h2 className="text-base font-bold text-gray-800">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="btn btn-xs btn-ghost btn-circle">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextMonth} className="btn btn-xs btn-ghost btn-circle">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white p-3 rounded-xl shadow-sm">
                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square"></div>
                    ))}

                    {/* Days */}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1;
                        const status = getDateStatus(day);
                        const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();

                        let bgClass = "bg-gray-50 text-gray-700";
                        if (status === "vacation") bgClass = "bg-purple-50 text-purple-700 border-purple-100";
                        else if (status === "skipped") bgClass = "bg-red-50 text-red-700 border-red-100";
                        else if (status === "delivered") bgClass = "bg-blue-50 text-blue-700 border-blue-100";
                        else if (status === "scheduled") bgClass = "bg-green-50 text-green-600 border-green-100";

                        if (isSelected) bgClass = "ring-2 ring-green-500 ring-offset-1 " + bgClass;

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium border transition hover:brightness-95 ${bgClass}`}
                            >
                                {day}
                                {status !== "none" && status !== "vacation" && (
                                    <div className={`w-1 h-1 rounded-full mt-0.5 ${status === "skipped" ? "bg-red-500" :
                                        status === "delivered" ? "bg-blue-500" :
                                            "bg-green-500"
                                        }`}></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 mt-3 justify-center">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Scheduled</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Delivered</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Skipped</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Vacation</div>
                </div>
            </div>

            {/* Selected Date Details (Bottom Panel) */}
            {selectedDate && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800">
                            {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h3>
                        {Object.keys(editedQuantities).length > 0 && (
                            <button
                                onClick={handleSave}
                                disabled={mutation.isPending}
                                className="btn btn-sm btn-primary text-white gap-2"
                            >
                                {mutation.isPending ? <span className="loading loading-spinner loading-xs"></span> : <Save size={14} />}
                                Save
                            </button>
                        )}
                    </div>

                    {isVacation ? (
                        <div className="bg-purple-50 p-3 rounded-lg text-center text-purple-700 border border-purple-100">
                            <p className="font-medium text-sm">You are on vacation 🏖️</p>
                            <p className="text-xs mt-1">No deliveries scheduled.</p>
                        </div>
                    ) : (selectedSubscriptions.length === 0 && selectedOrders.length === 0) ? (
                        <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p>No deliveries scheduled for this day.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedSubscriptions.map(sub => {
                                // Check for modification (server data)
                                const mod = modifications.find(m => {
                                    const modDate = typeof m.date === 'string' ? m.date : new Date(m.date).toISOString().split('T')[0];
                                    return m.subscription === sub._id && modDate === dateStr;
                                });

                                // Use the scheduled quantity from our helper as the base
                                const scheduledQty = sub._scheduledQty || sub.quantity;
                                // Determine current quantity (local edit > server mod > scheduled qty)
                                const serverQty = mod ? mod.quantity : scheduledQty;
                                const currentQty = editedQuantities[sub._id] !== undefined ? editedQuantities[sub._id] : serverQty;
                                const isModified = editedQuantities[sub._id] !== undefined && editedQuantities[sub._id] !== serverQty;
                                const isSkipped = currentQty === 0;

                                return (
                                    <div key={sub._id} className={`bg-white border rounded-lg p-2 flex items-center gap-3 ${isModified ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                                        <img
                                            src={
                                                sub.product?.image?.startsWith("http")
                                                    ? sub.product.image
                                                    : sub.product?.image
                                                        ? (sub.product.image.includes("uploads/")
                                                            ? `${BASE_URL}${sub.product.image.startsWith("/") ? "" : "/"}${sub.product.image}`
                                                            : `${BASE_URL}/uploads/${sub.product.image}`)
                                                        : "/images/logo.png"
                                            }
                                            onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                                            alt=""
                                            className="w-10 h-10 rounded-md object-cover bg-gray-50"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-800 truncate">{sub.product?.name}</p>
                                            <div className="flex gap-2 items-center">
                                                <p className="text-[10px] text-gray-500">Scheduled: {scheduledQty}</p>
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 rounded-full">Subscription</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                            <button
                                                onClick={() => setEditedQuantities(prev => ({ ...prev, [sub._id]: Math.max(0, currentQty - 1) }))}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-red-600 transition"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className={`font-bold w-4 text-center text-sm ${isSkipped ? "text-red-500" : "text-gray-800"}`}>
                                                {currentQty}
                                            </span>
                                            <button
                                                onClick={() => setEditedQuantities(prev => ({ ...prev, [sub._id]: currentQty + 1 }))}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-green-600 transition"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Render Orders */}
                            {selectedOrders.map(order => (
                                order.products.map((item, idx) => (
                                    <div key={`${order._id}-${idx}`} className="bg-white border rounded-lg p-2 flex items-center gap-3">
                                        <img
                                            src={
                                                item.product?.image?.startsWith("http")
                                                    ? item.product.image
                                                    : item.product?.image
                                                        ? (item.product.image.includes("uploads/")
                                                            ? `${BASE_URL}${item.product.image.startsWith("/") ? "" : "/"}${item.product.image}`
                                                            : `${BASE_URL}/uploads/${item.product.image}`)
                                                        : "/images/logo.png"
                                            }
                                            onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                                            alt=""
                                            className="w-10 h-10 rounded-md object-cover bg-gray-50"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-800 truncate">{item.product?.name || 'Product'}</p>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-gray-500">Fixed Quantity: {item.quantity}</span>
                                                <span className="bg-purple-100 text-purple-700 font-medium px-1.5 py-0.5 rounded-full">One-Time Order</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-200 opacity-60">
                                            <span className="font-bold w-8 text-center text-sm text-gray-800">
                                                {item.quantity}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
