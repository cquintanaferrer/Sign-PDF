import { useQuery } from "@tanstack/react-query";

import { getCAStatus } from "../services/ca.service";

export function useCAStatus() {
  return useQuery({
    queryKey: ["ca-status"],
    queryFn: getCAStatus,
  });
}