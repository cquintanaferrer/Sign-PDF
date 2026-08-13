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
      csrFile,
      fragments,
    }: {
      csrFile: File;
      fragments: FragmentData[];
    }) =>
      issueCertificate(
        csrFile,
        fragments
      ),

    onSuccess: () => {
      // Actualizar las CSR pendientes
      queryClient.invalidateQueries({
        queryKey: ["pending-csr"],
      });

      // Actualizar certificados
      queryClient.invalidateQueries({
        queryKey: ["certificates"],
      });

      // Actualizar dashboard
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}