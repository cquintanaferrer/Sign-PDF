import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  revokeIssuedCertificate,
} from "../services/certificates.service";


export function useRevokeCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeIssuedCertificate,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issued-certificates"],
      });
    },
  });
}