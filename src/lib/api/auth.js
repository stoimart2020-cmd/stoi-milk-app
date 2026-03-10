import { axiosInstance } from "../axios";

export const sendOtp = async (mobile) => {
    const res = await axiosInstance.post("/api/auth/send-otp", { mobile });
    return res;
};

export const verifyOtp = async ({ mobile, otp }) => {
    const res = await axiosInstance.post("/api/auth/verify-otp", {
        mobile,
        otp,
    });
    return res;
};

export const onBoard = async (data) => {
    const res = await axiosInstance.post("/api/auth/onboard", data);
    return res;
};

export const currentUser = async () => {
    try {
        const res = await axiosInstance.get("/api/auth/me");
        return res;
    } catch (err) {
        return null;
    }
};

export const adminLogin = async (data) => {
    const res = await axiosInstance.post("/api/auth/super-admin-login", data);
    return res;
};

export const currentAdmin = async () => {
    try {
        const response = await axiosInstance.get("/api/auth/current-admin");
        return response.data;
    } catch (error) {
        // console.error("Error fetching current admin:", error);
        return null;
    }
};
export const updateFcmToken = async (fcmToken) => {
    const res = await axiosInstance.post("/api/auth/update-fcm-token", { fcmToken });
    return res;
};
