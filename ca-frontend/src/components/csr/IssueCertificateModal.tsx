import { useState } from "react";
import { CSR } from "../../types/csr";
import FragmentUploader from "./FragmentUploader";
import { useIssueCertificate } from "../../hooks/useIssueCertificate";
import toast from "react-hot-toast";

interface Props {
  csr: CSR;
  onClose: () => void;
}

export default function IssueCertificateModal({
  csr,
  onClose,
}: Props) {

  const [fragment1, setFragment1] = useState<File | null>(null);
  const [fragment2, setFragment2] = useState<File | null>(null);
  const mutation = useIssueCertificate();

  async function handleIssue() {
  if (!fragment1 || !fragment2) {
    toast.error("Debe seleccionar dos fragmentos.");
    return;
  }

  try {
    await mutation.mutateAsync({
      csrId: csr.id,
      fragment1,
      fragment2,
    });

    toast.success("Certificado emitido correctamente.");

    onClose();
  } catch {
    toast.error("No fue posible emitir el certificado.");
  }
}

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

      <div className="bg-white rounded-xl p-8 w-[500px]">

        <h2 className="text-xl font-bold mb-6">
          Emitir certificado
        </h2>

        <FragmentUploader
          label="Fragmento 1"
          onChange={setFragment1}
        />

        <div className="mt-4" />

        <FragmentUploader
          label="Fragmento 2"
          onChange={setFragment2}
        />

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleIssue}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
            {mutation.isPending ? "Emitiendo..." : "Emitir"}
        </button>

        </div>

      </div>

    </div>
  );
}