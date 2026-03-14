import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "/api",
  // baseURL: "https://stoi-server.onrender.com",
  withCredentials: true,
});

// import toast from "react-hot-toast";

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      // toast.error("Server connection lost. Retrying...", { id: "network-error" });
      console.error("Server connection lost. Retrying...");
    }
    return Promise.reject(error);
  }
);
