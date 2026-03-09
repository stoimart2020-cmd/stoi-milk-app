import { axiosInstance } from "../axios";

export const createSubscription = async (data) => {
    const res = await axiosInstance.post("/api/subscriptions", data);
    return res;
};

export const getSubscriptions = async (params) => {
    const res = await axiosInstance.get("/api/subscriptions", { params });
    return res;
};

export const updateSubscription = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/subscriptions/${id}`, data);
    return res;
};

export const togglePauseSubscription = async ({ id, paused }) => {
    const res = await axiosInstance.put(`/api/subscriptions/${id}/pause`, { paused });
    return res;
};

export const cancelSubscription = async (id) => {
    const res = await axiosInstance.put(`/api/subscriptions/${id}/cancel`);
    return res;
};

// Admin functions
export const getAdminCustomerSubscriptions = async (userId) => {
    const res = await axiosInstance.get(`/api/subscriptions/admin/${userId}`);
    return res.data;
};

export const getAllSubscriptions = async (params) => {
    const res = await axiosInstance.get("/api/subscriptions/admin-all", { params });
    return res.data;
};

export const getAdminCalendarData = async (userId, year, month) => {
    const res = await axiosInstance.get(`/api/subscriptions/admin/calendar/${userId}`, {
        params: { year, month }
    });
    return res.data;
};

export const updateAdminDailyModification = async (data) => {
    // data: { subscriptionId, date, quantity }
    const res = await axiosInstance.put("/api/subscriptions/admin/modification", data);
    return res;
};

export const resetTrialEligibility = async (data) => {
    // data: { userId, subcategoryId }
    const res = await axiosInstance.post("/api/subscriptions/admin/reset-trial", data);
    return res.data;
};
