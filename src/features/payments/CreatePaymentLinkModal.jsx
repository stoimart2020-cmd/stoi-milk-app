import { useState } from "react";
import { createPaymentLink } from "../../shared/api/payments";
import { toast } from "react-hot-toast";

export const CreatePaymentLinkModal = ({ customer, isOpen, onClose }) => {
    const [amount, setAmount] = useState(() => {
        const outstanding = (customer?.unbilledConsumption || 0) - (customer?.walletBalance || 0);
        return outstanding > 0 ? outstanding.toFixed(2) : "";
    });
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState(null);

    const handleSubmit = async () => {
        if (!amount || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            setLoading(true);
            const res = await createPaymentLink({
                userId: customer._id,
                amount: parseFloat(amount),
                description
            });
            setGeneratedLink(res.result);
            toast.success("Payment link generated successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate link");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedLink?.short_url) {
            navigator.clipboard.writeText(generatedLink.short_url);
            toast.success("Link copied to clipboard");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                    <h3 className="text-lg font-bold">Generate Payment Link</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">×</button>
                </div>

                <div className="p-6 space-y-4">
                    {!generatedLink ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <div className="p-2 bg-gray-100 rounded text-sm font-semibold">
                                    {customer?.name} ({customer?.mobile})
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    placeholder="Enter amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea
                                    className="textarea textarea-bordered w-full h-20"
                                    placeholder="Purpose of payment..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="text-green-800 font-bold mb-2">Link Generated!</h4>
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="text"
                                    readOnly
                                    className="input input-bordered input-sm flex-1 font-mono text-xs"
                                    value={generatedLink.short_url}
                                />
                                <button
                                    onClick={handleCopy}
                                    className="btn btn-sm btn-ghost text-blue-600"
                                >
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-green-600">
                                Share this link with the customer to receive a payment of ₹{generatedLink.amount}.
                            </p>
                            <button
                                onClick={() => setGeneratedLink(null)}
                                className="btn btn-xs btn-outline btn-success mt-4 w-full"
                            >
                                Generate Another Link
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-ghost">Close</button>
                    {!generatedLink && (
                        <button
                            onClick={handleSubmit}
                            className={`btn btn-primary ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            Generate Link
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
