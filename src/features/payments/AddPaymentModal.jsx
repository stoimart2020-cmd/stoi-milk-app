import { useState } from "react";

export const AddPaymentModal = ({ customer, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        amount: "",
        paymentType: "",
        paymentMode: "Cash",
        adjustmentPositiveNote: "",
        adjustmentNegativeNote: "",
        note: "",
        invoice: "",
    });

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (closeAfter = false) => {
        onSave({ ...formData, customerId: customer?._id });
        if (closeAfter) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                <div className="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Customer Payment</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-4 bg-base-200">
                    <div className="tabs">
                        <a className="tab tab-bordered tab-active">Add Payment</a>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <input
                                type="number"
                                className="input input-bordered w-full bg-red-50"
                                placeholder="Amount"
                                value={formData.amount}
                                onChange={(e) => handleChange("amount", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.paymentType}
                                onChange={(e) => handleChange("paymentType", e.target.value)}
                            >
                                <option value="">Select Payment Type</option>
                                <option value="Credit">Credit (Add Money)</option>
                                <option value="Debit">Debit (Deduct Money)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.paymentMode}
                                onChange={(e) => handleChange("paymentMode", e.target.value)}
                            >
                                <option>Cash</option>
                                <option>UPI</option>
                                <option>Card</option>
                                <option>Net Banking</option>
                                <option>Cheque</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Positive Note</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={formData.adjustmentPositiveNote}
                                onChange={(e) => handleChange("adjustmentPositiveNote", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Negative Note</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={formData.adjustmentNegativeNote}
                                onChange={(e) => handleChange("adjustmentNegativeNote", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                            <input
                                type="text"
                                className="input input-bordered w-full bg-yellow-50"
                                placeholder="Note"
                                value={formData.note}
                                onChange={(e) => handleChange("note", e.target.value)}
                            />
                        </div>



                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.invoice}
                                onChange={(e) => handleChange("invoice", e.target.value)}
                            >
                                <option value="">Select invoice</option>
                                <option>INV-001</option>
                                <option>INV-002</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">✕ Close</button>
                    <button onClick={() => handleSubmit(false)} className="btn btn-success text-white">💾 Save</button>
                    <button onClick={() => handleSubmit(true)} className="btn btn-info text-white">💾 Save & Close</button>
                </div>
            </div>
        </div>
    );
};
