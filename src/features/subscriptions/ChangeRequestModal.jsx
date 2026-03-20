import { useState, useEffect } from "react";

export const ChangeRequestModal = ({ customer, subscriptions = [], isOpen, onClose, onSave, initialType = "status", initialStatus = "Active" }) => {
    const [formData, setFormData] = useState({
        changeType: initialType,
        scope: "All",
        effectFrom: new Date().toISOString().split("T")[0],
        resumeFrom: "",
        status: initialStatus,
        frequency: "Daily",
        quantity: 1,
        altQuantity: "",
        customSchedule: {
            Monday: 0,
            Tuesday: 0,
            Wednesday: 0,
            Thursday: 0,
            Friday: 0,
            Saturday: 0,
            Sunday: 0
        },
        note: "",
    });

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                changeType: initialType,
                status: initialStatus,
                effectFrom: new Date().toISOString().split("T")[0],
                // Reset custom schedule if needed or keep existing
            }));
        }
    }, [isOpen, initialType, initialStatus]);

    const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState([]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleCustomScheduleChange = (day, value) => {
        setFormData((prev) => ({
            ...prev,
            customSchedule: { ...prev.customSchedule, [day]: parseInt(value) || 0 }
        }));
    };

    const toggleSubscription = (id) => {
        setSelectedSubscriptionIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        onSave({
            ...formData,
            customerId: customer?._id,
            subscriptionIds: formData.scope === "Selected Subscriptions" ? selectedSubscriptionIds : "ALL",
            // Include customSchedule if frequency is Custom
            customSchedule: formData.frequency === "Custom" ? formData.customSchedule : undefined
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Change Request</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="changeType"
                                className="radio radio-primary"
                                checked={formData.changeType === "status"}
                                onChange={() => handleChange("changeType", "status")}
                            />
                            <span>Change Status</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="changeType"
                                className="radio radio-primary"
                                checked={formData.changeType === "pattern"}
                                onChange={() => handleChange("changeType", "pattern")}
                            />
                            <span>Change Pattern</span>
                        </label>
                    </div>

                    <div>
                        <select
                            className="select select-bordered w-full"
                            value={formData.scope}
                            onChange={(e) => handleChange("scope", e.target.value)}
                        >
                            <option value="All">All Active Subscriptions</option>
                            <option value="Selected Subscriptions">Select Specific Subscriptions</option>
                        </select>
                    </div>

                    {formData.scope === "Selected Subscriptions" && (
                        <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                            {subscriptions.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center">No subscriptions found.</p>
                            ) : (
                                subscriptions.map(sub => (
                                    <label key={sub._id} className="flex items-center gap-2 mb-2 last:mb-0 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs checkbox-primary"
                                            checked={selectedSubscriptionIds.includes(sub._id)}
                                            onChange={() => toggleSubscription(sub._id)}
                                        />
                                        <div className="text-xs">
                                            <div className="font-semibold">{sub.product?.name} ({sub.quantity})</div>
                                            <div className="text-gray-500">{sub.frequency} - <span className={sub.status === 'active' ? 'text-green-600' : 'text-red-600'}>{sub.status}</span></div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Effect from</label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={formData.effectFrom}
                                onChange={(e) => handleChange("effectFrom", e.target.value)}
                            />
                        </div>

                        {formData.changeType === "status" && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Resume from (optional)</label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full"
                                    value={formData.resumeFrom}
                                    onChange={(e) => handleChange("resumeFrom", e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {formData.changeType === "status" ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.status}
                                onChange={(e) => handleChange("status", e.target.value)}
                            >
                                <option>Active</option>
                                <option>Paused</option>
                                <option>Cancelled</option>
                                <option>Vacation</option>
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.frequency || ""}
                                    onChange={(e) => handleChange("frequency", e.target.value)}
                                >
                                    <option value="">Select Frequency</option>
                                    <option>Daily</option>
                                    <option>Alternate Days</option>
                                    <option>Weekdays</option>
                                    <option>Weekends</option>
                                    <option>Custom</option>
                                </select>
                            </div>

                            {formData.frequency === "Custom" ? (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Day-wise Quantities</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {DAYS.map(day => (
                                            <div key={day} className="form-control">
                                                <label className="label py-1">
                                                    <span className="label-text text-[10px] font-bold uppercase text-gray-500">{day.slice(0, 3)}</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input input-bordered input-sm w-full font-bold text-center"
                                                    value={formData.customSchedule[day]}
                                                    onChange={(e) => handleCustomScheduleChange(day, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                                        <input
                                            type="number"
                                            className="input input-bordered w-full"
                                            min="1"
                                            value={formData.quantity || 1}
                                            onChange={(e) => handleChange("quantity", parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Alt Qty</label>
                                        <input
                                            type="number"
                                            className="input input-bordered w-full bg-yellow-50"
                                            value={formData.altQuantity || ""}
                                            onChange={(e) => handleChange("altQuantity", e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            rows="3"
                            placeholder="Add a note..."
                            value={formData.note}
                            onChange={(e) => handleChange("note", e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">✕ Close</button>
                    <button onClick={handleSubmit} className="btn btn-info text-white">⬆️ Update</button>
                </div>
            </div>
        </div>
    );
};
