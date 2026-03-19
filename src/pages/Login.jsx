import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { axiosInstance } from "../lib/axios";
import { loginWithPin, setPin } from "../lib/api/auth";
import toast from "react-hot-toast";
import {
  getFirebaseAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  initializeFirebase,
} from "../lib/firebase";
import { getPublicSettings } from "../lib/api/settings";

export const Login = () => {
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState("mobile_entry"); // mobile_entry | otp_entry | pin_entry | set_pin
  const [otp, setOtp] = useState("");
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [useFirebase, setUseFirebase] = useState(false);
  const recaptchaRef = useRef(null);
  const recaptchaWidgetRef = useRef(null);
  const navigate = useNavigate();

  // Detect if Firebase is configured
  useEffect(() => {
    const checkFirebase = async () => {
      try {
        const publicSettings = await getPublicSettings();
        const settings = publicSettings?.result;
        if (settings?.firebase?.enabled) {
          initializeFirebase(settings.firebase);
          setUseFirebase(true);
        } else if (import.meta.env.VITE_FIREBASE_API_KEY) {
          setUseFirebase(true);
        }
      } catch {
        // Firebase not configured, falls back to backend OTP
      }
    };
    checkFirebase();

    // Load MSG91 Widget Script
    const urls = [
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js'
    ];
    let i = 0;
    function attemptLoad() {
      const s = document.createElement('script');
      s.src = urls[i];
      s.async = true;
      s.onerror = () => {
        i++;
        if (i < urls.length) attemptLoad();
      };
      document.head.appendChild(s);
    }
    attemptLoad();
  }, []);

  // Setup reCAPTCHA when Firebase OTP flow starts
  const setupRecaptcha = () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase not initialized");
    }
    if (recaptchaWidgetRef.current) return; // already set up

    const verifier = new RecaptchaVerifier(getFirebaseAuth(), "recaptcha-container", {
      size: "invisible",
      callback: () => {},
    });
    recaptchaRef.current = verifier;
    recaptchaWidgetRef.current = verifier;
  };

  const clearRecaptcha = () => {
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear();
      } catch {}
      recaptchaRef.current = null;
      recaptchaWidgetRef.current = null;
    }
  };

  // ── Step 1: Check user status & send OTP ───────────────────────────────
  const handleNext = async () => {
    if (!mobile || mobile.length < 10)
      return toast.error("Enter valid 10-digit mobile number");
    setLoading(true);
    try {
      // Check user status first
      const statusRes = await axiosInstance.post("/api/auth/check-status", {
        mobile,
      });
      const status = statusRes.data;

      if (status.hasPin || status.hasPassword) {
        setStep("pin_entry");
        return;
      }

      // Need OTP — use Firebase if enabled, else backend SMS
      if (useFirebase && getFirebaseAuth()) {
        await sendFirebaseOtp();
      } else {
        await sendBackendOtp();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Firebase OTP Send ────────────────────────────────────────────────────
  const sendFirebaseOtp = async () => {
    try {
      setupRecaptcha();
      const phoneNumber = `+91${mobile}`; // Adjust country code if needed
      const result = await signInWithPhoneNumber(
        getFirebaseAuth(),
        phoneNumber,
        recaptchaRef.current
      );
      setConfirmationResult(result);
      setStep("otp_entry");
      toast.success("OTP sent via Firebase");
    } catch (err) {
      clearRecaptcha();
      console.error("Firebase OTP error:", err);
      // Fallback to backend SMS
      toast("Trying alternate OTP delivery...", { icon: "🔄" });
      await sendBackendOtp();
    }
  };

  // ── Backend SMS OTP Send ─────────────────────────────────────────────────
  const sendBackendOtp = async () => {
    // If MSG91 widget is loaded, use it instead of our UI
    if (typeof window.initSendOTP === 'function') {
        const configuration = {
            widgetId: "366373694366303330333938",
            tokenAuth: "414391TcyVyznZd65e07cb5P1",
            identifier: "91" + mobile.replace(/\D/g, ""),
            button_1: "msg91-hidden-btn",
            success: async (data) => {
                console.log('MSG91 Widget Verified:', data);
                try {
                    setLoading(true);
                    const res = await axiosInstance.post("/api/auth/msg91-verify", {
                        mobile,
                        token: data.message
                    });
                    
                    if (res.data.success) {
                        queryClient.invalidateQueries({ queryKey: ["user"] });
                        const user = res.data.result;
                        if (!user.pin || isResettingPin) {
                            setStep("set_pin");
                        } else {
                            navigate("/dashboard", { replace: true });
                        }
                    }
                } catch (e) {
                    toast.error(e.response?.data?.message || "MSG91 verification failed on server");
                } finally {
                    setLoading(false);
                }
            },
            failure: (error) => {
                console.error('MSG91 Widget Error:', error);
            }
        };
        
        window.initSendOTP(configuration);
        
        // Trigger the widget click slightly later so MSG91 binds to it
        setTimeout(() => {
            const btn = document.getElementById("msg91-hidden-btn");
            if (btn) btn.click();
        }, 300);
        return;
    }

    // Classic Fallback if MSG91 script didn't load
    const res = await axiosInstance.post("/api/auth/send-otp", { mobile });
    if (res.data.success) {
      setConfirmationResult(null); // signal: use backend verify
      setStep("otp_entry");
      toast.success("OTP sent to your mobile");
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return toast.error("Enter the OTP");
    setLoading(true);
    try {
      let user;

      if (confirmationResult) {
        // Firebase verification path
        const firebaseResult = await confirmationResult.confirm(otp);
        const idToken = await firebaseResult.user.getIdToken();

        const res = await axiosInstance.post("/api/auth/firebase-verify", {
          idToken,
          mobile,
        });

        if (!res.data.success) throw new Error("Backend validation failed");
        user = res.data.result;

        // Set session cookie was already set by backend; invalidate cache
        if (!user.pin || isResettingPin) {
          setStep("set_pin");
          return;
        }
      } else {
        // Backend OTP verification path (fallback)
        const res = await axiosInstance.post("/api/auth/verify-otp", {
          mobile,
          otp,
        });
        if (!res.data.success) throw new Error("Invalid OTP");
        user = res.data.result;

        if (!user.pin || isResettingPin) {
          setStep("set_pin");
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["user"] });
      navigate("/dashboard");
    } catch (err) {
      console.error("OTP verification error:", err);
      const msg =
        err?.code === "auth/invalid-verification-code"
          ? "Invalid OTP. Please try again."
          : err?.code === "auth/code-expired"
          ? "OTP has expired. Please request a new one."
          : err.response?.data?.message || "OTP verification failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── PIN Login ────────────────────────────────────────────────────────────
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

  // ── Set PIN ──────────────────────────────────────────────────────────────
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

  // ── Forgot PIN → resend OTP ──────────────────────────────────────────────
  const handleForgotPin = async () => {
    setLoading(true);
    setIsResettingPin(true);
    clearRecaptcha();
    try {
      if (useFirebase && getFirebaseAuth()) {
        await sendFirebaseOtp();
      } else {
        await sendBackendOtp();
      }
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setOtp("");
    clearRecaptcha();
    setLoading(true);
    try {
      if (useFirebase && getFirebaseAuth()) {
        await sendFirebaseOtp();
      } else {
        await sendBackendOtp();
      }
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-emerald-500">
      {/* Invisible reCAPTCHA container — required by Firebase */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-sm sm:m-0 m-5 space-y-6 border-2 border-emerald-500 rounded-xl px-6 py-10 bg-white shadow-2xl">
        <div className="flex justify-center">
          <img src="/images/logo.png" alt="Logo" className="w-24 h-auto" />
        </div>

        {/* ── Step 1: Mobile Entry ── */}
        {step === "mobile_entry" && (
          <div className="space-y-4">
            <h2 className="text-center font-bold text-gray-700 text-lg">
              Member Login
            </h2>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                +91
              </span>
              <input
                type="tel"
                placeholder="Mobile number"
                maxLength={10}
                className="input input-bordered border-emerald-500 focus:border-emerald-600 w-full rounded-full bg-white text-gray-800 pl-12"
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                value={mobile}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
              />
            </div>
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                "NEXT"
              )}
            </button>
            {useFirebase && (
              <p className="text-center text-xs text-emerald-600 flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 19.7h20L12 2zm0 3.2l7.4 13.5H4.6L12 5.2z"/></svg>
                Secured with Firebase
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: OTP Entry ── */}
        {step === "otp_entry" && (
          <div className="space-y-4">
            <h2 className="text-center font-bold text-gray-700 text-lg">
              Verify Mobile
            </h2>
            <p className="text-center text-xs text-gray-500">
              We&apos;ve sent a 6-digit OTP to +91 {mobile}
            </p>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter OTP"
              className="input input-bordered border-emerald-500 text-center text-xl tracking-widest w-full rounded-full bg-white text-gray-800"
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              value={otp}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              autoFocus
            />
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                "VERIFY OTP"
              )}
            </button>
            <div className="flex justify-between px-2 mt-1">
              <button
                onClick={() => {
                  clearRecaptcha();
                  setStep("mobile_entry");
                  setOtp("");
                }}
                className="text-xs text-emerald-600 hover:underline"
              >
                Change number
              </button>
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="text-xs text-emerald-600 hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: PIN Entry ── */}
        {step === "pin_entry" && (
          <div className="space-y-4 text-center">
            <h2 className="font-bold text-gray-700 text-lg">Enter Your PIN</h2>
            <p className="text-xs text-gray-500">
              Welcome back! Enter your 4-digit PIN for {mobile}
            </p>
            <input
              type="password"
              maxLength={4}
              placeholder="4-digit PIN"
              className="input input-bordered border-emerald-500 text-center text-2xl tracking-widest w-full rounded-full bg-white text-gray-800"
              onChange={(e) =>
                setPinValue(e.target.value.replace(/\D/g, ""))
              }
              value={pin}
              onKeyDown={(e) => e.key === "Enter" && handleLoginWithPin()}
              autoFocus
            />
            <button
              className="btn btn-success text-white rounded-full w-full"
              onClick={handleLoginWithPin}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                "LOGIN"
              )}
            </button>
            <div className="flex justify-between px-2 mt-2">
              <button
                onClick={() => setStep("mobile_entry")}
                className="text-xs text-emerald-600 hover:underline"
              >
                Change Mobile
              </button>
              <button
                onClick={handleForgotPin}
                className="text-xs text-emerald-600 hover:underline"
              >
                Forgot PIN?
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Set PIN ── */}
        {step === "set_pin" && (
          <div className="space-y-4">
            <h2 className="text-center font-bold text-gray-700 text-lg">
              Create Login PIN
            </h2>
            <p className="text-center text-xs text-gray-500">
              Set a 4-digit PIN for faster future logins
            </p>
            <input
              type="password"
              maxLength={4}
              placeholder="Create 4-digit PIN"
              className="input input-bordered border-emerald-500 text-center text-xl w-full rounded-full bg-white text-gray-800"
              onChange={(e) =>
                setPinValue(e.target.value.replace(/\D/g, ""))
              }
              value={pin}
              autoFocus
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
              {loading ? (
                <span className="loading loading-spinner" />
              ) : (
                "SET PIN & FINISH"
              )}
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-emerald-100">
          <a
            href="https://stoimilk.com"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 w-full text-center hover:underline flex items-center justify-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go to Home Page
          </a>
        </div>
      </div>
      <button id="msg91-hidden-btn" className="hidden" aria-hidden="true" />
    </div>
  );
};
