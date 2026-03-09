import { axiosInstance } from "../axios";

export const getNotifications = async () => {
    try {
        const response = await axiosInstance.get("/api/notifications");
        return response.data;
    } catch (err) {
        console.error("Error fetching notifications:", err);
        throw err;
    }
};

export const markNotificationRead = async (id) => {
    try {
        const response = await axiosInstance.put(`/api/notifications/${id}/read`);
        return response.data;
    } catch (err) {
        console.error("Error marking notification read:", err);
        throw err;
    }
};
