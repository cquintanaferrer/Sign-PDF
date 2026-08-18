import { useState } from "react";
import toast from "react-hot-toast";
import {
  bootstrapCA,
  type BootstrapResponse,
  type CAProfile,
} from "../../services/ca.service";

import { useCAStatus } from "../../hooks/useCAStatus";

import RotateCAModal from "./RotateCAModal";
import RootCertificateCard from "../dashboard/RootCertificateCard";
import DownloadCard from "./DownloadCard";

interface Props {
  profile: CAProfile;
}

function profileName(profile: CAProfile) {
  return profile === "ML_DSA_65"
    ? "ML-DSA-65"
    : "ECDSA P-256";
}

export default function BootstrapWizard({ profile }: Props) {
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useCAStatus(profile);

  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] =
    useState<BootstrapResponse | null>(null);
  const [showRotateModal, setShowRotateModal] =
    useState(false);
  const [rotationResult, setRotationResult] =
    useState<any>(null);

  const label = profileName(profile);
  const isEcdsa = profile === "ECDSA_P256";

  async function handleBootstrap() {
    const confirmed = window.confirm(
      `Se generará una raíz independiente ${label}.\n\n` +
        "También se crearán 4 fragmentos SLIP-0039 (umbral 3 de 4).\n\n" +
        "¿Desea continuar?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const response = await bootstrapCA(profile);

      setBootstrap(response);

      toast.success(
        `Autoridad Certificadora ${label} generada correctamente.`
      );

      await refetch();

    } catch (error: any) {

      if (error?.response?.status === 409) {
        toast.error(
          `La raíz ${label} ya fue inicializada.`
        );

        await refetch();

      } else {
        const detail = error?.response?.data?.detail;
        toast.error(
          detail ||
            `No fue posible generar la raíz ${label}.`
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
          Consultando estado de la raíz {label}...
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
          onClick={() => void refetch()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (bootstrap) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-300 bg-green-50 p-5">
          <h2 className="text-lg font-bold text-green-700">
            Raíz {label} generada correctamente
          </h2>

          <p className="mt-2 text-gray-700">
            Descargue los cuatro fragmentos de esta raíz y
            almacénelos de forma segura. Los fragmentos ECDSA y
            ML-DSA son independientes y no deben mezclarse.
          </p>
        </div>

        <RootCertificateCard
          profile={profile}
          serialNumber={bootstrap.rootCertificate.serialNumber}
          fingerprint={bootstrap.rootCertificate.fingerprint}
          algorithm={bootstrap.rootCertificate.algorithm}
          issuedAt={bootstrap.rootCertificate.issuedAt}
          expiresAt={bootstrap.rootCertificate.expiresAt}
        />

        <div>
          <h2 className="mb-4 text-xl font-bold">
            Fragmentos de recuperación — {label}
          </h2>

          <p className="mb-6 text-gray-600">
            Se generaron cuatro fragmentos SLIP-0039. Se requieren
            al menos tres para reconstruir temporalmente la clave
            privada de esta raíz.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {bootstrap.fragments.map((fragment) => (
              <DownloadCard
                key={fragment.id}
                fragmentId={fragment.id}
                owner={fragment.owner}
                profile={profile}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    status?.initialized &&
    status.rootCertificate
  ) {
    return (
      <>
        <div className="space-y-6">
          <div className="rounded-lg border border-green-300 bg-green-50 p-5">
            <h2 className="text-lg font-bold text-green-700">
              Raíz {label} inicializada
            </h2>

            <p className="mt-2 text-gray-700">
              Esta raíz está activa y puede emitir certificados
              para CSR del mismo algoritmo.
            </p>
          </div>

          <RootCertificateCard
            profile={profile}
            serialNumber={status.rootCertificate.serialNumber}
            fingerprint={status.rootCertificate.fingerprint}
            algorithm={status.rootCertificate.algorithm}
            issuedAt={status.rootCertificate.issuedAt}
            expiresAt={status.rootCertificate.expiresAt}
          />

          {isEcdsa ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-6">
              <h2 className="text-lg font-bold text-red-700">
                Reiniciar raíz ECDSA
              </h2>

              <p className="mt-2 text-sm text-red-700">
                La rotación existente del proyecto continúa
                disponible únicamente para ECDSA P-256.
              </p>

              <button
                type="button"
                onClick={() => setShowRotateModal(true)}
                className="mt-4 rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700"
              >
                Reiniciar CA ECDSA
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
              <h2 className="text-lg font-bold text-yellow-800">
                Rotación ML-DSA no incluida en esta etapa
              </h2>

              <p className="mt-2 text-sm text-yellow-800">
                Para esta prueba se implementan bootstrap, consulta,
                descarga de fragmentos y emisión/verificación de
                certificados ML-DSA-65. La rotación se mantiene
                deshabilitada para no mezclarla con el cross-signing
                ECDSA existente.
              </p>
            </div>
          )}

          {rotationResult && (
            <div className="space-y-6">
              <div className="rounded-xl border border-green-300 bg-green-50 p-6">
                <h2 className="text-lg font-bold text-green-700">
                  Rotación ECDSA completada correctamente
                </h2>

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

              <div className="grid gap-4 md:grid-cols-2">
                {rotationResult.fragments.map(
                  (fragment: { id: number; owner: string }) => (
                    <DownloadCard
                      key={fragment.id}
                      fragmentId={fragment.id}
                      owner={fragment.owner}
                      profile="ECDSA_P256"
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {showRotateModal && (
          <RotateCAModal
            onClose={() => setShowRotateModal(false)}
            onSuccess={(response) => {
              setRotationResult(response);
              setShowRotateModal(false);
              void refetch();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow">
      <h2 className="text-2xl font-bold">
        Inicializar raíz {label}
      </h2>

      <p className="mt-4 text-gray-600">
        {isEcdsa
          ? "Se generará una clave ECDSA P-256, su certificado raíz X.509 y cuatro fragmentos SLIP-0039."
          : "Se generará una clave ML-DSA-65, su certificado raíz X.509 poscuántico y cuatro fragmentos SLIP-0039."}
      </p>

      <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4">
        <h3 className="font-semibold text-red-700">
          Advertencia
        </h3>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
          <li>
            Cada perfil criptográfico tiene su propia raíz.
          </li>
          <li>
            Esta raíz solo puede inicializarse una vez mientras
            permanezca activa.
          </li>
          <li>
            Se generarán cuatro fragmentos independientes.
          </li>
          <li>
            Se requieren al menos tres fragmentos para reconstruir
            la clave de esta raíz.
          </li>
          <li>
            No mezcle fragmentos ECDSA con fragmentos ML-DSA.
          </li>
        </ul>
      </div>

      <button
        onClick={() => void handleBootstrap()}
        disabled={loading}
        className="mt-8 rounded-lg bg-red-600 px-6 py-3 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generando..."
          : `Generar raíz ${label}`}
      </button>
    </div>
  );
}
