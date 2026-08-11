import { useState } from "react";

import { useCertificates } from "../hooks/useCertificates";

import { Certificate } from "../types/certificate";

import CertificateTable from "../components/certificates/CertificateTable";
import CertificateDetailsModal from "../components/certificates/CertificateDetailsModal";
import RevokeCertificateModal from "../components/certificates/RevokeCertificateModal";

export default function Certificates() {
  const {
    data: certificates = [],
    isLoading,
    isError,
    error,
  } = useCertificates();

  const [selectedCertificate, setSelectedCertificate] =
    useState<Certificate | null>(null);

  const [certificateToRevoke, setCertificateToRevoke] =
    useState<Certificate | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando certificados...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6">

        <h2 className="font-semibold text-red-700">
          Error al cargar los certificados
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
          Certificados Emitidos
        </h1>

        <p className="text-gray-500">
          Administración de certificados emitidos por la CA.
        </p>

      </div>

      {certificates.length === 0 ? (

        <div className="rounded-xl bg-white p-8 shadow text-center">

          <h2 className="text-xl font-semibold">
            No existen certificados emitidos
          </h2>

        </div>

      ) : (

        <CertificateTable
          certificates={certificates}
          onDetails={setSelectedCertificate}
          onRevoke={setCertificateToRevoke}
        />

      )}

      {selectedCertificate && (

        <CertificateDetailsModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />

      )}

      {certificateToRevoke && (

        <RevokeCertificateModal
          certificate={certificateToRevoke}
          onClose={() => setCertificateToRevoke(null)}
        />

      )}

    </div>
  );
}