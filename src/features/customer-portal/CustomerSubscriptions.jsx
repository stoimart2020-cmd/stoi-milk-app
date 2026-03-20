import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ChevronRight, Calendar, Pause, Play, Trash2, Edit2, AlertCircle } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import { queryClient } from "../../shared/utils/queryClient";
import toast from "react-hot-toast";
import { useAuth } from "../../shared/hooks/useAuth";
import { useSiteSettings } from "../../shared/hooks/useSiteSettings";
import { getAllProducts } from "../../shared/api/products";
import { createOrder } from "../../shared/api/orders";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";

export const CustomerSubscriptions = () => {
    const { data: userData } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);

    // Fetch subscriptions
    const { data: subscriptionsData, isLoading } = useQuery({
        queryKey: ["my-subscriptions"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/subscriptions");
            return response.data;
        }
    });

    const subscriptions = subscriptionsData?.result || [];

    // Mutations
    const pauseMutation = useMutation({
        mutationFn: async ({ id, paused }) => {
            return await axiosInstance.put(`/api/subscriptions/${id}/pause`, { paused });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to update status")
    });

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

    const cancelMutation = useMutation({
        mutationFn: async (id) => {
            return await axiosInstance.put(`/api/subscriptions/${id}/cancel`);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
            toast.success(data.data.message);
            setConfirmModal({ isOpen: false, id: null });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to cancel subscription");
            setConfirmModal({ isOpen: false, id: null });
        }
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">My Subscriptions</h2>
                    <p className="text-sm text-gray-500">
                        {subscriptions.filter(s => s.status === 'active').length} active subscriptions
                    </p>
                </div>
            </div>

            {/* Subscription List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8">
                        <span className="loading loading-spinner loading-md text-primary"></span>
                    </div>
                ) : subscriptions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} className="text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">No Subscriptions Yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Explore our products to start a subscription</p>
                    </div>
                ) : (
                    subscriptions.map((sub) => (
                        <div key={sub._id} className={`bg-white rounded-xl p-4 shadow-sm border ${sub.status === 'cancelled' ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center overflow-hidden">
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
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{sub.product?.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>Since {new Date(sub.startDate).toLocaleDateString()}</span>
                                            {sub.isTrial && <span className="badge badge-xs badge-info">Trial Pack</span>}
                                        </div>
                                    </div>
                                </div>
                                <span className={`badge ${sub.status === 'active' ? 'badge-success text-white' :
                                    sub.status === 'paused' ? 'badge-warning text-white' :
                                        'badge-error text-white'
                                    } text-xs`}>
                                    {sub.status}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="flex flex-wrap gap-2 text-sm mb-3">
                                <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <span className="text-gray-500">Qty: </span>
                                    <span className="font-semibold text-gray-800">{sub.quantity}</span>
                                </div>
                                <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <span className="text-gray-500">Frequency: </span>
                                    <span className="font-semibold text-gray-800">{sub.frequency}</span>
                                </div>
                                <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                                    <span className="text-gray-500">Price: </span>
                                    <span className="font-semibold text-green-600">₹{sub.product?.price * sub.quantity}/delivery</span>
                                </div>
                            </div>

                            {/* Pause Reason */}
                            {sub.status === 'paused' && sub.pauseReason && (
                                <div className="mb-3 text-xs bg-red-50 text-red-600 p-2 rounded-lg border border-red-100 flex items-start gap-2">
                                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>{sub.pauseReason}</span>
                                </div>
                            )}

                            {/* Actions */}
                            {sub.status !== 'cancelled' && (
                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => setEditingSubscription(sub)}
                                        className="btn btn-ghost btn-xs gap-1"
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    {sub.status === 'active' ? (
                                        <button
                                            onClick={() => pauseMutation.mutate({ id: sub._id, paused: true })}
                                            className="btn btn-ghost btn-xs gap-1 text-orange-600"
                                            disabled={pauseMutation.isPending}
                                        >
                                            <Pause size={14} /> Pause
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => pauseMutation.mutate({ id: sub._id, paused: false })}
                                            className="btn btn-ghost btn-xs gap-1 text-green-600"
                                            disabled={pauseMutation.isPending}
                                        >
                                            <Play size={14} /> Resume
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setConfirmModal({ isOpen: true, id: sub._id })}
                                        className="btn btn-ghost btn-xs gap-1 text-red-600"
                                        disabled={cancelMutation.isPending}
                                    >
                                        <Trash2 size={14} /> Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>



            {/* Add/Edit Modal */}
            {(showAddModal || editingSubscription) && (
                <ProductOrderModal
                    subscription={editingSubscription}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSubscription(null);
                    }}
                />
            )}

            {/* Confirmation Modal */}
            {/* ... */}
        </div>
    );
};

