import { useIssuedCertificates } from "../hooks/useIssuedCertificates";
import { useRevokeCertificate } from "../hooks/useRevokeCertificate";


/**
 * Mantiene en la tabla el mismo formato de Subject que usaba ECDSA:
 *   CN=usuario,O=organizacion,C=MX
 *
 * No modifica el certificado almacenado ni su estructura X.509.
 * Solo oculta visualmente emailAddress si algún certificado ya emitido
 * lo contiene dentro del Subject.
 */
function subjectComoECDSA(subject: string): string {
  return subject
    .split(",")
    .filter((part) => {
      const value = part.trim().toLowerCase();
      return !(
        value.startsWith("1.2.840.113549.1.9.1=") ||
        value.startsWith("emailaddress=")
      );
    })
    .join(",");
}

export default function Certificates() {
  const {
    data,
    isLoading,
    isError,
  } = useIssuedCertificates();

  const revokeCertificate = useRevokeCertificate();

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Cargando certificados...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <p>
          No fue posible cargar los certificados.
        </p>
      </div>
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "es-MX",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function handleRevoke(serialNumber: string) {
    const confirmed = window.confirm(
      `¿Está seguro de revocar el certificado ${serialNumber}?`
    );

    if (!confirmed) {
      return;
    }

    revokeCertificate.mutate(serialNumber);
  }

  return (
    <div className="space-y-8">

      {/* ---------------------------------- */}
      {/* Encabezado */}
      {/* ---------------------------------- */}

      <div>
        <h1 className="text-3xl font-bold">
          Certificados
        </h1>

        <p className="mt-1 text-gray-500">
          Certificados emitidos por la Autoridad
          Certificadora.
        </p>
      </div>

      {/* ---------------------------------- */}
      {/* Lista */}
      {/* ---------------------------------- */}

      {data.length === 0 ? (
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-gray-500">
            No existen certificados emitidos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b bg-gray-50">
                <tr>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Sujeto
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Serial
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Algoritmo
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Emitido
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Expira
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Estado
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold">
                    Acciones
                  </th>

                </tr>
              </thead>

              <tbody>

                {data.map((certificate) => (

                  <tr
                    key={certificate.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >

                    {/* Sujeto */}

                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {subjectComoECDSA(certificate.subject)}
                      </p>
                    </td>

                    {/* Serial */}

                    <td className="px-6 py-4">
                      <span className="font-mono text-xs">
                        {certificate.serial_number}
                      </span>
                    </td>

                    {/* Algoritmo */}

                    <td className="px-6 py-4">
                      {certificate.algorithm}
                    </td>

                    {/* Fecha emisión */}

                    <td className="px-6 py-4">
                      {formatDate(
                        certificate.issued_at
                      )}
                    </td>

                    {/* Fecha expiración */}

                    <td className="px-6 py-4">
                      {formatDate(
                        certificate.expires_at
                      )}
                    </td>

                    {/* Estado */}

                    <td className="px-6 py-4">

                      {certificate.status === "REVOKED" ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          REVOCADO
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          VÁLIDO
                        </span>
                      )}

                    </td>

                    {/* Acciones */}

                    <td className="px-6 py-4">

                      {certificate.status === "ISSUED" ? (

                        <button
                          type="button"
                          onClick={() =>
                            handleRevoke(
                              certificate.serial_number
                            )
                          }
                          disabled={
                            revokeCertificate.isPending
                          }
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {revokeCertificate.isPending
                            ? "Revocando..."
                            : "Revocar"}
                        </button>

                      ) : (

                        <span className="text-sm text-gray-400">
                          No disponible
                        </span>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {/* ---------------------------------- */}
      {/* Error de revocación */}
      {/* ---------------------------------- */}

      {revokeCertificate.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No fue posible revocar el certificado.
        </div>
      )}

    </div>
  );
}