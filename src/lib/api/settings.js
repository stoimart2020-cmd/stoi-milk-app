import { axiosInstance } from "../axios";

export const getSettings = async () => {
    try {
        const response = await axiosInstance.get("/api/settings");
        return response.data;
    } catch (err) {
        console.error("Error fetching settings:", err);
        throw err;
    }
};

export const getPublicSettings = async () => {
    try {
        const response = await axiosInstance.get("/api/settings/public");
        return response.data;
    } catch (err) {
        console.error("Error fetching public settings:", err);
        return null;
    }
};


export const updateSettings = async ({ section, data }) => {
    try {
        const response = await axiosInstance.put("/api/settings", { section, data });
        return response.data;
    } catch (err) {
        console.error("Error updating settings:", err);
        throw err;
    }
};

export const clearData = async (type) => {
    try {
        const response = await axiosInstance.post("/api/admin/clear-data", { type });
        return response.data;
    } catch (err) {
        console.error("Error clearing data:", err);
        throw err;
    }
};
