import { axiosInstance } from "../axios";

export const getVendors = async () => {
    const res = await axiosInstance.get("/api/vendors");
    return res.data;
};

export const createVendor = async (data) => {
    const res = await axiosInstance.post("/api/vendors", data);
    return res.data;
};

export const updateVendor = async (id, data) => {
    const res = await axiosInstance.put(`/api/vendors/${id}`, data);
    return res.data;
};

export const deleteVendor = async (id) => {
    const res = await axiosInstance.delete(`/api/vendors/${id}`);
    return res.data;
};

export const getMilkCollectionHistory = async (params) => {
    // params: { startDate, endDate, vendorId }
    const res = await axiosInstance.get("/api/vendors/collection/history", { params });
    return res.data;
};

export const addMilkCollection = async (data) => {
    const res = await axiosInstance.post("/api/vendors/collection", data);
    return res.data;
};

// Milk Collection Summary (grouped by year/month/week/day, with shift filter)
export const getMilkCollectionSummary = async (params) => {
    // params: { groupBy, startDate, endDate, shift, vendorId }
    const res = await axiosInstance.get("/api/vendors/collection/summary", { params });
    return res.data;
};

// Payment Summary (overall + per vendor)
export const getVendorPaymentSummary = async (params) => {
    // params: { startDate, endDate, vendorId }
    const res = await axiosInstance.get("/api/vendors/payment-summary", { params });
    return res.data;
};

// Record a payment to vendor
export const recordVendorPayment = async (data) => {
    // data: { vendor, amount, method, reference, notes, date }
    const res = await axiosInstance.post("/api/vendors/payments", data);
    return res.data;
};

// Get payment history
export const getVendorPayments = async (params) => {
    // params: { vendorId, startDate, endDate }
    const res = await axiosInstance.get("/api/vendors/payments", { params });
    return res.data;
};
