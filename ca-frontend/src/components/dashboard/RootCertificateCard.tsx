import { useState } from "react";
import toast from "react-hot-toast";

import {
  getCACertificate,
  getCAPublicKey,
  type CAProfile,
} from "../../services/ca.service";

import { downloadFile } from "../../utils/download";

interface Props {
  profile: CAProfile;
  serialNumber: string;
  fingerprint: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
}

export default function RootCertificateCard({
  profile,
  serialNumber,
  fingerprint,
  algorithm,
  issuedAt,
  expiresAt,
}: Props) {
  const [loadingCertificate, setLoadingCertificate] =
    useState(false);

  const [loadingPublicKey, setLoadingPublicKey] =
    useState(false);

  const filePrefix =
    profile === "ML_DSA_65"
      ? "ca_mldsa65"
      : "ca_ecdsa_p256";

  async function handleDownloadCertificate() {
    try {
      setLoadingCertificate(true);

      const data = await getCACertificate(profile);

      downloadFile(
        `${filePrefix}_root.pem`,
        data.certificate
      );

      toast.success(
        "Certificado raíz descargado correctamente."
      );
    } catch {
      toast.error(
        "No fue posible descargar el certificado raíz."
      );
    } finally {
      setLoadingCertificate(false);
    }
  }

  async function handleDownloadPublicKey() {
    try {
      setLoadingPublicKey(true);

      const data = await getCAPublicKey(profile);

      downloadFile(
        `${filePrefix}_public_key.pem`,
        data.publicKey
      );

      toast.success(
        "Clave pública descargada correctamente."
      );
    } catch {
      toast.error(
        "No fue posible descargar la clave pública."
      );
    } finally {
      setLoadingPublicKey(false);
    }
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

  return (
    <div className="rounded-xl bg-white p-6 shadow">

      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          Autoridad Certificadora
        </h2>

        <p className="mt-1 text-gray-500">
          {profile === "ML_DSA_65"
            ? "Raíz poscuántica ML-DSA-65"
            : "Raíz ECDSA P-256"}
        </p>
      </div>

      <div className="space-y-4">

        <div>
          <p className="text-sm font-medium text-gray-500">
            Algoritmo
          </p>

          <p className="mt-1 font-semibold">
            {algorithm}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">
            Número de serie
          </p>

          <p className="mt-1 break-all font-mono text-sm">
            {serialNumber}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">
            Fingerprint SHA-256
          </p>

          <p className="mt-1 break-all font-mono text-sm">
            {fingerprint}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <div>
            <p className="text-sm font-medium text-gray-500">
              Emitido
            </p>

            <p className="mt-1 font-semibold">
              {formatDate(issuedAt)}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">
              Expira
            </p>

            <p className="mt-1 font-semibold">
              {formatDate(expiresAt)}
            </p>
          </div>

        </div>

      </div>

      <div className="mt-8 border-t pt-6">

        <h3 className="mb-4 font-semibold">
          Archivos públicos de esta raíz
        </h3>

        <div className="grid gap-3 md:grid-cols-2">

          <button
            onClick={handleDownloadCertificate}
            disabled={loadingCertificate}
            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingCertificate
              ? "Descargando..."
              : "Descargar certificado raíz"}
          </button>

          <button
            onClick={handleDownloadPublicKey}
            disabled={loadingPublicKey}
            className="rounded-lg border border-blue-600 px-4 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingPublicKey
              ? "Descargando..."
              : "Descargar clave pública"}
          </button>

        </div>

      </div>

    </div>
  );
}
