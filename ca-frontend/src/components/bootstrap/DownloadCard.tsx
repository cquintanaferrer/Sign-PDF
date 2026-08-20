import { useState } from "react";
import toast from "react-hot-toast";

import { downloadFile } from "../../utils/download";
import {
  downloadCAFragment,
  type CAProfile,
} from "../../services/ca.service";

interface Props {
  fragmentId: number;
  owner: string;
  profile: CAProfile;
}

export default function DownloadCard({
  fragmentId,
  owner,
  profile,
}: Props) {
  const [custodianPassword, setCustodianPassword] = useState("");
  const [fragmentPassword, setFragmentPassword] = useState("");
  const [confirmFragmentPassword, setConfirmFragmentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function handleDownload() {
    if (!custodianPassword) {
      toast.error("Ingrese la contraseña del custodio.");
      return;
    }

    if (fragmentPassword.length < 8) {
      toast.error(
        "La nueva contraseña del fragmento debe tener al menos 8 caracteres."
      );
      return;
    }

    if (fragmentPassword !== confirmFragmentPassword) {
      toast.error("Las contraseñas del fragmento no coinciden.");
      return;
    }

    try {
      setLoading(true);

      const response = await downloadCAFragment(
        fragmentId,
        custodianPassword,
        fragmentPassword,
        profile
      );

      downloadFile(response.filename, response.content);

      setDownloaded(true);
      setCustodianPassword("");
      setFragmentPassword("");
      setConfirmFragmentPassword("");

      toast.success(
        `Fragmento ${fragmentId} cifrado con la contraseña elegida y descargado correctamente.`
      );
    } catch (error: any) {
      if (error?.response?.status === 409) {
        const detail = error?.response?.data?.detail;
        toast.error(
          detail || "Este fragmento ya fue descargado o no pudo recuperarse."
        );
        if (!detail) {
          setDownloaded(true);
        }
      } else if (error?.response?.status === 401) {
        toast.error("Contraseña del custodio incorrecta.");
      } else if (error?.response?.status === 422) {
        toast.error(
          "La contraseña del fragmento debe tener al menos 8 caracteres."
        );
      } else {
        toast.error("No fue posible descargar el fragmento.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <h2 className="font-semibold">Fragmento {fragmentId}</h2>

      <p className="mt-1 text-sm text-gray-500">Custodio: {owner}</p>

      <p className="mt-1 text-xs font-medium text-blue-700">
        {profile === "ML_DSA_65"
          ? "Raíz ML-DSA-65"
          : "Raíz ECDSA P-256"}
      </p>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        La contraseña del custodio autoriza la descarga. La contraseña del
        fragmento se elige ahora y será la que se necesite posteriormente
        para usar este archivo <strong>.sss</strong>.
      </div>

      <label className="mt-4 block text-sm font-medium text-gray-700">
        Contraseña del custodio
      </label>
      <input
        type="password"
        value={custodianPassword}
        onChange={(event) => setCustodianPassword(event.target.value)}
        disabled={loading || downloaded}
        placeholder="Contraseña de acceso del custodio"
        autoComplete="current-password"
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />

      <label className="mt-4 block text-sm font-medium text-gray-700">
        Nueva contraseña del fragmento
      </label>
      <input
        type="password"
        value={fragmentPassword}
        onChange={(event) => setFragmentPassword(event.target.value)}
        disabled={loading || downloaded}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />

      <label className="mt-3 block text-sm font-medium text-gray-700">
        Confirmar contraseña del fragmento
      </label>
      <input
        type="password"
        value={confirmFragmentPassword}
        onChange={(event) => setConfirmFragmentPassword(event.target.value)}
        disabled={loading || downloaded}
        placeholder="Repita la contraseña del fragmento"
        autoComplete="new-password"
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />

      <button
        onClick={handleDownload}
        disabled={loading || downloaded}
        className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloaded
          ? "Descargado"
          : loading
          ? "Protegiendo y descargando..."
          : "Definir contraseña y descargar"}
      </button>
    </div>
  );
}
