import { useState, useMemo } from 'react';
import { X, Wallet, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../shared/api/axios';

export const RechargeModal = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState("");

    // Fetch Subscriptions to calculate burn rate
    const { data: subscriptionsData } = useQuery({
        queryKey: ["my-subscriptions"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/subscriptions");
            return response.data;
        },
        enabled: isOpen, // Only fetch when modal is open
    });

    const dailyBurnRate = useMemo(() => {
        const subs = subscriptionsData?.result || [];
        return subs.reduce((total, sub) => {
            if (sub.status !== 'active' && sub.status !== 'trial') return total;

            const price = sub.product?.price || 0;
            const dailyCost = price * sub.quantity;

            if (sub.frequency === 'Daily') return total + dailyCost;
            if (sub.frequency === 'Alternate Days') return total + (dailyCost / 2);
            if (sub.frequency === 'Weekly') return total + (dailyCost / 7);
            if (sub.frequency === 'Custom' && sub.customDays?.length) {
                return total + (dailyCost * sub.customDays.length / 7);
            }
            return total;
        }, 0);
    }, [subscriptionsData]);

    const estimatedDays = useMemo(() => {
        if (!amount || dailyBurnRate === 0) return null;
        return Math.floor(Number(amount) / dailyBurnRate);
    }, [amount, dailyBurnRate]);

    const handleRecharge = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        const toastId = toast.loading("Initializing Payment...");
        try {
            // 1. Create Order
            const { data: orderResponse } = await axiosInstance.post("/api/payments/create-order", { amount });
            const { order_id, currency, key_id } = orderResponse.result;

            if (!key_id) {
                throw new Error("Payment Gateway not configured");
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: key_id,
                amount: amount * 100,
                currency: currency,
                name: "Stoi Daily",
                description: "Wallet Recharge",
                image: "/images/logo.png",
                order_id: order_id,
                handler: async function (response) {
                    // 3. Verify Payment
                    try {
                        toast.loading("Verifying Payment...", { id: toastId });
                        const verifyRes = await axiosInstance.post("/api/payments/verify-payment", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.status === 'success') {
                            toast.success("Recharge Successful!", { id: toastId });
                            onClose();
                            // Optionally invalidate queries to refresh wallet balance immediately
                            // queryClient.invalidateQueries(['user']); 
                            window.location.reload(); // Simple reload to refresh all data for now
                        } else {
                            toast.error("Payment Verification Failed", { id: toastId });
                        }
                    } catch (error) {
                        console.error(error);
                        toast.error("Payment Verification Failed", { id: toastId });
                    }
                },
                prefill: {
                    name: "Stoi User", // Could be dynamic from user prop
                    contact: "9999999999" // Could be dynamic
                },
                theme: {
                    color: "#059669"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                toast.error(response.error.description || "Payment Failed", { id: toastId });
            });
            rzp1.open();
            toast.dismiss(toastId);

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || error.message || "Failed to initiate payment", { id: toastId });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box relative">
                <button onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2">
                    <X size={16} />
                </button>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Wallet className="text-green-600" /> Quick Recharge
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="label">
                            <span className="label-text">Enter Amount</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input input-bordered w-full pl-8"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                        {amount > 0 && dailyBurnRate > 0 && (
                            <div className="mt-2 text-sm text-gray-600 flex items-center gap-1 bg-green-50 p-2 rounded-lg border border-green-100">
                                <Clock size={14} className="text-green-600" />
                                <span>
                                    Lasts approximately <strong className="text-green-700">{estimatedDays} days</strong> based on your active subscriptions (₹{Math.round(dailyBurnRate)}/day).
                                </span>
                            </div>
                        )}
                        {amount > 0 && dailyBurnRate === 0 && (
                            <div className="mt-2 text-xs text-orange-500">
                                No active subscriptions found to estimate duration.
                            </div>
                        )}
                    </div>

                    {/* Quick Recharge Options */}
                    <div className="space-y-3">
                        {/* Day-based options (shown only if there are active subscriptions) */}
                        {dailyBurnRate > 0 && (
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Recharge for Duration</span>
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {[7, 30, 60].map((days) => {
                                        const calculatedAmount = Math.ceil(dailyBurnRate * days);
                                        return (
                                            <button
                                                key={days}
                                                onClick={() => setAmount(calculatedAmount)}
                                                className="btn btn-sm btn-outline btn-primary flex-1 min-w-[90px]"
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold">{days} Days</span>
                                                    <span className="text-xs opacity-70">₹{calculatedAmount}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Fixed amount options */}
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold">Quick Amounts</span>
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {[100, 500, 1000, 2000].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt)}
                                        className="btn btn-xs btn-outline btn-success"
                                    >
                                        + ₹{amt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRecharge}
                        className="btn btn-primary w-full text-white mt-4"
                    >
                        Proceed to Pay
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};
