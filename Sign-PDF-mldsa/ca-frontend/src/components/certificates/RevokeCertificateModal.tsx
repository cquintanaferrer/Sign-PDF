import toast from "react-hot-toast";

import { Certificate } from "../../types/certificate";
import { useRevokeCertificate } from "../../hooks/useRevokeCertificate";

interface Props {
  certificate: Certificate;
  onClose: () => void;
}

export default function RevokeCertificateModal({
  certificate,
  onClose,
}: Props) {

  const mutation = useRevokeCertificate();

  async function handleRevoke() {

    try {

      await mutation.mutateAsync(certificate.id);

      toast.success("Certificado revocado.");

      onClose();

    } catch {

      toast.error("No fue posible revocar el certificado.");

    }

  }

  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

      <div className="w-[500px] rounded-xl bg-white p-8">

        <h2 className="text-xl font-bold">
          Revocar certificado
        </h2>

        <p className="mt-4">
          ¿Está seguro de revocar el certificado de
          <strong> {certificate.username}</strong>?
        </p>

        <div className="mt-8 flex justify-end gap-4">

          <button
            onClick={onClose}
            className="rounded border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={handleRevoke}
            disabled={mutation.isPending}
            className="rounded bg-red-600 px-4 py-2 text-white"
          >
            Revocar
          </button>

        </div>

      </div>

    </div>

  );

}