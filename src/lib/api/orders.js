import { axiosInstance } from "../axios";

// --- Rider API ---
export const createOrder = async (data) => {
    const res = await axiosInstance.post("/api/orders", data);
    return res.data;
};

export const getOrders = async (params = {}) => {
    const res = await axiosInstance.get("/api/orders", { params });
    return res.data;
};

export const getAssignedOrders = async (status) => {
    const params = status ? { status } : {};
    const res = await axiosInstance.get("/api/orders/assigned", { params });
    return res.data;
};

export const updateOrderStatus = async (id, status, extraData = {}) => {
    // If extraData is just a number (backwards compatibility for bottlesReturned)
    const payload = typeof extraData === 'number'
        ? { status, bottlesReturned: extraData }
        : { status, ...extraData };

    const res = await axiosInstance.patch(`/api/orders/${id}/status`, payload);
    return res.data;
};

export const assignRider = async (id, riderId) => {
    const res = await axiosInstance.patch(`/api/orders/${id}/assign`, { riderId });
    return res.data;
};

// --- Bottle Management API ---
export const updateOrder = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/orders/${id}`, data);
    return res.data;
};
