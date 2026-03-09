import { axiosInstance } from "../axios";

export const getCategories = async () => {
    try {
        const response = await axiosInstance.get("/api/categories");
        return response.data;
    } catch (err) {
        console.error("Error fetching categories:", err);
        throw err;
    }
};

export const createCategory = async (data) => {
    try {
        const response = await axiosInstance.post("/api/categories", data);
        return response.data;
    } catch (err) {
        throw err;
    }
};

export const updateCategory = async ({ id, data }) => {
    try {
        const response = await axiosInstance.put(`/api/categories/${id}`, data);
        return response.data;
    } catch (err) {
        throw err;
    }
};

export const deleteCategory = async (id) => {
    try {
        const response = await axiosInstance.delete(`/api/categories/${id}`);
        return response.data;
    } catch (err) {
        throw err;
    }
};

export const createProduct = async (data) => {
    try {
        const response = await axiosInstance.post("/api/products", data);
        return response.data;
    } catch (err) {
        console.error("Error creating product:", err);
        throw err;
    }
};

export const getAllProducts = async () => {
    try {
        const response = await axiosInstance.get("/api/products");
        return response.data;
    } catch (err) {
        console.error("Error fetching products:", err);
        throw err;
    }
};

export const getProductById = async (id) => {
    try {
        const response = await axiosInstance.get(`/api/products/${id}`);
        return response.data;
    } catch (err) {
        throw err;
    }
};

export const updateProduct = async ({ data, id }) => {
    try {
        const response = await axiosInstance.put(`/api/products/${id}`, data);
        return response.data;
    } catch (err) {
        throw err;
    }
};
