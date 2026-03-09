import { useState, useEffect } from "react";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const EditSubscriptionModal = ({ customer, subscription, products = [], isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        subscriptionType: "Subscription",
        product: "",
        startDate: "",
        hasEndDate: false,
        endDate: "",
        frequency: "",
        quantity: 1,
        altQuantity: "",
        customDays: [],
        customSchedule: {},
        status: "active",
        note: ""
    });

    useEffect(() => {
        if (subscription) {
            // Parse customSchedule from Mongoose Map or plain object
            let parsedSchedule = {};
            if (subscription.customSchedule) {
                if (typeof subscription.customSchedule.entries === 'function') {
                    // Mongoose Map
                    for (const [key, value] of subscription.customSchedule.entries()) {
                        parsedSchedule[key] = value;
                    }
                } else if (typeof subscription.customSchedule === 'object') {
                    parsedSchedule = { ...subscription.customSchedule };
                }
            }

            setFormData({
                subscriptionType: subscription.isTrial ? "Trial" : "Subscription",
                product: subscription.product?._id || subscription.product || "",
                startDate: subscription.startDate ? new Date(subscription.startDate).toISOString().split('T')[0] : "",
                hasEndDate: !!subscription.endDate,
                endDate: subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : "",
                frequency: subscription.frequency || "",
                quantity: subscription.quantity || 1,
                altQuantity: subscription.alternateQuantity || 0,
                customDays: subscription.customDays || [],
                customSchedule: parsedSchedule,
                status: subscription.status || "active",
                note: subscription.note || ""
            });
        }
    }, [subscription]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // When frequency changes, pre-populate customDays
    useEffect(() => {
        if (formData.frequency === "Weekdays") {
            setFormData(prev => ({
                ...prev,
                customDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            }));
        } else if (formData.frequency === "Weekends") {
            setFormData(prev => ({
                ...prev,
                customDays: ["Saturday", "Sunday"]
            }));
        } else if (formData.frequency === "Daily" || formData.frequency === "Alternate Days") {
            setFormData(prev => ({
                ...prev,
                customDays: [],
                customSchedule: {}
            }));
        }
    }, [formData.frequency]);

    const toggleDay = (day) => {
        setFormData(prev => {
            const isSelected = prev.customDays.includes(day);
            const newDays = isSelected
                ? prev.customDays.filter(d => d !== day)
                : [...prev.customDays, day];
            const newSchedule = { ...prev.customSchedule };
            if (isSelected) {
                delete newSchedule[day];
            }
            return { ...prev, customDays: newDays, customSchedule: newSchedule };
        });
    };

    const getQtyForDay = (day) => formData.customSchedule[day] || formData.quantity;

    const updateQtyForDay = (day, newQty) => {
        setFormData(prev => ({
            ...prev,
            customSchedule: { ...prev.customSchedule, [day]: Math.max(1, parseInt(newQty) || 1) }
        }));
    };

    const handleSubmit = () => {
        // Build customSchedule for Custom/Weekdays/Weekends
        let finalCustomSchedule = {};
        if (["Custom", "Weekdays", "Weekends"].includes(formData.frequency)) {
            formData.customDays.forEach(day => {
                finalCustomSchedule[day] = getQtyForDay(day);
            });
        }

        onSave({
            subscriptionId: subscription._id,
            ...formData,
            alternateQuantity: formData.altQuantity,
            customDays: formData.customDays,
            customSchedule: finalCustomSchedule
        });
    };

    if (!isOpen) return null;

    const showCustomDaysUI = ["Custom", "Weekdays", "Weekends"].includes(formData.frequency);
    const showAlternateQty = formData.frequency === "Alternate Days";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
                <div className="bg-base-200 p-4 rounded-t-lg">
                    <div className="text-sm breadcrumbs">
                        <ul>
                            <li>HOME</li>
                            <li>CUSTOMERS</li>
                            <li>{customer?.name?.toUpperCase()}</li>
                            <li className="font-bold">EDIT SUBSCRIPTION</li>
                        </ul>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                        >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <input
                            type="text"
                            className="input input-bordered w-full bg-gray-100"
                            value={subscription?.product?.name || ""}
                            disabled
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={formData.startDate}
                                onChange={(e) => handleChange("startDate", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={formData.endDate}
                                onChange={(e) => handleChange("endDate", e.target.value)}
                                min={formData.startDate}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.frequency}
                                onChange={(e) => handleChange("frequency", e.target.value)}
                            >
                                <option value="Daily">Daily</option>
                                <option value="Alternate Days">Alternate Days</option>
                                <option value="Weekdays">Weekdays (Mon-Fri)</option>
                                <option value="Weekends">Weekends (Sat-Sun)</option>
                                <option value="Custom">Custom Days</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {showAlternateQty ? "Quantity (Day 1)" : "Quantity"}
                            </label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>

                    {/* Alternate Days Quantity */}
                    {showAlternateQty && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <label className="block text-sm font-medium text-gray-800 mb-1">Quantity (Day 2 / Alternate)</label>
                            <p className="text-xs text-gray-500 mb-2">Set to 0 to skip delivery on alternate days.</p>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                min="0"
                                value={formData.altQuantity}
                                onChange={(e) => handleChange("altQuantity", parseInt(e.target.value) || 0)}
                            />
                            <div className="mt-2 text-xs font-semibold text-orange-700 text-center">
                                {formData.altQuantity === 0
                                    ? "Skipping delivery on alternate days"
                                    : `Alternating quantities: ${formData.quantity} then ${formData.altQuantity}`}
                            </div>
                        </div>
                    )}

                    {/* Custom Days Selection */}
                    {showCustomDaysUI && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule & Quantities</label>

                            {/* Day Toggles (Only for Custom) */}
                            {formData.frequency === "Custom" && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`btn btn-xs ${formData.customDays.includes(day) ? 'btn-primary text-white' : 'btn-ghost border-gray-300'}`}
                                        >
                                            {day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Per-Day Quantity Rows */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {formData.customDays.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center py-2">Select days to configure</p>
                                ) : (
                                    DAYS_OF_WEEK.filter(day => formData.customDays.includes(day)).map(day => (
                                        <div key={day} className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-gray-700 w-24">{day}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-circle btn-ghost bg-gray-200"
                                                    onClick={() => updateQtyForDay(day, getQtyForDay(day) - 1)}
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center font-bold">{getQtyForDay(day)}</span>
                                                <button
                                                    type="button"
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
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            value={formData.note}
                            onChange={(e) => handleChange("note", e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">✕ Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-success text-white">✓ Update</button>
                </div>
            </div>
        </div>
    );
};
