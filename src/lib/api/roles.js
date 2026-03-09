import { axiosInstance } from "../axios";

export const getRoles = async () => {
    const response = await axiosInstance.get("/api/roles");
    return response.data;
};

export const getRoleById = async (id) => {
    const response = await axiosInstance.get(`/api/roles/${id}`);
    return response.data;
};

export const createRole = async (roleData) => {
    const response = await axiosInstance.post("/api/roles", roleData);
    return response.data;
};

export const updateRole = async (id, roleData) => {
    const response = await axiosInstance.put(`/api/roles/${id}`, roleData);
    return response.data;
};

export const deleteRole = async (id) => {
    const response = await axiosInstance.delete(`/api/roles/${id}`);
    return response.data;
};
