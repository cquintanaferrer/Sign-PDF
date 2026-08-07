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

          <th>Usuario</th>

          <th>Email</th>

          <th>Algoritmo</th>

          <th>Fecha</th>

          <th></th>

        </tr>

      </thead>

      <tbody>

        {data.map(csr => (

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