// Add/Edit Subscription OR One-Time Order Modal
export const ProductOrderModal = ({ subscription, product: initialProduct, onClose, orderType = "subscription", initialIsTrial = false }) => {
    const isEdit = !!subscription;
    const isOneTime = orderType === "one-time";

    const { data: userData } = useAuth();
    // Access wallet balance from the correct path: userData (axios response) -> data -> result -> walletBalance
    const walletBalance = userData?.data?.result?.walletBalance || 0;

    const { orderSettings } = useSiteSettings();
    const customerCutoffTime = orderSettings?.customerCutoffTime || "19:00"; // Default 7 PM

    // Delivery Slots from admin settings
    const deliverySlots = (orderSettings?.deliverySlots || []).filter(s => s.isActive);

    const { data: productsData } = useQuery({
        queryKey: ["products"],
        queryFn: getAllProducts,
        enabled: !isEdit && !initialProduct // Fetch only if choosing from list
    });

    const activeProducts = productsData?.result?.filter((p) => p.isActive) || [];

    const [selectedProduct, setSelectedProduct] = useState(subscription?.product || initialProduct || null);

    const getMinDate = () => {
        const now = new Date();

        let effectiveCutoffTime = customerCutoffTime;
        // Default Global Cutoff Day (-1 for Previous Day)
        let effectiveCutoffDay = orderSettings?.customerCutoffDay !== undefined ? orderSettings.customerCutoffDay : -1;

        if (selectedProduct) {
            if (selectedProduct.cutoffTime) effectiveCutoffTime = selectedProduct.cutoffTime;
            if (selectedProduct.cutoffDay !== undefined && selectedProduct.cutoffDay !== null) {
                effectiveCutoffDay = Number(selectedProduct.cutoffDay);
            }
        }

        const [cutoffHour, cutoffMinute] = effectiveCutoffTime.split(":").map(Number);

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const isPastCutoff = (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute));

        const minDate = new Date();
        minDate.setHours(0, 0, 0, 0); // Today

        if (effectiveCutoffDay === 0) {
            // Same Day Delivery Logic (0)
            if (isPastCutoff) {
                minDate.setDate(minDate.getDate() + 1); // Tomorrow
            }
            // Else Today is allowed
        } else {
            // Previous Day Logic (-1) - Default
            minDate.setDate(minDate.getDate() + 1); // Tomorrow Baseline
            if (isPastCutoff) {
                minDate.setDate(minDate.getDate() + 1); // Day After Tomorrow
            }
        }

        // Format manually to keep local date (YYYY-MM-DD)
        const year = minDate.getFullYear();
        const month = String(minDate.getMonth() + 1).padStart(2, '0');
        const day = String(minDate.getDate()).padStart(2, '0');

        // Format cutoff time for display (12-hour)
        const cutoffAmPm = cutoffHour >= 12 ? "PM" : "AM";
        const cutoffHr12 = cutoffHour % 12 || 12;
        const cutoffTimeFormatted = `${cutoffHr12}:${String(cutoffMinute).padStart(2, '0')} ${cutoffAmPm}`;

        return {
            dateString: `${year}-${month}-${day}`,
            isPastCutoff,
            cutoffTimeFormatted,
            nextAvailableDate: minDate
        };
    };

    const { dateString: minDateString, isPastCutoff, cutoffTimeFormatted, nextAvailableDate } = getMinDate();

    const [quantity, setQuantity] = useState(subscription?.quantity || 1);
    const [alternateQuantity, setAlternateQuantity] = useState(subscription?.alternateQuantity || 0);
    const [frequency, setFrequency] = useState(subscription?.frequency || "Daily");
    const [isTrial, setIsTrial] = useState(subscription?.isTrial || initialIsTrial);

    // Delivery Slot
    const [selectedSlot, setSelectedSlot] = useState(
        deliverySlots.length > 0 ? deliverySlots[0].label : ""
    );

    const formatTime12 = (t) => {
        if (!t) return "";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hr = h % 12 || 12;
        return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    // For One-Time, this is Delivery Date. For Subscription, Start Date.
    const [startDate, setStartDate] = useState(
        subscription?.startDate
            ? new Date(subscription.startDate).toISOString().split('T')[0]
            : minDateString // Default to calculated minDate
    );

    useEffect(() => {
        // Update startDate if not editing and minDate changes (e.g. crossing midnight while open)
        if (!isEdit && !subscription?.startDate) {
            setStartDate(minDateString);
        }
    }, [minDateString, isEdit, subscription]);

    // ... (UseEffect for Alternate Days reset - keep as is) ...
    useEffect(() => {
        if (!isOneTime) { // Only for subscription
            if (frequency !== "Alternate Days") {
                setAlternateQuantity(0);
            } else if (isEdit && subscription?.frequency === "Alternate Days") {
                setAlternateQuantity(subscription.alternateQuantity || 0);
            }
        }
    }, [frequency, isEdit, subscription, isOneTime]);

    // ... (Custom Schedule State & Logic - keep as is, but maybe hide if one-time) ...
    const [customSchedule, setCustomSchedule] = useState(subscription?.customSchedule || {});
    const [selectedDays, setSelectedDays] = useState(subscription?.customDays || []);
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const getQtyForDay = (day) => customSchedule[day] || quantity;
    const updateQtyForDay = (day, newQty) => {
        setCustomSchedule(prev => ({ ...prev, [day]: parseInt(newQty) || 1 }));
    };

    // ... (Effect for pre-select days - keep as is) ...
    useEffect(() => {
        if (isOneTime) return;
        if (frequency === 'Weekdays') {
            setSelectedDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
        } else if (frequency === 'Weekends') {
            setSelectedDays(["Saturday", "Sunday"]);
        } else if (frequency === 'Daily' || frequency === 'Alternate Days') {
            setSelectedDays([]);
            setCustomSchedule({});
        }
    }, [frequency, isEdit, isOneTime]);

    // Calculate Estimated Cost
    const getEstimatedCost = () => {
        if (!selectedProduct) return 0;

        let price = selectedProduct.price;
        if (isOneTime && selectedProduct.oneTimePriceEnabled && selectedProduct.oneTimePrice) {
            price = selectedProduct.oneTimePrice;
        } else if (isTrial && selectedProduct.trialEnabled && selectedProduct.trialPrice) {
            price = selectedProduct.trialPrice;
        }

        if (isTrial) {
            // Full trial cost
            const duration = selectedProduct.trialDuration || 7;
            return price * duration;
        } else if (isOneTime) {
            // One time order cost
            return price * quantity;
        } else {
            // Daily subscription cost (just for display)
            return price * quantity; // Approximate daily
        }
    };

    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isOneTime) {
                // One Time Order - use oneTimePrice if enabled, otherwise use regular price
                const effectivePrice = selectedProduct.oneTimePriceEnabled && selectedProduct.oneTimePrice
                    ? selectedProduct.oneTimePrice
                    : selectedProduct.price;

                return await createOrder({
                    products: [{
                        product: data.product,
                        quantity: data.quantity,
                        price: effectivePrice
                    }],
                    totalAmount: effectivePrice * data.quantity,
                    deliveryDate: data.startDate,
                    paymentMode: "WALLET",
                    deliverySlot: data.deliverySlot || undefined,
                });
            } else {
                // Subscription
                let res;
                if (isEdit) {
                    res = await axiosInstance.put(`/api/subscriptions/${subscription._id}`, data);
                } else {
                    res = await axiosInstance.post("/api/subscriptions", data);
                }
                return res.data;
            }
        },
        onSuccess: (data) => {
            // data is consistently response.data (payload)
            toast.success(data.message || (isOneTime ? "Order placed successfully" : "Subscription added successfully"));
            queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["my-orders"] }); // Invalidate orders too
            queryClient.invalidateQueries({ queryKey: ["user"] }); // Refresh wallet balance
            queryClient.invalidateQueries({ queryKey: ["trialEligibility"] }); // Refresh trial eligibility
            onClose();
        },
        onError: (error) => {
            if (error.response?.data?.shortfall) {
                const { requiredAmount, currentBalance, shortfall } = error.response.data;
                toast.error(
                    <div>
                        <p className="font-bold">Insufficient Wallet Balance</p>
                        <p className="text-sm mt-1">Required: ₹{requiredAmount}</p>
                        <p className="text-sm">Current: ₹{currentBalance}</p>
                        <p className="text-sm font-semibold text-red-200">Shortfall: ₹{shortfall}</p>
                        <div className="mt-2">
                            <a href="/customer/wallet" className="btn btn-xs btn-white text-error">Recharge Now</a>
                        </div>
                    </div>,
                    { duration: 5000, position: "top-center", className: "bg-red-600 text-white" }
                );
            } else {
                let errorMsg = "An unexpected error occurred.";
                if (error) {
                    if (error.response && error.response.data && error.response.data.message) {
                        errorMsg = error.response.data.message;
                    } else if (error.message) {
                        errorMsg = error.message;
                    }
                }
                console.error("Order creation failed - Full Error Object:", JSON.stringify(error, null, 2));
                toast.error(errorMsg);
            }
        }
    });

    const handleSubmit = () => {
        if (!selectedProduct) return;

        let finalCustomSchedule = {};
        if (!isOneTime && ["Custom", "Weekdays", "Weekends"].includes(frequency)) {
            if (selectedDays.length === 0) {
                toast.error("Please select at least one day");
                return;
            }
            selectedDays.forEach(day => {
                finalCustomSchedule[day] = getQtyForDay(day);
            });
        }

        const data = {
            product: selectedProduct._id,
            quantity: isTrial ? 1 : quantity, // Force quantity=1 for trials
            frequency: isOneTime ? "One Time" : (isTrial ? "Daily" : frequency), // Force Daily for trials
            alternateQuantity: (!isOneTime && !isTrial && frequency === "Alternate Days") ? alternateQuantity : 0,
            customDays: (isOneTime || isTrial) ? [] : selectedDays, // No custom days for trials
            customSchedule: (isOneTime || isTrial) ? {} : finalCustomSchedule, // No custom schedule for trials
            startDate,
            isTrial: !isEdit && isTrial
        };

        // Attach delivery slot if available
        if (deliverySlots.length > 0 && selectedSlot) {
            const slotObj = deliverySlots.find(s => s.label === selectedSlot);
            if (slotObj) {
                data.deliverySlot = {
                    label: slotObj.label,
                    startTime: slotObj.startTime,
                    endTime: slotObj.endTime
                };
            }
        }

        mutation.mutate(data);
    };

    const toggleDay = (day) => { /* ... keep as is ... */
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
            const newSchedule = { ...customSchedule };
            delete newSchedule[day];
            setCustomSchedule(newSchedule);
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md">
                <h3 className="font-bold text-lg mb-4">
                    {isOneTime ? "Buy Once" : (isEdit ? "Edit Subscription" : "Add Subscription")}
                </h3>

                {/* Wallet Balance Display */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Wallet Balance</span>
                    <span className={`font-bold ${walletBalance < getEstimatedCost() ? "text-red-500" : "text-green-600"}`}>
                        ₹{walletBalance.toFixed(2)}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Product Selection (Same) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
                        {isEdit || initialProduct ? (
                            <div className="p-3 rounded-lg border border-green-500 bg-green-50 flex items-center gap-3">
                                {selectedProduct ? (
                                    <>
                                        <img
                                            src={
                                                selectedProduct.image?.startsWith("http")
                                                    ? selectedProduct.image
                                                    : selectedProduct.image
                                                        ? (selectedProduct.image.includes("uploads/")
                                                            ? `${BASE_URL}${selectedProduct.image.startsWith("/") ? "" : "/"}${selectedProduct.image}`
                                                            : `${BASE_URL}/uploads/${selectedProduct.image}`)
                                                        : "/images/logo.png"
                                            }
                                            onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                                            alt=""
                                            className="w-12 h-12 object-contain"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-800">{selectedProduct.name}</p>
                                            {isTrial && selectedProduct.trialEnabled ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-blue-600 font-bold">₹{selectedProduct.trialPrice || selectedProduct.price}</p>
                                                        <span className="badge badge-xs badge-info">Trial - {selectedProduct.trialDuration || 7} Days</span>
                                                        {selectedProduct.trialPrice && selectedProduct.trialPrice < selectedProduct.price && (
                                                            <span className="text-xs text-gray-500 line-through">₹{selectedProduct.price}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-blue-500">Try for {selectedProduct.trialDuration || 7} days at special price</p>
                                                </div>
                                            ) : isOneTime && selectedProduct.oneTimePriceEnabled && selectedProduct.oneTimePrice ? (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-green-600 font-bold">₹{selectedProduct.oneTimePrice}</p>
                                                    <span className="badge badge-xs badge-success">One-Time</span>
                                                    {selectedProduct.oneTimePrice !== selectedProduct.price && (
                                                        <span className="text-xs text-gray-500 line-through">₹{selectedProduct.price}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-green-600 font-bold">₹{selectedProduct.price}</p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-red-500 text-sm">Product no longer available</div>
                                )}
                            </div>
                        ) : (
                            // List selection logic (same as before)
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                {activeProducts.map((product) => (
                                    <div
                                        key={product._id}
                                        onClick={() => setSelectedProduct(product)}
                                        className={`p-3 rounded-lg border cursor-pointer transition ${selectedProduct?._id === product._id
                                            ? "border-green-500 bg-green-50"
                                            : "border-gray-200 hover:border-green-300"
                                            }`}
                                    >
                                        {/* Image Logic Same */}
                                        <img
                                            src={
                                                product.image?.startsWith("http")
                                                    ? product.image
                                                    : product.image
                                                        ? (product.image.includes("uploads/")
                                                            ? `${BASE_URL}${product.image.startsWith("/") ? "" : "/"}${product.image}`
                                                            : `${BASE_URL}/uploads/${product.image}`)
                                                        : "/images/logo.png"
                                            }
                                            onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                                            alt=""
                                            className="w-12 h-12 object-contain mx-auto mb-1"
                                        />
                                        <p className="text-xs font-medium text-center truncate">{product.name}</p>
                                        <p className="text-xs text-green-600 text-center font-bold">₹{product.price}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Frequency - HIDE IF ONE TIME OR TRIAL */}
                    {!isOneTime && !isTrial && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Frequency</label>
                            <select
                                className="select select-bordered w-full"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                            >
                                <option value="Daily">Daily</option>
                                <option value="Alternate Days">Alternate Days</option>
                                <option value="Weekdays">Weekdays (Mon-Fri)</option>
                                <option value="Weekends">Weekends (Sat-Sun)</option>
                                <option value="Custom">Custom Days</option>
                            </select>
                        </div>
                    )}

                    {/* Trial Pack Info - Show for trials */}
                    {!isOneTime && isTrial && selectedProduct && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h4 className="font-semibold text-blue-900 text-sm">Trial Pack Details</h4>
                                    <p className="text-xs text-blue-700 mt-1">
                                        • Total Cost: <span className="font-bold">₹{getEstimatedCost()}</span><br />
                                        • Daily delivery for {selectedProduct.trialDuration || 7} days<br />
                                        • 1 unit per day<br />
                                        • Starts from your selected date
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quantity Logic - HIDE FOR TRIAL */}
                    {!isTrial && (isOneTime || frequency === "Daily" || frequency === "Alternate Days") ? (
                        <div className="space-y-3">
                            {/* Day 1 Quantity (Standard) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {isOneTime ? "Quantity" : (frequency === "Alternate Days" ? "Quantity (Day 1)" : "Quantity (Daily)")}
                                </label>
                                <div className="join w-full">
                                    <button className="btn join-item" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="input input-bordered join-item w-full text-center"
                                    />
                                    <button className="btn join-item" onClick={() => setQuantity(quantity + 1)}>+</button>
                                </div>
                            </div>

                            {/* Alternate Quantity (Only for Alternate Days AND Subscription) */}
                            {!isOneTime && frequency === "Alternate Days" && (
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                    <label className="block text-sm font-medium text-gray-800 mb-1">Quantity (Day 2 / Alternate)</label>
                                    <p className="text-xs text-gray-500 mb-2">Set to 0 to skip delivery on alternate days.</p>
                                    <div className="join w-full bg-white">
                                        <button className="btn join-item btn-sm" onClick={() => setAlternateQuantity(Math.max(0, alternateQuantity - 1))}>-</button>
                                        <input
                                            type="number"
                                            min="0"
                                            value={alternateQuantity}
                                            onChange={(e) => setAlternateQuantity(parseInt(e.target.value) || 0)}
                                            className="input input-bordered input-sm join-item w-full text-center"
                                        />
                                        <button className="btn join-item btn-sm" onClick={() => setAlternateQuantity(alternateQuantity + 1)}>+</button>
                                    </div>
                                    <div className="mt-2 text-xs font-semibold text-orange-700 text-center">
                                        {alternateQuantity === 0 ? "Skipping delivery on alternate days" : "Alternating quantities: " + quantity + " then " + alternateQuantity}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Per Day Quantity Logic (Only for Subscription Custom Modes) */
                        !isOneTime && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule & Quantities</label>

                                {/* Day Toggles (Only for Custom) */}
                                {frequency === "Custom" && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {daysOfWeek.map(day => (
                                            <button
                                                key={day}
                                                onClick={() => toggleDay(day)}
                                                className={`btn btn-xs ${selectedDays.includes(day) ? 'btn-primary text-white' : 'btn-ghost border-gray-300'}`}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Quantity Rows for Selected Days */}
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {selectedDays.length === 0 ? (
                                        <p className="text-xs text-gray-500 text-center py-2">Select days to configure</p>
                                    ) : (
                                        daysOfWeek.filter(day => selectedDays.includes(day)).map(day => (
                                            <div key={day} className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-gray-700 w-24">{day}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        className="btn btn-xs btn-circle btn-ghost bg-gray-200"
                                                        onClick={() => updateQtyForDay(day, Math.max(1, getQtyForDay(day) - 1))}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-6 text-center font-bold">{getQtyForDay(day)}</span>
                                                    <button
                                                        className="btn btn-xs btn-circle btn-ghost bg-gray-200"
                                                        onClick={() => updateQtyForDay(day, getQtyForDay(day) + 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {/* Start/Delivery Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{isOneTime ? "Delivery Date" : "Start Date"}</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={minDateString}
                            className="input input-bordered w-full"
                        />
                        {isPastCutoff && (
                            <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                                <p className="text-xs text-amber-700">
                                    Today's cutoff (<strong>{cutoffTimeFormatted}</strong>) has passed.
                                    Next available date: <strong>{nextAvailableDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Delivery Time Slot Picker */}
                    {deliverySlots.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time Slot</label>
                            <div className="grid grid-cols-2 gap-2">
                                {deliverySlots.map((slot) => (
                                    <button
                                        key={slot.label}
                                        type="button"
                                        onClick={() => setSelectedSlot(slot.label)}
                                        className={`p-3 rounded-lg border text-center transition-all ${selectedSlot === slot.label
                                            ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                            : 'border-gray-200 hover:border-green-300 bg-white'
                                            }`}
                                    >
                                        <p className={`text-sm font-semibold ${selectedSlot === slot.label ? 'text-green-700' : 'text-gray-800'
                                            }`}>{slot.label}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary text-white"
                        disabled={!selectedProduct || mutation.isPending}
                        onClick={handleSubmit}
                    >
                        {mutation.isPending ? (isOneTime ? "Placing Order..." : "Saving...") : (isOneTime ? "Place Order" : (isEdit ? "Update Subscription" : "Add Subscription"))}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

