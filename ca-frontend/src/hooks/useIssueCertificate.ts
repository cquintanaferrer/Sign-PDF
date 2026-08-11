import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  issueCertificate,
  FragmentData,
} from "../services/csr.service";

export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      csrId,
      fragments,
    }: {
      csrId: string;
      fragments: FragmentData[];
    }) =>
      issueCertificate(csrId, fragments),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pending-csr"],
      });

      queryClient.invalidateQueries({
        queryKey: ["certificates"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}