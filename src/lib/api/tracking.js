import { axiosInstance } from "../axios";

// Get all riders with their location data (for admin live map)
export const getAllRidersTracking = async () => {
    const { data } = await axiosInstance.get("/api/tracking/all-riders");
    return data;
};

// Get a single rider's location
export const getRiderLocation = async (riderId) => {
    const { data } = await axiosInstance.get(`/api/tracking/rider/${riderId}`);
    return data;
};

// Get a rider's location history
export const getRiderLocationHistory = async (riderId, limit = 50) => {
    const { data } = await axiosInstance.get(`/api/tracking/rider/${riderId}/history?limit=${limit}`);
    return data;
};

// Get tracking summary for dashboard
export const getTrackingSummary = async () => {
    const { data } = await axiosInstance.get("/api/tracking/summary");
    return data;
};
