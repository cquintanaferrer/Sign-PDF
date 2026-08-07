import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { bootstrapCA } from "../../services/ca.service";
import { useCAStatus } from "../../hooks/useCAStatus";

import { BootstrapResponse } from "../../types/ca";

import BootstrapTimer from "./BootstrapTimer";
import DownloadCard from "./DownloadCard";
import RootCertificateCard from "../dashboard/RootCertificateCard";

export default function BootstrapWizard() {
  const { data: status, isLoading } = useCAStatus();

  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] =
    useState<BootstrapResponse | null>(null);

  const [timeLeft, setTimeLeft] = useState(60);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!bootstrap) return;

    setTimeLeft(60);
    setExpired(false);

    const interval = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [bootstrap]);

  async function handleBootstrap() {
    const confirmed = window.confirm(
      "La Autoridad Certificadora únicamente puede inicializarse una vez.\n\n¿Desea continuar?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await bootstrapCA();

      setBootstrap(response);

      toast.success("Autoridad Certificadora generada correctamente.");
    } catch {
      toast.error("No fue posible generar la Autoridad Certificadora.");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow">
        Cargando estado de la Autoridad Certificadora...
      </div>
    );
  }

  if (status?.initialized && !bootstrap) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-300 bg-green-50 p-5">

          <h2 className="text-lg font-bold text-green-700">
            Autoridad Certificadora inicializada
          </h2>

          <p className="mt-2 text-gray-700">
            La CA ya fue creada anteriormente.
            La generación de una nueva llave raíz no está permitida.
          </p>

        </div>

        <RootCertificateCard
          serialNumber={status.rootCertificate.serialNumber}
          fingerprint={status.rootCertificate.fingerprint}
          algorithm={status.rootCertificate.algorithm}
          issuedAt={status.rootCertificate.issuedAt}
          expiresAt={status.rootCertificate.expiresAt}
        />
      </div>
    );
  }

  if (bootstrap) {
    return (
      <div className="space-y-6">

        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-5">

          <h2 className="text-lg font-bold text-yellow-700">
            ⚠ Ceremonia de generación completada
          </h2>

          <p className="mt-2">
            Descargue inmediatamente el certificado raíz y los cuatro
            fragmentos de Shamir.
          </p>

          <p className="mt-2">
            Cada archivo únicamente puede descargarse una vez.
          </p>

        </div>

        {!expired ? (
          <>
            <BootstrapTimer timeLeft={timeLeft} />

            <RootCertificateCard
              serialNumber={bootstrap.rootCertificate.serialNumber}
              fingerprint={bootstrap.rootCertificate.fingerprint}
              algorithm={bootstrap.rootCertificate.algorithm}
              issuedAt={bootstrap.rootCertificate.issuedAt}
              expiresAt={bootstrap.rootCertificate.expiresAt}
            />

            <DownloadCard
              filename="ca_root.pem"
              content={bootstrap.rootCertificate.certificate}
              disabled={false}
            />

            <div className="grid gap-4 md:grid-cols-2">

              {bootstrap.fragments.map((fragment) => (
                <DownloadCard
                  key={fragment.id}
                  filename={`fragment_${fragment.id}.sss`}
                  content={fragment.content}
                  disabled={false}
                />
              ))}

            </div>
          </>
        ) : (
          <div className="rounded-lg border border-red-300 bg-red-50 p-6">

            <h2 className="text-xl font-bold text-red-700">
              Ceremonia finalizada
            </h2>

            <p className="mt-3 text-gray-700">
              El tiempo disponible para descargar el certificado y los
              fragmentos ha expirado.
            </p>

            <p className="mt-2 text-gray-700">
              Si alguno de los fragmentos no fue almacenado, deberá
              repetirse la ceremonia únicamente si el backend lo permite.
            </p>

          </div>
        )}

      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow">

      <h2 className="text-2xl font-bold">
        Inicializar Autoridad Certificadora
      </h2>

      <p className="mt-4 text-gray-600">
        Esta operación generará la llave privada de la CA, emitirá el
        certificado raíz y dividirá el secreto utilizando
        Shamir Secret Sharing (2 de 4).
      </p>

      <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-5">

        <h3 className="font-semibold text-red-700">
          Advertencia
        </h3>

        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-700">
          <li>La CA solo puede inicializarse una vez.</li>
          <li>Los cuatro fragmentos solo pueden descargarse una vez.</li>
          <li>El certificado raíz solo puede descargarse una vez.</li>
          <li>Los archivos estarán disponibles durante 60 segundos.</li>
          <li>Guarde los fragmentos en un lugar seguro.</li>
        </ul>

      </div>

      <button
        onClick={handleBootstrap}
        disabled={loading || status?.initialized}
        className="mt-8 rounded-lg bg-red-600 px-6 py-3 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Generando..." : "Generar CA"}
      </button>

    </div>
  );
}