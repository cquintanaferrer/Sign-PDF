import { Certificate } from "../../types/certificate";

interface Props {
  certificate: Certificate;
  onClose: () => void;
}

export default function CertificateDetailsModal({
  certificate,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

      <div className="w-[650px] rounded-xl bg-white p-8">

        <h2 className="mb-6 text-2xl font-bold">
          Detalles del certificado
        </h2>

        <div className="space-y-3">

          <p><strong>Usuario:</strong> {certificate.username}</p>

          <p><strong>Email:</strong> {certificate.email}</p>

          <p><strong>Algoritmo:</strong> {certificate.algorithm}</p>

          <p><strong>Serial:</strong> {certificate.serialNumber}</p>

          <p><strong>Emitido:</strong> {certificate.issuedAt}</p>

          <p><strong>Expira:</strong> {certificate.expiresAt}</p>

          <p><strong>Estado:</strong> {certificate.status}</p>

        </div>

        <div className="mt-8 flex justify-end">

          <button
            onClick={onClose}
            className="rounded bg-slate-700 px-5 py-2 text-white"
          >
            Cerrar
          </button>

        </div>

      </div>

    </div>
  );
}