import { CSR } from "../../types/csr";

interface Props {
  csr: CSR;
  onIssue: (csr: CSR) => void;
}

export default function CSRRow({
  csr,
  onIssue,
}: Props) {
  return (
    <tr className="border-b">

      <td className="p-3">
        {csr.username}
      </td>

      <td>
        {csr.algorithm}
      </td>

      <td>
        {new Date(
          csr.created_at
        ).toLocaleString("es-MX")}
      </td>

      <td>
        {csr.status}
      </td>

      <td>

        <button
          onClick={() => onIssue(csr)}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Emitir
        </button>

      </td>

    </tr>
  );
}