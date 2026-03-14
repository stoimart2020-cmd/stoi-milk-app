import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { axiosInstance } from "../lib/axios";
import { checkUserStatus, loginWithPin, setPin } from "../lib/api/auth";
import toast from "react-hot-toast";

export const Login = () => {
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState("mobile_entry"); // mobile_entry, otp_entry, pin_entry, set_pin
  const [otp, setOtp] = useState("");
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const navigate = useNavigate();

  const handleNext = async () => {
    if (!mobile || mobile.length < 10) return toast.error("Enter valid mobile");
    setLoading(true);
    try {
      const status = await checkUserStatus(mobile);
      if (status.needsOtp) {
        // Trigger OTP send
        const res = await axiosInstance.post("/api/auth/send-otp", { mobile });
        if (res.data.success) {
          setStep("otp_entry");
          toast.success("OTP sent successfully");
        }
      } else if (status.hasPin || status.hasPassword) {
        setStep("pin_entry");
      } else if (status.exists) {
        // User exists but has no credentials (migrated user)
        // We'll still send OTP so they can set their first PIN
        const res = await axiosInstance.post("/api/auth/send-otp", { mobile });
        if (res.data.success) {
          setStep("otp_entry");
          toast.success("Identity verified via OTP. Please set your PIN next.");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return toast.error("Enter OTP");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/verify-otp", { mobile, otp });
      if (res.data.success) {
        // After OTP, check if we need to set a PIN (either new user or resetting)
        const user = res.data.result;
        if (!user.pin || isResettingPin) {
          setStep("set_pin");
        } else {
          await queryClient.invalidateQueries({ queryKey: ["user"] });
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPin = async () => {
    if (pin.length !== 4) return toast.error("Enter 4-digit PIN");
    setLoading(true);
    try {
      const res = await loginWithPin({ mobile, pin });
      if (res.data.success) {
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Incorrect PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length !== 4) return toast.error("PIN must be 4 digits");
    if (pin !== confirmPin) return toast.error("PINs do not match");
    setLoading(true);
    try {
      const res = await setPin(pin);
      if (res.data.success) {
        toast.success("PIN set successfully!");
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/send-otp", { mobile });
      if (res.data.success) {
        setStep("otp_entry");
        setIsResettingPin(true);
        toast.success("OTP sent to your mobile");
      }
    } catch (err) {
      toast.error("Failed to send verification OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-emerald-500">
      <div className="w-full max-w-sm sm:m-0 m-5 space-y-6 border-2 border-emerald-500 rounded-xl px-6 py-10 bg-white shadow-2xl">
        <div className="flex justify-center">
          <img src="/images/logo.png" alt="Logo" className="w-24 h-auto" />
        </div>

        {step === "mobile_entry" && (
          <div className="space-y-4">
            <h2 className="text-center font-bold text-gray-700 text-lg">Member Login</h2>
            <input
              type="tel"
              placeholder="Mobile number"
              className="input input-bordered border-emerald-500 focus:border-emerald-600 w-full rounded-full bg-white text-gray-800"
              onChange={(e) => setMobile(e.target.value)}
              value={mobile}
            />
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "NEXT"}
            </button>
          </div>
        )}

        {step === "pin_entry" && (
          <div className="space-y-4 text-center">
            <h2 className="font-bold text-gray-700 text-lg">Enter Your PIN</h2>
            <p className="text-xs text-gray-500">Welcome back! Enter your 4-digit PIN for {mobile}</p>
            <input
              type="password"
              maxLength={4}
              placeholder="4-digit PIN"
              className="input input-bordered border-emerald-500 text-center text-2xl tracking-widest w-full rounded-full bg-white text-gray-800"
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
              value={pin}
            />
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleLoginWithPin}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "LOGIN"}
            </button>
            <div className="flex justify-between px-2 mt-2">
              <button onClick={() => setStep("mobile_entry")} className="text-xs text-emerald-600 hover:underline">Change Mobile</button>
              <button onClick={handleForgotPin} className="text-xs text-emerald-600 hover:underline">Forgot PIN?</button>
            </div>
          </div>
        )}

        {step === "otp_entry" && (
          <div className="space-y-4">
            <h2 className="text-center font-bold text-gray-700 text-lg">Verify Mobile</h2>
            <p className="text-center text-xs text-gray-500">We've sent a 4-digit OTP to {mobile}</p>
            <input
              type="text"
              maxLength={4}
              placeholder="Enter 4-digit OTP"
              className="input input-bordered border-emerald-500 text-center text-xl w-full rounded-full bg-white text-gray-800"
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              value={otp}
            />
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "VERIFY OTP"}
            </button>
            <button onClick={() => setStep("mobile_entry")} className="text-xs text-center w-full text-emerald-600 hover:underline">Change mobile number</button>
          </div>
        )}

        {step === "set_pin" && (
          <div className="space-y-4">
            <h2 className="text-center font-bold text-gray-700 text-lg">Create Login PIN</h2>
            <p className="text-center text-xs text-gray-500">Select a 4-digit PIN for future logins</p>
            <input
              type="password"
              maxLength={4}
              placeholder="Create 4-digit PIN"
              className="input input-bordered border-emerald-500 text-center text-xl w-full rounded-full bg-white text-gray-800"
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
              value={pin}
            />
            <input
              type="password"
              maxLength={4}
              placeholder="Confirm 4-digit PIN"
              className="input input-bordered border-emerald-500 text-center text-xl w-full rounded-full bg-white text-gray-800"
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              value={confirmPin}
            />
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleSetPin}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "SET PIN & FINISH"}
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-emerald-100">
          <a
            href="https://stoimilk.com"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 w-full text-center hover:underline flex items-center justify-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            Go to Home Page
          </a>
        </div>
      </div>
    </div>
  );
};

