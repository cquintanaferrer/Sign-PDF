import StatCard from "../components/dashboard/StatCard";

import { useDashboard } from "../hooks/useDashboard";

export default function Dashboard() {
  const {
    data,
    isLoading,
    isError,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Cargando Dashboard...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <p>
          No fue posible cargar el Dashboard.
        </p>
      </div>
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "es-MX",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  }

  function profileLabel(profile: string) {
    return profile === "ML_DSA_65"
      ? "ML-DSA-65"
      : "ECDSA P-256";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <p className="text-gray-500">
          Panel de administración de las raíces ECDSA y ML-DSA.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {data.cas.map((ca) => (
          <StatCard
            key={ca.profile}
            title={`CA ${profileLabel(ca.profile)}`}
            value={
              ca.initialized
                ? "Inicializada"
                : "No inicializada"
            }
          />
        ))}

        <StatCard
          title="Certificados emitidos"
          value={data.certificates.issued}
        />

        <StatCard
          title="CSR pendientes"
          value={data.csr.pending}
        />
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">
          Raíces criptográficas
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Cada algoritmo utiliza una clave raíz y fragmentos
          SLIP-0039 independientes.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {data.cas.map((ca) => (
            <div
              key={ca.profile}
              className="rounded-lg border p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-bold">
                  {profileLabel(ca.profile)}
                </h3>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    ca.initialized
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ca.initialized ? "ACTIVA" : "SIN INICIALIZAR"}
                </span>
              </div>

              {ca.initialized ? (
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <strong>Algoritmo:</strong>{" "}
                    {ca.algorithm}
                  </p>
                  <p>
                    <strong>Generación:</strong>{" "}
                    {ca.generation}
                  </p>
                  <p>
                    <strong>Fragmentos aún disponibles:</strong>{" "}
                    {ca.fragments}
                  </p>
                  <p className="break-all font-mono text-xs text-gray-600">
                    {ca.fingerprint}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Inicialice esta raíz desde la sección
                  Autoridades Certificadoras.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            Actividad reciente
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Últimas operaciones registradas por la CA.
          </p>
        </div>

        {data.activity.length === 0 ? (
          <p className="text-gray-500">
            No hay actividad registrada.
          </p>
        ) : (
          <div className="space-y-4">
            {data.activity
              .filter(
                (item) =>
                  !(
                    item.type === "CSR" &&
                    item.status === "ISSUED"
                  )
              )
              .map((item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {item.action === "CSR emitida"
                        ? "CSR recibida"
                        : item.action}
                    </p>

                    {item.algorithm && (
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        {item.algorithm}
                      </p>
                    )}

                    {item.type === "CSR" && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.requester}
                      </p>
                    )}

                    {item.type === "CERTIFICATE" && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.subject}
                      </p>
                    )}

                    {item.type === "CA_ROTATION" && (
                      <div className="mt-1 text-sm text-gray-500">
                        <p>
                          Generación {item.generation}
                        </p>

                        {item.fingerprint && (
                          <p className="font-mono text-xs">
                            {item.fingerprint}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatDate(item.timestamp)}
                    </p>

                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === "REVOKED"
                          ? "bg-red-100 text-red-700"
                          : item.status === "ROTATED"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
