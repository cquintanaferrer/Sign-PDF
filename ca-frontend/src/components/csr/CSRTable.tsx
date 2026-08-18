import { CSR } from "../../types/csr";
import CSRRow from "./CSRRow";

interface Props {
  data: CSR[];
  onIssue: (csr: CSR) => void;
}

export default function CSRTable({
  data,
  onIssue,
}: Props) {
  return (
    <table className="w-full bg-white rounded shadow">
      <thead>
        <tr className="bg-slate-200">
          <th className="p-3 text-left">Usuario</th>
          <th className="p-3 text-left">Email</th>
          <th className="p-3 text-left">Algoritmo</th>
          <th className="p-3 text-left">Fecha</th>
          <th className="p-3 text-left">Estado</th>
          <th className="p-3 text-left">Acción</th>
        </tr>
      </thead>

      <tbody>
        {data.map((csr) => (
          <CSRRow
            key={csr.id}
            csr={csr}
            onIssue={onIssue}
          />
        ))}
      </tbody>
    </table>
  );
}
