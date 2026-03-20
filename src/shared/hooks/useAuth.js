import { useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUser } from "../api/auth";
import { axiosInstance } from "../api/axios";

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isPending } = useQuery({
    queryKey: ["user"],
    queryFn: currentUser,
    retry: false,
  });

  const logout = async () => {
    try {
      // Call server to clear httpOnly cookie
      await axiosInstance.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    }

    // Determine current portal and target login path
    const path = window.location.pathname;
    let target = "/"; // default customer home

    if (path.includes("/administrator/") || path.includes("/roles")) {
      target = "/administrator/login";
    } else if (path.includes("/rider/")) {
      target = "/rider/login";
    } else if (path.includes("/fieldsales/")) {
      target = "/fieldsales/login";
    }

    // Clear session storage/local storage
    localStorage.removeItem("stoi_token");
    localStorage.removeItem("stoi_current_user_id");

    // Clear all cached queries immediately so the next user doesn't see old data
    queryClient.clear();

    // Redirect to the appropriate portal login page
    window.location.href = target;
  };

  return {
    data,
    isLoading,
    isPending,
    logout,
  };
};
