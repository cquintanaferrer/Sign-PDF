import { Certificate } from "../../types/certificate";

interface Props {
  certificate: Certificate;
  onDetails: (certificate: Certificate) => void;
  onRevoke: (certificate: Certificate) => void;
}

export default function CertificateRow({
  certificate,
  onDetails,
  onRevoke,
}: Props) {
  return (
    <tr className="border-b">

      <td>{certificate.username}</td>

      <td>{certificate.email}</td>

      <td>{certificate.algorithm}</td>

      <td>{certificate.serialNumber}</td>

      <td>{certificate.status}</td>

      <td className="space-x-2">

        <button
          onClick={() => onDetails(certificate)}
          className="text-blue-600"
        >
          Ver
        </button>

        <button
          onClick={() => onRevoke(certificate)}
          className="text-red-600"
        >
          Revocar
        </button>

      </td>

    </tr>
  );
}