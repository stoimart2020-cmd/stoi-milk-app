import { axiosInstance } from "./axios";

export const getAllCustomers = async (search = "", filters = {}) => {
    try {
        const response = await axiosInstance.get("/api/customers", {
            params: { search, ...filters },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching customers:", error);
        throw error;
    }
};

export const getCustomerSummary = async () => {
    try {
        const response = await axiosInstance.get("/api/customers/summary");
        return response.data;
    } catch (error) {
        console.error("Error fetching customer summary:", error);
        throw error;
    }
};


export const createCustomer = async (data) => {
    try {
        const response = await axiosInstance.post("/api/customers", data);
        return response.data;
    } catch (error) {
        console.error("Error creating customer:", error);
        throw error;
    }
};

export const getCustomerById = async (id) => {
    try {
        const response = await axiosInstance.get(`/api/customers/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching customer:", error);
        throw error;
    }
};

export const updateCustomer = async ({ id, data }) => {
    try {
        const response = await axiosInstance.put(`/api/customers/${id}`, data);
        return response.data;
    } catch (error) {
        console.error("Error updating customer:", error);
        throw error;
    }
};

export const getCustomerByMobile = async (mobile) => {
    try {
        const response = await axiosInstance.get(`/api/customers/mobile/${mobile}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching customer by mobile:", error);
        throw error;
    }
};

// Added missing function
export const updateVacation = async (data) => {
    // data: { customerId, startDate, endDate, reason/note }
    try {
        const response = await axiosInstance.post("/api/vacation/admin/set", data);
        return response.data;
    } catch (error) {
        console.error("Error updating vacation:", error);
        throw error;
    }
};
export const mergeCustomers = async (data) => {
    // data: { sourceId, targetId }
    try {
        const response = await axiosInstance.post("/api/customers/merge", data);
        return response.data;
    } catch (error) {
        console.error("Error merging customers:", error);
        throw error;
    }
};

export const getTempOtp = async (id) => {
    try {
        const response = await axiosInstance.get(`/api/customers/${id}/temp-otp`);
        return response.data;
    } catch (error) {
        console.error("Error fetching temp otp:", error);
        throw error;
    }
};

export const uploadCustomers = async (formData, onUploadProgress) => {
    try {
        const response = await axiosInstance.post("/api/customers/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            },
            onUploadProgress
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading customers:", error);
        throw error;
    }
};
