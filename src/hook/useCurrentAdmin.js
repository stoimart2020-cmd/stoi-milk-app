import { useQuery } from "@tanstack/react-query";
import { currentAdmin } from "../lib/api/auth";

export const useCurrentAdmin = () => {
  const { data, isLoading, isPending } = useQuery({
    queryKey: ["currentAdmin"],
    queryFn: currentAdmin,
    // staleTime: 1000, // 1 second
    retry: false,
  });

  return {
    data,
    isLoading,
    isPending,
  };
};
