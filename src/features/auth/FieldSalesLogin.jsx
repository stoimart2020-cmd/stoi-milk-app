import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { sendOtp, verifyOtp } from "../../shared/api/auth";
import { queryClient } from "../../shared/utils/queryClient";
import { Briefcase } from "lucide-react";
import toast from "react-hot-toast";

export const FieldSalesLogin = () => {
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    const sendOtpMutation = useMutation({
        mutationFn: sendOtp,
        onSuccess: () => {
            toast.success("OTP sent to " + mobile);
            setStep(2);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to send OTP");
        },
    });

    const verifyOtpMutation = useMutation({
        mutationFn: verifyOtp,
        onSuccess: async (data) => {
            const user = data?.data?.result;
            if (user?.role === "FIELD_MARKETING" || user?.role === "FIELD_OFFICER" || user?.role === "ADMIN" || user?.role === "SUPERADMIN") {
                toast.success("Login Successful");
                await queryClient.invalidateQueries({ queryKey: ["user"] });
                await queryClient.invalidateQueries({ queryKey: ["currentAdmin"] });
                navigate("/fieldsales/dashboard", { replace: true });
            } else {
                toast.error("Access Denied: You are not a Field Sales officer");
            }
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Invalid OTP");
        },
    });

    const handleSendOtp = (e) => {
        e.preventDefault();
        if (mobile.length !== 10) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }
        sendOtpMutation.mutate(mobile);
    };

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        if (otp.length !== 4) {
            toast.error("Please enter a 4-digit OTP");
            return;
        }
        verifyOtpMutation.mutate({ mobile, otp });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 flex flex-col justify-center items-center p-4">
            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-200">
                        <Briefcase size={36} />
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-center text-gray-800 mb-1">Field Sales</h2>
                <p className="text-center text-gray-400 mb-8 text-sm">Login to collect leads & orders</p>

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                placeholder="Enter 10 digit number"
                                className="input input-bordered w-full text-lg"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                maxLength={10}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 hover:from-teal-600 hover:to-emerald-600 text-base"
                            disabled={sendOtpMutation.isPending}
                        >
                            {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                placeholder="Enter 4 digit OTP"
                                className="input input-bordered w-full text-center tracking-[0.5em] text-2xl font-bold"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={4}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 hover:from-teal-600 hover:to-emerald-600 text-base"
                            disabled={verifyOtpMutation.isPending}
                        >
                            {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Login"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm w-full"
                            onClick={() => setStep(1)}
                        >
                            Change Number
                        </button>
                    </form>
                )}

                <div className="flex justify-center gap-4 mt-6 pt-6 border-t border-gray-100">
                    <button 
                        onClick={() => navigate("/administrator/login")}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                    >
                        Admin Portal
                    </button>
                    <span className="text-gray-300 text-xs">|</span>
                    <button 
                        onClick={() => navigate("/rider/login")}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                    >
                        Rider Portal
                    </button>
                </div>
            </div>
            <p className="text-white/60 text-xs mt-6">STOI Milk • Field Sales Portal</p>
        </div>
    );
};
