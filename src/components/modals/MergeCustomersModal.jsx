import { useState, useEffect } from "react";
import { getAllCustomers, mergeCustomers } from "../../lib/api/customers";
import { toast } from "react-hot-toast";

export const MergeCustomersModal = ({ sourceCustomer, isOpen, onClose }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [customers, setCustomers] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (searchTerm.length > 2) {
            const delayDebounceFn = setTimeout(async () => {
                try {
                    setSearching(true);
                    const res = await getAllCustomers(searchTerm);
                    // Filter out the source customer from results
                    setCustomers(res.result.filter(c => c._id !== sourceCustomer._id));
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setSearching(false);
                }
            }, 500);

            return () => clearTimeout(delayDebounceFn);
        } else {
            setCustomers([]);
        }
    }, [searchTerm, sourceCustomer]);

    const handleMerge = async () => {
        if (!selectedTarget) {
            toast.error("Please select a target customer to merge into");
            return;
        }

        const confirm = window.confirm(`Are you sure you want to merge ${sourceCustomer.name} INTO ${selectedTarget.name}? \n\nThis will transfer all subscriptions, orders, and wallet balance. ${sourceCustomer.name}'s account will be deactivated. THIS ACTION CANNOT BE UNDONE.`);

        if (confirm) {
            try {
                setLoading(true);
                await mergeCustomers({
                    sourceId: sourceCustomer._id,
                    targetId: selectedTarget._id
                });
                toast.success("Customers merged successfully");
                onClose();
                // Optionally reload or redirect
                window.location.reload();
            } catch (error) {
                toast.error(error.response?.data?.message || "Merge failed");
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="bg-orange-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Merge Customer Accounts</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-red-50 p-3 rounded border border-red-200 text-xs text-red-700">
                        <strong>Warning:</strong> You are merging <strong>{sourceCustomer?.name}</strong> into another account. This will move all data and deactivate this profile.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search Target Customer (Name/Mobile/ID)</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Search by name or mobile..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searching && (
                                <div className="absolute right-3 top-3">
                                    <span className="loading loading-spinner loading-xs"></span>
                                </div>
                            )}
                        </div>

                        {customers.length > 0 && !selectedTarget && (
                            <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto bg-white shadow-inner">
                                {customers.map(c => (
                                    <div
                                        key={c._id}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                        onClick={() => setSelectedTarget(c)}
                                    >
                                        <div>
                                            <div className="font-bold text-sm">{c.name}</div>
                                            <div className="text-xs text-gray-500">{c.mobile} | {c.customerId || 'No ID'}</div>
                                        </div>
                                        <div className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">Select</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedTarget && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-bold text-blue-800">Merge Into:</h4>
                                <button
                                    onClick={() => setSelectedTarget(null)}
                                    className="text-[10px] text-red-600 hover:underline"
                                >
                                    Change Target
                                </button>
                            </div>
                            <div className="text-sm font-semibold">{selectedTarget.name}</div>
                            <div className="text-xs text-gray-600">{selectedTarget.mobile}</div>
                            <div className="text-xs text-gray-600">{selectedTarget.address?.fullAddress}</div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-ghost" disabled={loading}>Cancel</button>
                    <button
                        onClick={handleMerge}
                        className={`btn btn-warning ${loading ? 'loading' : ''}`}
                        disabled={!selectedTarget || loading}
                    >
                        Merge Customers
                    </button>
                </div>
            </div>
        </div>
    );
};
