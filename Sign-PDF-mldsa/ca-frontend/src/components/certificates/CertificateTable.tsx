import { Certificate } from "../../types/certificate";
import CertificateRow from "./CertificateRow";

interface Props {
  certificates: Certificate[];
  onDetails: (certificate: Certificate) => void;
  onRevoke: (certificate: Certificate) => void;
}

export default function CertificateTable({
  certificates,
  onDetails,
  onRevoke,
}: Props) {
  return (
    <table className="w-full rounded-lg bg-white shadow">

      <thead className="bg-slate-200">

        <tr>

          <th className="p-3 text-left">Usuario</th>
          <th className="p-3 text-left">Email</th>
          <th className="p-3 text-left">Algoritmo</th>
          <th className="p-3 text-left">Serial</th>
          <th className="p-3 text-left">Estado</th>
          <th className="p-3 text-center">Acciones</th>

        </tr>

      </thead>

      <tbody>

        {certificates.map((certificate) => (

          <CertificateRow
            key={certificate.id}
            certificate={certificate}
            onDetails={onDetails}
            onRevoke={onRevoke}
          />

        ))}

      </tbody>

    </table>
  );
}