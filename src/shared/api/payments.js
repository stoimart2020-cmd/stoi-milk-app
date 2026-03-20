import { axiosInstance } from "./axios";

export const addPayment = async (data) => {
    const res = await axiosInstance.post("/api/payments", data);
    return res.data;
};

export const addPaymentPublic = async (data) => {
    const res = await axiosInstance.post("/api/payments/public", data);
    return res.data;
};

export const createOrderPublic = async (data) => {
    const res = await axiosInstance.post("/api/payments/public/create-order", data);
    return res.data;
};

export const verifyPaymentPublic = async (data) => {
    const res = await axiosInstance.post("/api/payments/public/verify-payment", data);
    return res.data;
};

export const getTransactions = async (params) => {
    const res = await axiosInstance.get("/api/payments", { params });
    return res.data;
};

export const exportTransactions = async (params) => {
    const res = await axiosInstance.get("/api/payments/export", { params, responseType: 'blob' });
    return res.data;
};
export const createPaymentLink = async (data) => {
    // data: { userId, amount, description }
    const res = await axiosInstance.post("/api/payments/create-link", data);
    return res.data;
};

export const createQrCode = async (data) => {
    const res = await axiosInstance.post("/api/payments/create-qr", data);
    return res.data;
};
