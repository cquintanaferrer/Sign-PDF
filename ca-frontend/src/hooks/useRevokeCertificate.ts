import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revokeCertificate } from "../services/certificate.service";

export function useRevokeCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeCertificate,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["certificates"],
      });
    },
  });
}