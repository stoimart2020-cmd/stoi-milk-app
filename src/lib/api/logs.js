import { axiosInstance } from "../axios";

export const getActivityLogs = async ({ userId, page = 1, limit = 50 }) => {
    const res = await axiosInstance.get(`/api/logs`, {
        params: {
            userId,
            page,
            limit
        }
    });
    return res;
};
