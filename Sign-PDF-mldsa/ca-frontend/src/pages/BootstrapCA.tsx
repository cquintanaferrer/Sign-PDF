import { useState } from "react";

import BootstrapWizard from "../components/bootstrap/BootstrapWizard";
import {
  CA_PROFILES,
  type CAProfile,
} from "../services/ca.service";

export default function BootstrapCA() {
  const [profile, setProfile] = useState<CAProfile>(
    "ECDSA_P256"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Autoridades Certificadoras
        </h1>

        <p className="text-gray-600">
          El mismo servicio administra dos raíces independientes.
          Seleccione cuál desea consultar o inicializar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CA_PROFILES.map((item) => {
          const selected = profile === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setProfile(item.value)}
              className={`rounded-xl border p-5 text-left transition ${
                selected
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <p className="font-bold">{item.label}</p>
              <p className="mt-1 text-sm text-gray-600">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <BootstrapWizard
        key={profile}
        profile={profile}
      />
    </div>
  );
}
