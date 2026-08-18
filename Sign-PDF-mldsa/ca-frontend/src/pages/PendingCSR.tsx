import { useState } from "react";

import { useCSR } from "../hooks/useCSR";
import { CSR } from "../types/csr";

import CSRTable from "../components/csr/CSRTable";
import IssueCertificateModal from "../components/csr/IssueCertificateModal";

export default function PendingCSR() {
  const {
    data: csrList = [],
    isLoading,
    isError,
    error,
  } = useCSR();

  const [selectedCSR, setSelectedCSR] = useState<CSR | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando solicitudes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <h2 className="font-semibold text-red-700">
          Error al cargar los CSR
        </h2>

        <p className="mt-2 text-red-600">
          {error instanceof Error
            ? error.message
            : "Ha ocurrido un error inesperado."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Solicitudes de Certificado
        </h1>

        <p className="text-gray-500">
          Administre las solicitudes de certificados pendientes.
        </p>
      </div>

      {csrList.length === 0 ? (
        <div className="rounded-xl bg-white shadow p-8 text-center">
          <h2 className="text-xl font-semibold">
            No existen CSR pendientes
          </h2>

          <p className="mt-2 text-gray-500">
            Todas las solicitudes han sido procesadas.
          </p>
        </div>
      ) : (
        <CSRTable
          data={csrList}
          onIssue={setSelectedCSR}
        />
      )}

      {selectedCSR && (
        <IssueCertificateModal
          csr={selectedCSR}
          onClose={() => setSelectedCSR(null)}
        />
      )}

    </div>
  );
}