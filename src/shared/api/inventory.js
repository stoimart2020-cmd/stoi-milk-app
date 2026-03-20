import { axiosInstance } from "./axios";

export const getDailyStockStatus = async (date) => {
    // date: YYYY-MM-DD
    const res = await axiosInstance.get("/api/inventory/status", { params: { date } });
    return res.data;
};

export const addProductionLog = async (data) => {
    // data: { date, productsProduced, wastage, notes }
    const res = await axiosInstance.post("/api/inventory/log", data);
    return res.data;
};
