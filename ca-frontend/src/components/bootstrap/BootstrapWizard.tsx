import { useState } from "react";
import toast from "react-hot-toast";
import {
  bootstrapCA,
  BootstrapResponse,
} from "../../services/ca.service";

import { useCAStatus } from "../../hooks/useCAStatus";

import RotateCAModal from "./RotateCAModal";
import RootCertificateCard from "../dashboard/RootCertificateCard";
import DownloadCard from "./DownloadCard";

export default function BootstrapWizard() {
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useCAStatus();

  const [loading, setLoading] = useState(false);

  const [bootstrap, setBootstrap] =
    useState<BootstrapResponse | null>(null);
  const [showRotateModal, setShowRotateModal] =
    useState(false);

  const [rotationResult, setRotationResult] =
    useState<any>(null);

  async function handleBootstrap() {
    const confirmed = window.confirm(
      "La Autoridad Certificadora solo puede generarse una vez.\n\n¿Desea continuar?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const response = await bootstrapCA();

      setBootstrap(response);

      toast.success(
        "Autoridad Certificadora generada correctamente."
      );

    } catch (error: any) {

      if (error?.response?.status === 409) {
        toast.error(
          "La Autoridad Certificadora ya fue inicializada."
        );

        await refetch();

      } else {
        toast.error(
          "No fue posible generar la Autoridad Certificadora."
        );
      }

    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow">
        <p className="text-gray-600">
          Consultando estado de la Autoridad Certificadora...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6">
        <h2 className="font-bold text-red-700">
          No fue posible consultar la CA
        </h2>

        <p className="mt-2 text-sm text-red-600">
          Verifique que FastAPI esté ejecutándose y que el
          administrador esté autenticado.
        </p>

        <button
          onClick={refetch}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  /*
   * Después de generar la CA mostramos inmediatamente
   * el certificado y los cuatro fragmentos.
   */
  if (bootstrap) {
  return (
    <div className="space-y-6">

      <div className="rounded-lg border border-green-300 bg-green-50 p-5">
        <h2 className="text-lg font-bold text-green-700">
          Autoridad Certificadora generada correctamente
        </h2>

        <p className="mt-2 text-gray-700">
          La ceremonia de generación ha finalizado.
          Descargue y almacene los fragmentos de forma segura.
        </p>
      </div>

      <RootCertificateCard
        serialNumber={
          bootstrap.rootCertificate.serialNumber
        }
        fingerprint={
          bootstrap.rootCertificate.fingerprint
        }
        algorithm={
          bootstrap.rootCertificate.algorithm
        }
        issuedAt={
          bootstrap.rootCertificate.issuedAt
        }
        expiresAt={
          bootstrap.rootCertificate.expiresAt
        }
      />

      <div>
        <h2 className="mb-4 text-xl font-bold">
          Fragmentos de recuperación
        </h2>

        <p className="mb-6 text-gray-600">
          Se generaron cuatro fragmentos SLIP-0039.
          Se requieren al menos tres para reconstruir
          la clave privada de la CA.
        </p>

        <div className="grid gap-4 md:grid-cols-2">

          {bootstrap.fragments.map(
            (fragment) => (
              <DownloadCard
                key={fragment.id}
                fragmentId={fragment.id}
                owner={fragment.owner}
              />
            )
          )}

        </div>
      </div>

    </div>
  );
}

  /*
   * La CA ya estaba inicializada antes de entrar
   * a esta página.
   */
 if (
  status?.initialized &&
  status.rootCertificate
) {
  return (
    <>
      <div className="space-y-6">

        <div className="rounded-lg border border-green-300 bg-green-50 p-5">
          <h2 className="text-lg font-bold text-green-700">
            Autoridad Certificadora inicializada
          </h2>

          <p className="mt-2 text-gray-700">
            La CA está actualmente activa.
          </p>
        </div>

        <RootCertificateCard
          serialNumber={
            status.rootCertificate.serialNumber
          }
          fingerprint={
            status.rootCertificate.fingerprint
          }
          algorithm={
            status.rootCertificate.algorithm
          }
          issuedAt={
            status.rootCertificate.issuedAt
          }
          expiresAt={
            status.rootCertificate.expiresAt
          }
        />

        <div className="rounded-xl border border-red-300 bg-red-50 p-6">
          <h2 className="text-lg font-bold text-red-700">
            Reiniciar Autoridad Certificadora
          </h2>

          <p className="mt-2 text-sm text-red-700">
            Esta operación generará una nueva CA,
            realizará un certificado cruzado con la
            CA actual y dejará la CA actual inactiva.
          </p>

          <button
            type="button"
            onClick={() =>
              setShowRotateModal(true)
            }
            className="mt-4 rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700"
          >
            Reiniciar CA
          </button>
        </div>

        {rotationResult && (
  <div className="space-y-6">

    <div className="rounded-xl border border-green-300 bg-green-50 p-6">
      <h2 className="text-lg font-bold text-green-700">
        Rotación completada correctamente
      </h2>

      <p className="mt-2 text-sm text-gray-700">
        La nueva Autoridad Certificadora fue generada
        correctamente y la CA anterior fue desactivada.
      </p>

      <div className="mt-4 space-y-1 text-sm">
        <p>
          <strong>Generación:</strong>{" "}
          {rotationResult.newCA.generation}
        </p>

        <p>
          <strong>Serial:</strong>{" "}
          {rotationResult.newCA.serialNumber}
        </p>

        <p>
          <strong>Fingerprint:</strong>{" "}
          {rotationResult.newCA.fingerprint}
        </p>

        <p>
          <strong>Algoritmo:</strong>{" "}
          {rotationResult.newCA.algorithm}
          </p>
          </div>
            </div>

            <div className="rounded-xl border border-blue-300 bg-blue-50 p-6">
              <h2 className="text-lg font-bold text-blue-700">
                Nuevos fragmentos de recuperación
              </h2>

              <p className="mt-2 text-sm text-gray-700">
                La nueva CA tiene una nueva clave privada.
                Se generaron cuatro nuevos fragmentos SLIP-0039.
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-700">
                Se requieren al menos 3 de 4 fragmentos para
                reconstruir la nueva clave.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {rotationResult.fragments.map(
                (fragment: {
                  id: number;
                  owner: string;
                }) => (
                  <DownloadCard
                    key={fragment.id}
                    fragmentId={fragment.id}
                    owner={fragment.owner}
                  />
                )
              )}
    </div>

    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
      <p className="text-sm text-yellow-800">
        Cada custodio debe descargar su fragmento y
        almacenarlo de forma segura. Una vez descargado,
        el fragmento deja de estar disponible para descarga
        desde la Autoridad Certificadora.
      </p>
    </div>

  </div>
)}

      </div>

      {showRotateModal && (
        <RotateCAModal
          onClose={() =>
            setShowRotateModal(false)
          }
          onSuccess={(response) => {
            setRotationResult(response);
            setShowRotateModal(false);
            refetch();
          }}
        />
      )}
    </>
  );
}

  return (
    <div className="rounded-xl bg-white p-8 shadow">

      <h2 className="text-2xl font-bold">
        Inicializar Autoridad Certificadora
      </h2>

      <p className="mt-4 text-gray-600">
        Esta operación generará la llave privada P-256
        de la CA, emitirá el certificado raíz y dividirá
        el secreto mediante SLIP-0039.
      </p>

      <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4">

        <h3 className="font-semibold text-red-700">
          Advertencia
        </h3>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
          <li>
            La CA solo puede inicializarse una vez.
          </li>

          <li>
            Se generarán cuatro fragmentos.
          </li>

          <li>
            Cada fragmento está cifrado individualmente.
          </li>

          <li>
            Cada fragmento corresponde a un custodio.
          </li>

          <li>
            Se necesitan al menos tres fragmentos para
            reconstruir la clave.
          </li>
        </ul>

      </div>

      <button
        onClick={handleBootstrap}
        disabled={loading}
        className="mt-8 rounded-lg bg-red-600 px-6 py-3 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generando..."
          : "Generar CA"}
      </button>

    </div>
  );
}