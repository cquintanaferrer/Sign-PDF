import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../services/auth.service";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
}