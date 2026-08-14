import { useQuery } from "@tanstack/react-query";
import {
  getIssuedCertificates,
} from "../services/certificates.service";

export function useIssuedCertificates() {
  return useQuery({
    queryKey: ["issued-certificates"],
    queryFn: getIssuedCertificates,
  });
}