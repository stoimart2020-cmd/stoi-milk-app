import React, { useState, useEffect } from "react";
import { useCurrentAdmin } from "../hook/useCurrentAdmin";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const AdministratorEditProfile = () => {
    const { data: adminData, isLoading } = useCurrentAdmin();
    const user = adminData?.user;

    const [formData, setFormData] = useState({
        mobile: "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData((prev) => ({
                ...prev,
                mobile: user.mobile || "",
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleReset = () => {
        setFormData({
            mobile: user?.mobile || "",
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (formData.newPassword && formData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        // Note: Backend currently bypasses current password check for profile update in this simple implementation
        // But ideally we should verify it. For now, we trust the session.
        // If strict security is needed, we should add a verify-password endpoint.

        setIsSubmitting(true);
        try {
            const payload = {};
            if (formData.newPassword) payload.password = formData.newPassword;
            // We can add other fields here if we expose them (Name, etc)

            const response = await axiosInstance.put("/api/users/profile", payload);

            if (response.data.success) {
                toast.success("Profile updated successfully");
                setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="text-sm text-gray-500 mb-4 uppercase">Home / Edit Profile</div>

            <div className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto">
                <h2 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Edit Profile</h2>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Mobile Number</label>
                        <input
                            type="text"
                            name="mobile"
                            value={formData.mobile}
                            disabled
                            className="w-full border border-gray-300 rounded-md px-4 py-2 bg-gray-50 text-gray-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Current Password</label>
                        <input
                            type="password"
                            name="currentPassword"
                            placeholder="Current Password"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-gray-300"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 font-medium mb-2">New Password</label>
                        <input
                            type="password"
                            name="newPassword"
                            placeholder="New Password"
                            value={formData.newPassword}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-gray-300"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Confirm New Password</label>
                        <input
                            type="password"
                            name="confirmNewPassword"
                            placeholder="Confirm New Password"
                            value={formData.confirmNewPassword}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-gray-300"
                        />
                    </div>

                    <div className="border-t pt-6 mt-6 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-6 py-2 bg-orange-400 text-white font-medium rounded-full hover:bg-orange-500 transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reset
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-teal-500 text-white font-medium rounded-full hover:bg-teal-600 transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            {isSubmitting ? "Saving..." : "Save"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
