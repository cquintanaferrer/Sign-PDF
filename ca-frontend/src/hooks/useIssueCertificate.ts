import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issueCertificate } from "../services/csr.service";

export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      csrId,
      fragment1,
      fragment2,
    }: {
      csrId: string;
      fragment1: File;
      fragment2: File;
    }) =>
      issueCertificate(csrId, fragment1, fragment2),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pending-csr"],
      });
    },
  });
}