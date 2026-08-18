import { useQuery } from "@tanstack/react-query";
import { getCertificates } from "../services/certificate.service";

export function useCertificates() {
  return useQuery({
    queryKey: ["certificates"],
    queryFn: getCertificates,
  });
}