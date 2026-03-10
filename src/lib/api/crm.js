import { axiosInstance } from "../axios";

const MOCK_MODE = false;

// --- CRM (Leads) ---
export const getLeads = async (params) => {
    if (MOCK_MODE) return { result: [] };
    const res = await axiosInstance.get("/api/crm/leads", { params });
    return res.data;
};

export const createLead = async (data) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.post("/api/crm/leads", data);
    return res.data;
};

export const updateLead = async (id, data) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.put(`/api/crm/leads/${id}`, data);
    return res.data;
};

export const deleteLead = async (id) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.delete(`/api/crm/leads/${id}`);
    return res.data;
};

// Advanced CRM Endpoints
export const getLeadTimeline = async (id) => {
    if (MOCK_MODE) return { success: true, timeline: [] };
    const res = await axiosInstance.get(`/api/crm/leads/${id}`);
    return res.data;
};

export const addInteraction = async (id, data) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.post(`/api/crm/leads/${id}/interactions`, data);
    return res.data;
};

export const getPipelineAnalytics = async () => {
    if (MOCK_MODE) return { success: true, pipeline: [] };
    const res = await axiosInstance.get("/api/crm/pipeline-analytics");
    return res.data;
};

export const getCrmDashboardStats = async () => {
    if (MOCK_MODE) return { success: true, stats: {} };
    const res = await axiosInstance.get("/api/crm/dashboard-stats");
    return res.data;
};

export const getConversionPrediction = async (id) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.get(`/api/crm/leads/${id}/prediction`);
    return res.data;
};

// --- Complaints ---
export const getComplaints = async (params) => {
    if (MOCK_MODE) return { result: [] };
    const res = await axiosInstance.get("/api/complaints", { params });
    return res.data;
};

export const createComplaint = async (data) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.post("/api/complaints", data);
    return res.data;
};

export const updateComplaint = async (id, data) => {
    if (MOCK_MODE) return { success: true };
    const res = await axiosInstance.put(`/api/complaints/${id}`, data);
    return res.data;
};


