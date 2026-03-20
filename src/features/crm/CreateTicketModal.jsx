import { useState, useEffect } from "react";

export const CreateTicketModal = ({ customer, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        customerName: customer?.name || "",
        subject: "",
        assignTo: "",
        message: "",
        watchList: "",
        attachment: null,
        issueType: "",
        priority: "",
        dueDate: "",
    });

    useEffect(() => {
        if (isOpen && customer) {
            setFormData(prev => ({
                ...prev,
                customerName: customer.name || "",
                user: customer._id
            }));
        } else if (isOpen) {
            setFormData({
                customerName: "",
                subject: "",
                assignTo: "",
                message: "",
                watchList: "",
                attachment: null,
                issueType: "",
                priority: "",
                dueDate: "",
            });
        }
    }, [isOpen, customer]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        const submissionData = {
            subject: formData.subject,
            description: formData.message,
            category: formData.issueType,
            priority: formData.priority,
            user: customer?._id || formData.user,
            dueDate: formData.dueDate,
            assignTo: formData.assignTo,
            watchList: formData.watchList,
            attachment: formData.attachment
        };
        onSave(submissionData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 overflow-y-auto py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                <div className="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Create New Support Ticket</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                            {customer ? (
                                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                    <div className="font-bold">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.mobile} | {customer.customerId}</div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="Search Customer"
                                    value={formData.customerName}
                                    onChange={(e) => handleChange("customerName", e.target.value)}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Subject"
                                value={formData.subject}
                                onChange={(e) => handleChange("subject", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.assignTo}
                                onChange={(e) => handleChange("assignTo", e.target.value)}
                            >
                                <option value="">Select User</option>
                                <option>Admin</option>
                                <option>Support Team</option>
                                <option>Delivery Team</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                className="textarea textarea-bordered w-full"
                                rows="2"
                                placeholder="Message"
                                value={formData.message}
                                onChange={(e) => handleChange("message", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Add to watch list</label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={formData.watchList}
                                onChange={(e) => handleChange("watchList", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment</label>
                            <input
                                type="file"
                                className="file-input file-input-bordered w-full"
                                onChange={(e) => handleChange("attachment", e.target.files[0])}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.issueType}
                                onChange={(e) => handleChange("issueType", e.target.value)}
                            >
                                <option value="">Select Issue Type</option>
                                <option>Delivery Issue</option>
                                <option>Quality Issue</option>
                                <option>Payment Issue</option>
                                <option>Subscription Issue</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={formData.dueDate}
                                onChange={(e) => handleChange("dueDate", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.priority}
                                onChange={(e) => handleChange("priority", e.target.value)}
                            >
                                <option value="">Select Priority</option>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Urgent</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-error text-white">✕ Close</button>
                    <button onClick={handleSubmit} className="btn btn-success text-white">💾 Save</button>
                </div>
            </div>
        </div>
    );
};
