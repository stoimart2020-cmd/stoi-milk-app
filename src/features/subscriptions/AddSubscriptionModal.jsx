import { useState } from "react";

export const AddSubscriptionModal = ({ customer, products = [], isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        subscriptionType: "Subscription",
        product: "",
        startDate: "",
        hasEndDate: false,
        endDate: "",
        frequency: "",
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
        createdBy: "",
    });

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleCustomScheduleChange = (day, value) => {
        setFormData((prev) => ({
            ...prev,
            customSchedule: { ...prev.customSchedule, [day]: parseInt(value) || 0 }
        }));
    };

    const handleSubmit = () => {
        onSave({ ...formData, customerId: customer?._id });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
                <div className="bg-base-200 p-4 rounded-t-lg">
                    <div className="text-sm breadcrumbs">
                        <ul>
                            <li>HOME</li>
                            <li>CUSTOMERS</li>
                            <li>{customer?.name?.toUpperCase()}</li>
                            <li className="font-bold">ADD SUBSCRIPTION</li>
                        </ul>
                    </div>
                    <h3 className="text-xl font-bold mt-2">ADD SUBSCRIPTION</h3>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Type *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="subscriptionType"
                                    className="radio radio-primary"
                                    checked={formData.subscriptionType === "Subscription"}
                                    onChange={() => handleChange("subscriptionType", "Subscription")}
                                />
                                <span>Subscription</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="subscriptionType"
                                    className="radio radio-primary"
                                    checked={formData.subscriptionType === "Trial"}
                                    onChange={() => handleChange("subscriptionType", "Trial")}
                                />
                                <span>Trial</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.product}
                            onChange={(e) => handleChange("product", e.target.value)}
                        >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={formData.startDate}
                            onChange={(e) => handleChange("startDate", e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={formData.hasEndDate}
                                onChange={(e) => handleChange("hasEndDate", e.target.checked)}
                            />
                            <span className="text-sm">Set Subscription End Date</span>
                        </label>
                        {formData.hasEndDate && (
                            <input
                                type="date"
                                className="input input-bordered w-full mt-2"
                                value={formData.endDate}
                                onChange={(e) => handleChange("endDate", e.target.value)}
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.frequency}
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
                            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider text-center">Day-wise Quantities</label>
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
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Qty *</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => handleChange("quantity", parseInt(e.target.value))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alt Qty <span className="text-info">ℹ</span>
                                </label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full bg-yellow-50"
                                    value={formData.altQuantity}
                                    onChange={(e) => handleChange("altQuantity", e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.createdBy}
                            onChange={(e) => handleChange("createdBy", e.target.value)}
                        >
                            <option value="">Select delivery boy</option>
                            <option>Jeffry Vivek</option>
                            <option>Admin</option>
                        </select>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">✕ Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-success text-white">✓ Save</button>
                </div>
            </div>
        </div>
    );
};
