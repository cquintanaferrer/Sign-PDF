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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function handleDownload() {
    if (!password) {
      toast.error(
        "Ingrese la contraseña del custodio."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await downloadCAFragment(
          fragmentId,
          password,
          profile
        );

      downloadFile(
        response.filename,
        response.content
      );

      setDownloaded(true);
      setPassword("");

      toast.success(
        `Fragmento ${fragmentId} descargado correctamente.`
      );

    } catch (error: any) {

      if (
        error?.response?.status === 409
      ) {
        toast.error(
          "Este fragmento ya fue descargado."
        );

        setDownloaded(true);

      } else if (
        error?.response?.status === 401
      ) {
        toast.error(
          "Contraseña incorrecta."
        );

      } else {
        toast.error(
          "No fue posible descargar el fragmento."
        );
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow">

      <h2 className="font-semibold">
        Fragmento {fragmentId}
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Custodio: {owner}
      </p>

      <p className="mt-1 text-xs font-medium text-blue-700">
        {profile === "ML_DSA_65"
          ? "Raíz ML-DSA-65"
          : "Raíz ECDSA P-256"}
      </p>

      <input
        type="password"
        value={password}
        onChange={(event) =>
          setPassword(event.target.value)
        }
        disabled={
          loading || downloaded
        }
        placeholder="Contraseña del custodio"
        className="mt-4 w-full rounded-lg border px-3 py-2"
      />

      <button
        onClick={handleDownload}
        disabled={
          loading ||
          downloaded
        }
        className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloaded
          ? "Descargado"
          : loading
          ? "Descargando..."
          : "Descargar fragmento"}
      </button>

    </div>
  );
}
