import { useRef } from "react";
import { X, User, Phone, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getRiderCustomers } from "../../shared/api/riders";

export const RiderCustomersModal = ({ isOpen, onClose, rider, onSelect }) => {
    const modalRef = useRef(null);

    // Simple click outside handler if hook doesn't exist
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const { data, isLoading } = useQuery({
        queryKey: ["rider-customers", rider?._id],
        queryFn: () => getRiderCustomers(rider._id),
        enabled: !!rider && isOpen
    });

    if (!isOpen || !rider) return null;

    const customers = data?.result || [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Assigned Customers</h2>
                        <p className="text-sm text-gray-500">For Rider: <span className="font-semibold text-gray-700">{rider.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8 text-gray-500">Loading customers...</div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No customers found with orders assigned to this rider.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {customers.map(customer => (
                                <div
                                    key={customer._id}
                                    onClick={() => { if (onSelect) { onSelect(customer); onClose(); } }}
                                    className={`flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all text-left ${onSelect ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                                        {customer.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{customer.name}</h3>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-sm text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Phone size={14} />
                                                {customer.mobile}
                                            </div>
                                            {/* <div className="flex items-center gap-1.5">
                                                <MapPin size={14} />
                                                {customer.address?.area || "No Area"}
                                            </div> */}
                                        </div>
                                        {customer.address?.fullAddress && (
                                            <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                                                <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                                                {customer.address.fullAddress}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
