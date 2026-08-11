import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboard.service";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });
}