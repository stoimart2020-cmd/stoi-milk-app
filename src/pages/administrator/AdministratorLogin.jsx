import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { adminLogin } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../../lib/queryClient";

export const AdministratorLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const { mutate } = useMutation({
    mutationFn: adminLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentAdmin"] });
      navigate("/administrator/dashboard");
    },
    onError: (error) => {
      alert("Login failed: " + (error.response?.data?.message || error.message));
      console.error("Login error:", error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(form);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-100 p-4"
      style={{
        backgroundImage:
          "linear-gradient(#00000040,#00000040),url('/images/loginBg.jpeg')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-3xl font-bold text-center text-gray-800">
          Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition duration-200"
          >
            Login
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
          <button 
            onClick={() => alert("Please contact the Super Admin or System Administrator to reset your password.")}
            className="text-sm text-gray-500 hover:text-blue-600 w-full text-center hover:underline"
          >
            Forgot Password?
          </button>
          
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
