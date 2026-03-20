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

    // Clear token from localStorage
    localStorage.removeItem("stoi_token");
    localStorage.removeItem("stoi_current_user_id");

    // Clear all cached queries
    queryClient.clear();

    // Redirect to login page
    window.location.href = "/";
  };

  return {
    data,
    isLoading,
    isPending,
    logout,
  };
};
