import { axiosInstance } from "../axios";

// --- User Management ---
export const getAllUsers = async (roleOrParams) => {
    let params = {};
    if (typeof roleOrParams === 'string') {
        params = { role: roleOrParams };
    } else if (roleOrParams) {
        params = roleOrParams;
    }
    const res = await axiosInstance.get("/api/users", { params });
    return res.data;
};

export const updateUserRole = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/users/${id}/role`, data);
    return res.data;
};

export const createUser = async (data) => {
    const res = await axiosInstance.post("/api/users", data);
    return res.data;
};

// --- Role Management ---
export const getRoles = async () => {
    const res = await axiosInstance.get("/api/roles");
    return res.data;
};

export const getRoleById = async (id) => {
    const res = await axiosInstance.get(`/api/roles/${id}`);
    return res.data;
};

export const createRole = async (data) => {
    const res = await axiosInstance.post("/api/roles", data);
    return res.data;
};

export const updateRole = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/roles/${id}`, data);
    return res.data;
};

export const deleteRole = async (id) => {
    const res = await axiosInstance.delete(`/api/roles/${id}`);
    return res.data;
};

// --- Admin Data Management ---
export const clearAdminData = async (type) => {
    const res = await axiosInstance.delete("/api/admin/clear-data", { data: { type } });
    return res.data;
};
