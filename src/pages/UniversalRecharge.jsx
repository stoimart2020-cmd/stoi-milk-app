import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { getCustomerByMobile } from "../lib/api/customers";
import { createOrderPublic, verifyPaymentPublic } from "../lib/api/payments";
import { toast } from "react-hot-toast";

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const UniversalRecharge = () => {
    const [step, setStep] = useState("mobile"); // mobile, confirm, payment
    const [mobile, setMobile] = useState("");
    const [customer, setCustomer] = useState(null);
    const [amount, setAmount] = useState("");

    // Load Razorpay script
    useEffect(() => {
        loadRazorpay();
    }, []);

    const fetchCustomerMutation = useMutation({
        mutationFn: getCustomerByMobile,
        onSuccess: (data) => {
            setCustomer(data.result);
            setStep("confirm");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Customer not found");
        },
    });

    const handleVerify = (e) => {
        e.preventDefault();
        if (mobile.length !== 10) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }
        fetchCustomerMutation.mutate(mobile);
    };

    const createOrderMutation = useMutation({
        mutationFn: createOrderPublic,
        onSuccess: async (data) => {
            const { amount, currency, order_id, key_id } = data.result;

            const options = {
                key: key_id,
                amount: amount,
                currency: currency,
                name: "StoiMilk",
                description: "Wallet Recharge",
                order_id: order_id,
                prefill: {
                    name: customer.name,
                    contact: customer.mobile,
                },
                handler: async function (response) {
                    try {
                        await verifyPaymentPublic({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        toast.success("Payment Successful!");
                        setStep("success");
                        setTimeout(() => {
                            setStep("mobile");
                            setMobile("");
                            setCustomer(null);
                            setAmount("");
                        }, 3000);
                    } catch (error) {
                        toast.error("Payment Verification Failed");
                    }
                },
                theme: {
                    color: "#4aed88",
                },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on("payment.failed", function (response) {
                toast.error(response.error.description || "Payment Failed");
            });
            rzp1.open();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to initiate payment");
        },
    });

    const handlePayment = (e) => {
        e.preventDefault();
        if (!amount || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        createOrderMutation.mutate({
            userId: customer._id,
            amount: parseFloat(amount)
        });
    };

    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title justify-center text-2xl font-bold text-primary mb-6">
                        StoiMilk Recharge
                    </h2>

                    {step === "mobile" && (
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Enter Mobile Number</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Enter 10 digit number"
                                    className="input input-bordered w-full text-lg tracking-widest text-center"
                                    maxLength="10"
                                    value={mobile}
                                    onChange={(e) => {
                                        const re = /^[0-9\b]+$/;
                                        if (e.target.value === '' || re.test(e.target.value)) {
                                            setMobile(e.target.value)
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>
                            <button
                                className="btn btn-primary w-full"
                                onClick={handleVerify}
                                disabled={fetchCustomerMutation.isPending || mobile.length !== 10}
                            >
                                {fetchCustomerMutation.isPending ? "Verifying..." : "Verify Customer"}
                            </button>
                        </div>
                    )}

                    {step === "confirm" && customer && (
                        <div className="space-y-6">
                            <div className="bg-base-200 p-4 rounded-lg text-center">
                                <h3 className="text-xl font-bold">{customer.name}</h3>
                                <p className="text-sm opacity-70 mb-2">{customer.mobile}</p>
                                <div className="divider my-1"></div>
                                <div className="stats shadow bg-base-100 w-full">
                                    <div className="stat place-items-center p-2">
                                        <div className="stat-title text-xs">Current Balance</div>
                                        <div className={`stat-value text-xl ${customer.walletBalance < 0 ? 'text-error' : 'text-success'}`}>
                                            ₹ {customer.walletBalance?.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handlePayment} className="space-y-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Enter Amount</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-lg">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="input input-bordered w-full pl-8 text-lg"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="1"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-2 justify-center">
                                        {[500, 1000, 2000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                className="btn btn-xs btn-outline"
                                                onClick={() => setAmount(amt)}
                                            >
                                                +₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-6">
                                    <button
                                        type="button"
                                        className="btn btn-ghost flex-1"
                                        onClick={() => {
                                            setStep("mobile");
                                            setCustomer(null);
                                        }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className={`btn btn-primary flex-1 ${createOrderMutation.isPending ? "loading" : ""}`}
                                        disabled={createOrderMutation.isPending}
                                    >
                                        Proceed to Pay
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center space-y-4 py-8">
                            <div className="text-6xl">✅</div>
                            <h3 className="text-2xl font-bold text-success">Payment Successful!</h3>
                            <p>Recharge done for {customer?.name}</p>
                            <p className="text-sm opacity-50">Redirecting...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
