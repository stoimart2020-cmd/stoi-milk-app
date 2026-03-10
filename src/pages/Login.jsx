import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { axiosInstance } from "../lib/axios";

export const Login = () => {
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    if (!mobile || mobile.length < 10) return alert("Enter valid mobile");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/send-otp", { mobile });
      if (res.data.success) {
        setOtpSent(true);
      } else {
        alert(res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return alert("Enter OTP");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/verify-otp", {
        mobile,
        otp
      });

      if (res.data.success) {
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        navigate("/dashboard");
      } else {
        alert(res.data.message || "Verification failed");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen flex justify-center items-center bg-emerald-500">
        <div className="w-full max-w-sm sm:m-0 m-5 space-y-6 border-2 border-emerald-500 rounded-xl px-6 py-10 bg-white">
          <div className="flex justify-center">
            <img src="/images/logo.png" alt="" className="w-24" />
          </div>
          {!otpSent ? (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Mobile number"
                  className="bg-white border-2 border-emerald-500 rounded-full py-2 px-4 w-full"
                  onChange={(e) => setMobile(e.target.value)}
                  value={mobile}
                />
              </div>
              <div>
                {!loading ? (
                  <button
                    className="btn btn-success text-white rounded-full w-full"
                    onClick={handleSendOtp}
                  >
                    NEXT
                  </button>
                ) : (
                  <button
                    className="btn btn-success text-white rounded-full w-full"
                    disabled
                  >
                    <span className="loading loading-spinner loading-xs"></span>
                    NEXT
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  className="bg-white border-2 border-emerald-500 rounded-full py-2 px-4 w-full"
                  onChange={(e) => setOtp(e.target.value)}
                  value={otp}
                />
              </div>
              <div>
                {!loading ? (
                  <button
                    className="btn btn-success text-white rounded-full w-full"
                    onClick={handleVerifyOtp}
                  >
                    Verify OTP
                  </button>
                ) : (
                  <button
                    className="btn btn-success text-white rounded-full w-full"
                    disabled
                  >
                    <span className="loading loading-spinner loading-xs"></span>
                    Verify OTP
                  </button>
                )}
              </div>
              <button
                onClick={() => setOtpSent(false)}
                className="text-xs text-emerald-600 w-full text-center hover:underline"
              >
                Change mobile number
              </button>
            </>
          )}

          <div className="pt-4 border-t border-emerald-100 flex flex-col gap-2">
            <button 
              onClick={() => alert("Please contact customer support to reset your password or login via OTP.")}
              className="text-sm text-gray-500 hover:text-emerald-600 w-full text-center hover:underline"
            >
              Forgot Password?
            </button>
            <a 
              href="https://stoimilk.com"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 w-full text-center hover:underline flex items-center justify-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Go to Home Page
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
