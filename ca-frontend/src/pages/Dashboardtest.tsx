import StatCard from "../components/dashboard/StatCard";
import RootCertificateCard from "../components/dashboard/RootCertificateCard";

import { useDashboard } from "../hooks/useDashboard";

export default function Dashboard() {

  const {
    data,
    isLoading,
    isError,
  } = useDashboard();

  if (isLoading) {
    return <p>Cargando Dashboard...</p>;
  }

  if (isError || !data) {
    return <p>No fue posible cargar el Dashboard.</p>;
  }

  return (

    <div className="space-y-8">

      <div>

        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <p className="text-gray-500">
          Panel de administración de la Autoridad Certificadora.
        </p>

      </div>

      <div className="grid gap-6 md:grid-cols-4">

        <StatCard
          title="Estado CA"
          value={data.initialized ? "Inicializada" : "No inicializada"}
        />

        <StatCard
          title="Certificados"
          value={data.certificatesIssued}
        />

        <StatCard
          title="CSR Pendientes"
          value={data.pendingCSR}
        />

        <StatCard
          title="Revocados"
          value={data.revokedCertificates}
        />

      </div>

      <RootCertificateCard
        serialNumber={data.rootCertificate.serialNumber}
        fingerprint={data.rootCertificate.fingerprint}
        algorithm={data.rootCertificate.algorithm}
        issuedAt={data.rootCertificate.issuedAt}
        expiresAt={data.rootCertificate.expiresAt}
      />

    </div>

  );
}