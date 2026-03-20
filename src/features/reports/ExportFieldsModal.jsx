import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export const ALL_EXPORT_FIELDS = [
    { id: "customerId", label: "Id", defaultChecked: true },
    { id: "name", label: "Name", defaultChecked: true },
    { id: "mobile", label: "Mobile", defaultChecked: true },
    { id: "email", label: "Email Id", defaultChecked: true },
    { id: "subStatus", label: "Sub. Status", defaultChecked: false },
    { id: "isBlocked", label: "Is Blocked", defaultChecked: false },
    { id: "hub", label: "Hub", defaultChecked: false },
    { id: "routeName", label: "Route Name", defaultChecked: false },
    { id: "walletBalance", label: "Wallet Balance", defaultChecked: true },
    { id: "customerType", label: "Customer Type", defaultChecked: false },
    { id: "subSource", label: "Sub-source", defaultChecked: false },
    { id: "tempCustomerStatus", label: "Temp Customer Status", defaultChecked: false },
    { id: "lastDeviceActive", label: "Last Device Active", defaultChecked: false },
    { id: "lastPaymentBeforeDays", label: "Last Payment Before Days", defaultChecked: false },
    { id: "totalRevenue", label: "Total Revenue", defaultChecked: false },
    { id: "createdBy", label: "Created By", defaultChecked: false },
    { id: "createdDate", label: "Created Date", defaultChecked: false },
    { id: "followUpDate", label: "Follow Up Date", defaultChecked: false },
    { id: "alternateMobile", label: "Alternate Mobile", defaultChecked: true },
    { id: "address", label: "Address", defaultChecked: true },
    { id: "geoLocation", label: "Geo location", defaultChecked: true },
    { id: "creditLimit", label: "Credit Limit", defaultChecked: true },
    { id: "crmAgent", label: "CRM Agent", defaultChecked: false },
    { id: "campaignName", label: "Campaign Name", defaultChecked: false },
    { id: "gstNumber", label: "GST Number", defaultChecked: false },
    { id: "currentConsumption", label: "Current Consumption", defaultChecked: false },
    { id: "deliveryBoy", label: "Delivery Boy", defaultChecked: true },
    { id: "lastDeliveryDate", label: "Last Delivery Date", defaultChecked: false },
    { id: "createdTime", label: "Created Time", defaultChecked: true },
    { id: "paymentMode", label: "Payment Mode", defaultChecked: true },
    { id: "city", label: "City", defaultChecked: false },
    { id: "effectiveWalletBalance", label: "Effective Wallet Balance", defaultChecked: true },
    { id: "paymentType", label: "Payment Type", defaultChecked: false },
    { id: "source", label: "Source", defaultChecked: false },
    { id: "note", label: "Note", defaultChecked: false },
    { id: "lastDeviceType", label: "Last Device Type", defaultChecked: false },
    { id: "dueSince", label: "Due Since", defaultChecked: false },
    { id: "deliveryPreference", label: "Delivery Preferance", defaultChecked: false },
    { id: "dnd", label: "DND", defaultChecked: false },
    { id: "firstDeliveryDate", label: "First Delivery Date", defaultChecked: false },
    { id: "timeSlot", label: "Time slot", defaultChecked: false },
    { id: "totalOrders", label: "Total Orders", defaultChecked: false },
    { id: "callStatus", label: "Call Status", defaultChecked: false }

];

export const ExportFieldsModal = ({ isOpen, onClose, onSave }) => {
    const [selectedFields, setSelectedFields] = useState(
        ALL_EXPORT_FIELDS.filter(f => f.defaultChecked).map(f => f.id)
    );

    if (!isOpen) return null;

    const toggleField = (id) => {
        setSelectedFields(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        onSave(selectedFields);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 bg-[#1f7363] text-white rounded-t-xl flex justify-between items-center relative">
                    <h2 className="text-lg font-semibold ml-2">Choose Output Fields</h2>
                    <button onClick={onClose} className="p-1 hover:bg-[#185e50] rounded-full transition-colors bg-white text-gray-800 shadow-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    <h3 className="text-[#1f7363] font-medium text-sm mb-6 uppercase tracking-wider">SELECTED FIELDS</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                        {ALL_EXPORT_FIELDS.map(field => (
                            <label key={field.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={selectedFields.includes(field.id)}
                                    onChange={() => toggleField(field.id)}
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                                    {field.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-4 bg-white rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-[20px] bg-[#fb9262] hover:bg-[#eb8658] text-white transition-colors text-sm font-medium flex items-center justify-center gap-1 min-w-[120px]"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-[20px] bg-[#1f7363] hover:bg-[#185e50] text-white transition-colors text-sm font-medium flex items-center justify-center gap-1 shadow-sm min-w-[120px]"
                    >
                        <Check className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};
