import { useQuery } from "@tanstack/react-query";
import { getPendingCSR } from "../services/csr.service";

export function useCSR() {
  return useQuery({
    queryKey: ["pending-csr"],
    queryFn: getPendingCSR,
  });
}