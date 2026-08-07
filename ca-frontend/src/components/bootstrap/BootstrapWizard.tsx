import { useState } from "react";
import toast from "react-hot-toast";

import { bootstrapCA } from "../../services/ca.service";
import DownloadCard from "./DownloadCard";
import { BootstrapResponse } from "../../types/ca";

export default function BootstrapWizard() {

  const [loading, setLoading] = useState(false);

  const [bootstrap, setBootstrap] =
    useState<BootstrapResponse | null>(null);

  async function handleBootstrap() {

    const confirm = window.confirm(
      "La CA solo puede generarse una vez. ¿Desea continuar?"
    );

    if (!confirm) return;

    try {

      setLoading(true);

      const response = await bootstrapCA();

      setBootstrap(response);

      toast.success("CA generada correctamente");

    } catch {

      toast.error("No fue posible generar la CA");

    } finally {

      setLoading(false);

    }

  }

  if (bootstrap) {

    return (

      <div className="space-y-6">

        <DownloadCard
          filename="ca_root.pem"
          content={bootstrap.rootCertificate}
        />

        <div className="grid grid-cols-2 gap-4">

          {bootstrap.fragments.map(fragment => (

            <DownloadCard
              key={fragment.id}
              filename={`fragment_${fragment.id}.sss`}
              content={fragment.content}
            />

          ))}

        </div>

      </div>

    );

  }

  return (

    <div className="rounded-xl bg-white shadow p-8">

      <h2 className="text-2xl font-bold">

        Inicializar Autoridad Certificadora

      </h2>

      <p className="mt-3 text-gray-500">

        Esta operación generará la llave raíz de la CA y la dividirá
        mediante Shamir Secret Sharing (2 de 4).

      </p>

      <button
        onClick={handleBootstrap}
        disabled={loading}
        className="mt-8 rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700"
      >

        {loading ? "Generando..." : "Generar CA"}

      </button>

    </div>

  );

}