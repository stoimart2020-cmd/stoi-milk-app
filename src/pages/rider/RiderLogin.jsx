import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { sendOtp, verifyOtp } from "../../lib/api";
import { queryClient } from "../../lib/queryClient";
import { Truck } from "lucide-react";
import toast from "react-hot-toast";

export const RiderLogin = () => {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
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
      console.log("Verify OTP Response:", data);
      const user = data?.data?.result;
      console.log("User from OTP:", user);

      if (user?.role === "RIDER" || user?.role === "ADMIN" || user?.role === "SUPERADMIN") {
        toast.success("Login Successful");
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate("/rider/dashboard");
      } else {
        console.error("Access Denied. Role:", user?.role);
        toast.error("Access Denied: You are not a rider");
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      toast.error("Please enter a 4-digit OTP");
      return;
    }
    verifyOtpMutation.mutate({ mobile, otp });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <Truck size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Rider Login</h2>
        <p className="text-center text-gray-500 mb-8">Welcome back, partner!</p>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Mobile Number</span>
              </label>
              <input
                type="tel"
                placeholder="Enter 10 digit number"
                className="input input-bordered w-full"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={sendOtpMutation.isPending}>
              {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Enter OTP</span>
              </label>
              <input
                type="text"
                placeholder="Enter 4 digit OTP"
                className="input input-bordered w-full text-center tracking-widest text-xl"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={4}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={verifyOtpMutation.isPending}>
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
      </div>
    </div>
  );
};
