import { axiosInstance } from "./axios";

// ========================
// FACTORY API
// ========================
export const getFactories = async () => {
    const res = await axiosInstance.get("/api/logistics/factories");
    return res.data;
};
export const createFactory = async (data) => {
    const res = await axiosInstance.post("/api/logistics/factories", data);
    return res.data;
};
export const updateFactory = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/factories/${id}`, data);
    return res.data;
};
export const deleteFactory = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/factories/${id}`);
    return res.data;
};

// ========================
// DISTRICT API
// ========================
export const getDistricts = async () => {
    const res = await axiosInstance.get("/api/logistics/districts");
    return res.data;
};
export const createDistrict = async (data) => {
    const res = await axiosInstance.post("/api/logistics/districts", data);
    return res.data;
};
export const updateDistrict = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/districts/${id}`, data);
    return res.data;
};
export const deleteDistrict = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/districts/${id}`);
    return res.data;
};

// ========================
// CITY API
// ========================
export const getCities = async () => {
    const res = await axiosInstance.get("/api/logistics/cities");
    return res.data;
};
export const createCity = async (data) => {
    const res = await axiosInstance.post("/api/logistics/cities", data);
    return res.data;
};
export const updateCity = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/cities/${id}`, data);
    return res.data;
};
export const deleteCity = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/cities/${id}`);
    return res.data;
};

// ========================
// AREA API
// ========================
export const getAreas = async () => {
    const res = await axiosInstance.get("/api/logistics/areas");
    return res.data;
};
export const createArea = async (data) => {
    const res = await axiosInstance.post("/api/logistics/areas", data);
    return res.data;
};
export const updateArea = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/areas/${id}`, data);
    return res.data;
};
export const deleteArea = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/areas/${id}`);
    return res.data;
};

// ========================
// HUB API (Hub belongs to Area)
// ========================
export const getHubs = async () => {
    const res = await axiosInstance.get("/api/logistics/hubs");
    return res.data;
};
export const createHub = async (data) => {
    const res = await axiosInstance.post("/api/logistics/hubs", data);
    return res.data;
};
export const updateHub = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/hubs/${id}`, data);
    return res.data;
};
export const deleteHub = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/hubs/${id}`);
    return res.data;
};

// ========================
// DELIVERY POINT API (formerly Stock Points)
// ========================
export const getDeliveryPoints = async () => {
    const res = await axiosInstance.get("/api/logistics/delivery-points");
    return res.data;
};
export const createDeliveryPoint = async (data) => {
    const res = await axiosInstance.post("/api/logistics/delivery-points", data);
    return res.data;
};
export const updateDeliveryPoint = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/delivery-points/${id}`, data);
    return res.data;
};
export const deleteDeliveryPoint = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/delivery-points/${id}`);
    return res.data;
};

// Legacy aliases (backward compatibility)
export const getStockPoints = getDeliveryPoints;
export const createStockPoint = createDeliveryPoint;
export const updateStockPoint = updateDeliveryPoint;
export const deleteStockPoint = deleteDeliveryPoint;

// ========================
// DELIVERY ROUTE API
// ========================
export const getDeliveryRoutes = async () => {
    const res = await axiosInstance.get("/api/logistics/delivery-routes");
    return res.data;
};
export const createDeliveryRoute = async (data) => {
    const res = await axiosInstance.post("/api/logistics/delivery-routes", data);
    return res.data;
};
export const updateDeliveryRoute = async ({ id, data }) => {
    const res = await axiosInstance.put(`/api/logistics/delivery-routes/${id}`, data);
    return res.data;
};
export const deleteDeliveryRoute = async (id) => {
    const res = await axiosInstance.delete(`/api/logistics/delivery-routes/${id}`);
    return res.data;
};

// ========================
// HIERARCHY API
// ========================
export const getHierarchy = async () => {
    const res = await axiosInstance.get("/api/logistics/hierarchy");
    return res.data;
};

// ========================
// SERVICE AREAS
// ========================
export const getServiceAreas = async () => {
    const res = await axiosInstance.get("/api/service-areas");
    return res.data;
};

// ========================
// BOTTLE TRACKING API
// ========================
export const getBottleStats = async () => {
    const res = await axiosInstance.get("/api/bottles/stats");
    return res.data;
};
export const getCustomerBottles = async (params = {}) => {
    const res = await axiosInstance.get("/api/bottles/customers", { params });
    return res.data;
};
export const getBottleTransactions = async (params = {}) => {
    const res = await axiosInstance.get("/api/bottles/transactions", { params });
    return res.data;
};
export const recordBottleTransaction = async (data) => {
    const res = await axiosInstance.post("/api/bottles/transaction", data);
    return res.data;
};
export const getCustomerBottleBalance = async (customerId) => {
    const res = await axiosInstance.get(`/api/bottles/balance/${customerId}`);
    return res.data;
};
export const getRiderBottleStats = async () => {
    const res = await axiosInstance.get("/api/bottles/rider-stats");
    return res.data;
};
export const issueBottlesWithDeposit = async (data) => {
    const res = await axiosInstance.post("/api/bottles/issue-with-deposit", data);
    return res.data;
};
export const returnBottlesWithRefund = async (data) => {
    const res = await axiosInstance.post("/api/bottles/return-with-refund", data);
    return res.data;
};
export const generateBottleQR = async (data) => {
    const res = await axiosInstance.post("/api/bottles/generate-qr", data);
    return res.data;
};
export const scanBottleQR = async (data) => {
    const res = await axiosInstance.post("/api/bottles/scan-qr", data);
    return res.data;
};
export const scheduleBottleCollection = async (data) => {
    const res = await axiosInstance.post("/api/bottles/schedule-collection", data);
    return res.data;
};
export const getBottleAnalytics = async (params = {}) => {
    const res = await axiosInstance.get("/api/bottles/analytics", { params });
    return res.data;
};
export const getCollectionAlerts = async (threshold = 5) => {
    const res = await axiosInstance.get("/api/bottles/collection-alerts", { params: { threshold } });
    return res.data;
};
export const bulkBottleAdjustment = async (data) => {
    const res = await axiosInstance.post("/api/bottles/bulk-adjustment", data);
    return res.data;
};
export const getBottleLifecycleReport = async () => {
    const res = await axiosInstance.get("/api/bottles/lifecycle-report");
    return res.data;
};

// ========================
// LOGISTICS FORECAST API
// --- Inventory & Production Logs ---
export const getLogisticsForecast = async (params) => {
    const response = await axiosInstance.get('/api/inventory/forecast', { params });
    return response.data;
};

export const getDailyStockStatus = async (date) => {
    const response = await axiosInstance.get('/api/inventory/status', { params: { date } });
    return response.data;
};

export const addProductionLog = async (data) => {
    const response = await axiosInstance.post('/api/inventory/log', data);
    return response.data;
};
