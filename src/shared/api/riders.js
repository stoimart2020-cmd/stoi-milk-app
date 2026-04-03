import { axiosInstance } from "./axios";

export const getAllRiders = async () => {
    const { data } = await axiosInstance.get("/api/users?role=RIDER");
    return data;
};

export const createRider = async (riderData) => {
    const { data } = await axiosInstance.post("/api/users", { ...riderData, role: "RIDER" });
    return data;
};

export const updateRider = async (id, riderData) => {
    const { data } = await axiosInstance.put(`/api/users/${id}`, riderData);
    return data;
};

export const deleteRider = async (id) => {
    const { data } = await axiosInstance.delete(`/api/users/${id}`);
    return data;
};

export const getRiderCustomers = async (id) => {
    const { data } = await axiosInstance.get(`/api/riders/${id}/customers`);
    return data;
};

export const getRider = async (id) => {
    const { data } = await axiosInstance.get(`/api/users/${id}`);
    return data;
};

// Attendance
export const getRiderAttendance = async (id, month, year) => {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const { data } = await axiosInstance.get(`/api/riders/${id}/attendance`, { params });
    return data;
};

export const markRiderAttendance = async (id, attendanceData) => {
    const { data } = await axiosInstance.post(`/api/riders/${id}/attendance`, attendanceData);
    return data;
};

// Documents
export const getRiderDocuments = async (id) => {
    const { data } = await axiosInstance.get(`/api/riders/${id}/documents`);
    return data;
};

export const uploadRiderDocument = async (id, docData) => {
    const { data } = await axiosInstance.post(`/api/riders/${id}/documents`, docData);
    return data;
};

// Financials (Admin view)
export const getRiderFinancials = async (id, month, year) => {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const { data } = await axiosInstance.get(`/api/riders/${id}/financials`, { params });
    return data;
};

// Cash Collection
export const collectCashFromRider = async (id, amount, notes) => {
    const { data } = await axiosInstance.post(`/api/riders/${id}/collect-cash`, { amount, notes });
    return data;
};

// KM Log (Admin submits for rider)
export const submitRiderKmLog = async (id, kmData) => {
    const { data } = await axiosInstance.post(`/api/riders/${id}/km-log`, kmData);
    return data;
};

// Advance Payment (Admin pays salary advance to rider)
export const payAdvanceToRider = async (id, amount, notes) => {
    const { data } = await axiosInstance.post(`/api/riders/${id}/pay-advance`, { amount, notes });
    return data;
};

// ===============================
// RIDER SELF-SERVICE APIs
// ===============================

// Rider's own financials
export const getRiderSelfFinancials = async () => {
    const { data } = await axiosInstance.get("/api/riders/my/financials");
    return data;
};

// Rider's today KM log
export const getRiderTodayKmLog = async () => {
    const { data } = await axiosInstance.get("/api/riders/my/km-log");
    return data;
};

// Rider submits own KM log
export const submitRiderSelfKmLog = async (kmData) => {
    const { data } = await axiosInstance.post("/api/riders/my/km-log", kmData);
    return data;
};

// Rider gets their own customers
export const getRiderCustomersSelf = async () => {
    const { data } = await axiosInstance.get("/api/riders/my/customers");
    return data;
};

// Rider updates their own route order
export const updateRiderRouteSelf = async (route) => {
    const { data } = await axiosInstance.put("/api/riders/my/route", { route });
    return data;
};

export const getRiderTempOtp = async (id) => {
    const { data } = await axiosInstance.get(`/api/riders/${id}/temp-otp`);
    return data;
};

export const getUnassignedCustomers = async () => {
    const { data } = await axiosInstance.get("/api/riders/unassigned/customers");
    return data;
};
