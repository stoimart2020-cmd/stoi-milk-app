import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkUserStatus, loginWithPin, verifyOtp, sendOtp, setPin } from "../../shared/api/auth";
import { queryClient } from "../../shared/utils/queryClient";
import { Truck, ArrowLeft } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import toast from "react-hot-toast";

export const RiderLogin = () => {
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState("mobile_entry"); // mobile_entry, otp_entry, pin_entry, set_pin
  const [otp, setOtp] = useState("");
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNext = async (e) => {
    e?.preventDefault();
    if (!mobile || mobile.length < 10) return toast.error("Enter valid mobile");
    setLoading(true);
    try {
      const status = await checkUserStatus(mobile);
      if (status.needsOtp) {
        // Trigger OTP send
        const res = await sendOtp(mobile);
        if (res.data.success) {
          setStep("otp_entry");
          toast.success("OTP sent to your mobile");
        }
      } else if (status.hasPin) {
        setStep("pin_entry");
      } else if (status.hasPassword) {
        // Fallback for riders who still have passwords
        setStep("pin_entry"); 
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otp) return toast.error("Enter OTP");
    setLoading(true);
    try {
      const res = await verifyOtp({ mobile, otp });
      if (res.data.success) {
        const user = res.data.result;
        // Verify role
        if (!["RIDER", "ADMIN", "SUPERADMIN"].includes(user.role)) {
            toast.error("Access Denied: You are not a rider");
            setStep("mobile_entry");
            return;
        }

        if (!user.pin) {
          setStep("set_pin");
        } else {
          await queryClient.invalidateQueries({ queryKey: ["user"] });
          navigate("/rider/dashboard");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      // First try logging in with PIN
      const res = await loginWithPin({ mobile, pin });
      if (res.data.success) {
        const user = res.data.result;
        if (!["RIDER", "ADMIN", "SUPERADMIN"].includes(user.role)) {
            toast.error("Access Denied");
            setStep("mobile_entry");
            return;
        }
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate("/rider/dashboard");
      }
    } catch (err) {
        // If PIN login fails, maybe it was a password (staff account)
        try {
            const res = await axiosInstance.post("/api/auth/super-admin-login", { username: mobile, password: pin });
            if (res.data.success) {
                await queryClient.invalidateQueries({ queryKey: ["user"] });
                navigate("/rider/dashboard");
                return;
            }
        } catch (passErr) {
            toast.error("Incorrect PIN or Password");
        }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (e) => {
    e?.preventDefault();
    if (pin.length !== 4) return toast.error("PIN must be 4 digits");
    if (pin !== confirmPin) return toast.error("PINs do not match");
    setLoading(true);
    try {
      const res = await setPin(pin);
      if (res.data.success) {
        toast.success("PIN set successfully!");
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate("/rider/dashboard");
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
      const res = await sendOtp(mobile);
      if (res.data.success) {
        setStep("otp_entry");
        toast.success("OTP sent to your mobile");
      }
    } catch (err) {
      toast.error("Failed to send verification OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
            <Truck size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Rider Portal</h2>
        <p className="text-center text-gray-500 text-sm mb-8">Secure Login for Delivery Partners</p>

        {step === "mobile_entry" && (
          <form onSubmit={handleNext} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-600">Mobile Number</span>
              </label>
              <input
                type="tel"
                placeholder="Enter 10 digit number"
                className="input input-bordered w-full focus:input-primary bg-white text-gray-800"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full text-white" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : "CONTINUE"}
            </button>
          </form>
        )}

        {step === "pin_entry" && (
          <form onSubmit={handleLoginWithPin} className="space-y-4">
            <div className="form-control text-center">
              <label className="label justify-center">
                <span className="label-text font-medium text-gray-600 uppercase tracking-widest">Enter PIN</span>
              </label>
              <input
                type="password"
                placeholder="****"
                className="input input-bordered w-full text-center tracking-[1em] text-2xl focus:input-primary bg-white text-gray-800"
                value={pin}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary w-full text-white" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : "LOGIN"}
            </button>
            <div className="flex justify-between px-1">
              <button 
                type="button" 
                onClick={() => setStep("mobile_entry")} 
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Change Number
              </button>
              <button 
                type="button" 
                onClick={handleForgotPin} 
                className="text-xs text-blue-600 hover:underline"
              >
                Forgot PIN?
              </button>
            </div>
          </form>
        )}

        {step === "otp_entry" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="form-control text-center">
              <label className="label justify-center">
                <span className="label-text font-medium text-gray-600">Enter OTP sent to {mobile}</span>
              </label>
              <input
                type="text"
                placeholder="****"
                className="input input-bordered w-full text-center tracking-[1em] text-2xl focus:input-primary bg-white text-gray-800"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary w-full text-white" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : "VERIFY & CONTINUE"}
            </button>
            <button 
              type="button" 
              onClick={() => setStep("mobile_entry")} 
              className="btn btn-ghost btn-sm w-full font-normal text-gray-500"
            >
              Change Mobile Number
            </button>
          </form>
        )}

        {step === "set_pin" && (
          <form onSubmit={handleSetPin} className="space-y-4">
            <h3 className="font-bold text-gray-700 text-center">Initialize Security PIN</h3>
            <p className="text-xs text-gray-500 text-center">Set a 4-digit PIN for future logins</p>
            <div className="space-y-3">
              <input
                type="password"
                maxLength={4}
                placeholder="Create 4-digit PIN"
                className="input input-bordered w-full text-center text-xl tracking-widest bg-white text-gray-800"
                value={pin}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                required
              />
              <input
                type="password"
                maxLength={4}
                placeholder="Confirm 4-digit PIN"
                className="input input-bordered w-full text-center text-xl tracking-widest bg-white text-gray-800"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full text-white" disabled={loading}>
               FINISH SETUP
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
