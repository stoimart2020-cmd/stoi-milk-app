import { axiosInstance } from "../axios";

export const getComplaints = async (params) => {
    return axiosInstance.get("/api/complaints", { params });
};

export const getCustomerComplaints = async (userId) => {
    return axiosInstance.get(`/api/complaints?user=${userId}`);
};

export const createComplaint = async (data) => {
    return axiosInstance.post("/api/complaints", data);
};

export const updateComplaint = async (id, data) => {
    return axiosInstance.put(`/api/complaints/${id}`, data);
};
