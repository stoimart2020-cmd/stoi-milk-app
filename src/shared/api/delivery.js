import { axiosInstance } from "./axios";

export const getDeliveryDashboard = async (params = {}) => {
    const { data } = await axiosInstance.get("/api/delivery/dashboard", { params });
    return data;
};

export const getDeliveryOrders = async (params = {}) => {
    const { data } = await axiosInstance.get("/api/delivery/orders", { params });
    return data;
};

export const generateOrdersForDate = async (date) => {
    const params = date ? { date } : {};
    const { data } = await axiosInstance.post("/api/delivery/generate-orders", null, { params });
    return data;
};

export const bulkAssignRider = async (payload) => {
    const { data } = await axiosInstance.post("/api/delivery/bulk-assign", payload);
    return data;
};

export const bulkUpdateStatus = async ({ orderIds, status }) => {
    const { data } = await axiosInstance.post("/api/delivery/bulk-status", { orderIds, status });
    return data;
};
