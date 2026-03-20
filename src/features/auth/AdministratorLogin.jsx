import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { adminLogin, verifyTwoStep } from "../../shared/api/auth";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../../shared/utils/queryClient";
import toast from "react-hot-toast";

export const AdministratorLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [otp, setOtp] = useState("");
  const [requiresTwoStep, setRequiresTwoStep] = useState(false);
  const [mobile, setMobile] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const loginMutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (res) => {
      if (res.data.requiresPin) {
        setRequiresTwoStep(true);
        setMobile(res.data.mobile);
        toast.success("Secondary verification required.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["currentAdmin"] });
        navigate("/administrator/dashboard");
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Login failed");
    }
  });

  const verifyMutation = useMutation({
    mutationFn: verifyTwoStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentAdmin"] });
      navigate("/administrator/dashboard");
      toast.success("Login successful");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Invalid PIN");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(form);
  };

  const handleVerify = (e) => {
    e.preventDefault();
    verifyMutation.mutate({ mobile, pin: otp }); // Reusing the 'otp' state for PIN
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-100 p-4"
      style={{
        backgroundImage: "linear-gradient(#00000060,#00000060),url('/images/loginBg.jpeg')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-2xl border border-white/20">
        <div className="flex justify-center mb-6">
          <img src="/images/logo.png" alt="Logo" className="h-16 w-auto" />
        </div>
        
        <h2 className="mb-2 text-3xl font-bold text-center text-gray-800">
          Admin Portal
        </h2>
        <p className="text-center text-gray-500 mb-8 font-medium">
          {requiresTwoStep ? "Secondary PIN Verification" : "Sign in to your account"}
        </p>

        {!requiresTwoStep ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1 ml-1">
                Mobile / Email
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter username"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all bg-white text-gray-800 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1 ml-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all bg-white text-gray-800 shadow-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 flex justify-center items-center gap-2"
            >
              {loginMutation.isPending ? <span className="loading loading-spinner loading-sm"></span> : "LOGIN NOW"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
               <p className="text-sm text-blue-700">Please provide your 4-digit security PIN to finish logging in.</p>
             </div>
             
             <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 text-center">
                Enter your 4-digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="****"
                className="w-full rounded-xl border-2 border-blue-100 px-4 py-4 focus:border-blue-500 focus:outline-none transition-all bg-white text-gray-800 text-center text-3xl font-bold tracking-[1em]"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200"
            >
              {verifyMutation.isPending ? "VERIFYING..." : "CONFIRM PIN"}
            </button>
            <button 
              type="button"
              onClick={() => setRequiresTwoStep(false)}
              className="w-full text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              Back to Password
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4">
          {!requiresTwoStep && (
            <button 
              onClick={() => toast.error("Please contact System Administrator")}
              className="text-sm text-gray-500 hover:text-blue-600 w-full text-center hover:underline"
            >
              Forgot Password?
            </button>
          )}
          
          <a 
            href="https://stoimilk.com"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 w-full text-center hover:underline flex items-center justify-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Go to Home Page
          </a>
        </div>
      </div>
    </div>
  );
};
