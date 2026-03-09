import { axiosInstance } from "../axios";

export const getDashboardStats = async (filters = {}) => {
    try {
        const response = await axiosInstance.get("/api/dashboard/stats", { params: filters });
        return response.data;
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        throw err;
    }
};
