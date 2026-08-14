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

  return (
    <div className="space-y-8">

      {/* ---------------------------------- */}
      {/* Encabezado */}
      {/* ---------------------------------- */}

      <div>
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <p className="text-gray-500">
          Panel de administración de la
          Autoridad Certificadora.
        </p>
      </div>

      {/* ---------------------------------- */}
      {/* Estadísticas */}
      {/* ---------------------------------- */}

      <div className="grid gap-6 md:grid-cols-3">

        <StatCard
          title="Estado CA"
          value={
            data.ca.initialized
              ? "Inicializada"
              : "No inicializada"
          }
        />

        <StatCard
          title="Certificados emitidos"
          value={data.certificates.issued}
        />

        <StatCard
          title="CSR pendientes"
          value={data.csr.pending}
        />
        
      </div>

      {/* ---------------------------------- */}
      {/* Configuración criptográfica */}
      {/* ---------------------------------- */}

      {data.ca.initialized && (
        <div className="rounded-xl bg-white p-6 shadow">

          <h2 className="text-xl font-bold">
            Configuración criptográfica
          </h2>

          <div className="mt-4 grid gap-6 md:grid-cols-2">

            <div>
              <p className="text-sm text-gray-500">
                Algoritmo de la CA
              </p>

              <p className="mt-1 font-semibold">
                {data.ca.algorithm}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Fragmentos de recuperación
              </p>

              <p className="mt-1 font-semibold">
                {data.fragments.total}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ---------------------------------- */}
      {/* Actividad reciente */}
      {/* ---------------------------------- */}

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
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatDate(item.timestamp)}
                    </p>
                  
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
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