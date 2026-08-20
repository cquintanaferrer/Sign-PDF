import api from "../api/axios";

export type CAProfile = "ECDSA_P256" | "ML_DSA_65";

export const CA_PROFILES: Array<{
  value: CAProfile;
  label: string;
  description: string;
}> = [
  {
    value: "ECDSA_P256",
    label: "ECDSA P-256",
    description: "Raíz clásica ECDSA P-256 / SHA-256",
  },
  {
    value: "ML_DSA_65",
    label: "ML-DSA-65",
    description: "Raíz poscuántica ML-DSA-65",
  },
];

/* =========================================================
   CA STATUS
========================================================= */

export interface CAStatus {
  initialized: boolean;
  profile: CAProfile;

  rootCertificate: {
    serialNumber: string;
    fingerprint: string;
    algorithm: string;
    issuedAt: string;
    expiresAt: string;
  } | null;
}

/* =========================================================
   BOOTSTRAP
========================================================= */

export interface BootstrapFragment {
  id: number;
  owner: string;
  algorithm?: CAProfile;
}

export interface BootstrapResponse {
  message: string;
  profile: CAProfile;

  rootCertificate: {
    certificate: string;
    serialNumber: string;
    fingerprint: string;
    algorithm: string;
    issuedAt: string;
    expiresAt: string;
  };

  fragments: BootstrapFragment[];
}

/* =========================================================
   FRAGMENT DOWNLOAD
========================================================= */

export interface FragmentDownloadResponse {
  profile: CAProfile;
  fragmentId: number;
  filename: string;
  content: string;
}

/* =========================================================
   PUBLIC CA INFORMATION
========================================================= */

export interface CACertificateResponse {
  profile: CAProfile;
  certificate: string;
  serialNumber: string;
  fingerprint: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
}

export interface CAPublicKeyResponse {
  profile: CAProfile;
  publicKey: string;
  algorithm: string;
}

/* =========================================================
   GET CA STATUS
========================================================= */

export async function getCAStatus(
  profile: CAProfile = "ECDSA_P256"
): Promise<CAStatus> {
  const response = await api.get<CAStatus>(
    "/ca/status",
    { params: { algorithm: profile } }
  );

  return response.data;
}

/* =========================================================
   BOOTSTRAP CA
========================================================= */

export async function bootstrapCA(
  profile: CAProfile = "ECDSA_P256"
): Promise<BootstrapResponse> {
  const response = await api.post<BootstrapResponse>(
    "/ca/bootstrap",
    undefined,
    { params: { algorithm: profile } }
  );

  return response.data;
}

/* =========================================================
   DOWNLOAD CA FRAGMENT
========================================================= */

export async function downloadCAFragment(
  fragmentId: number,
  custodianPassword: string,
  fragmentPassword: string,
  profile: CAProfile = "ECDSA_P256"
): Promise<FragmentDownloadResponse> {
  const response = await api.post<FragmentDownloadResponse>(
    `/ca/fragments/${fragmentId}/download`,
    {
      custodian_password: custodianPassword,
      fragment_password: fragmentPassword,
    },
    { params: { algorithm: profile } }
  );

  return response.data;
}

/* =========================================================
   GET ROOT CERTIFICATE
========================================================= */

export async function getCACertificate(
  profile: CAProfile = "ECDSA_P256"
): Promise<CACertificateResponse> {
  const response = await api.get<CACertificateResponse>(
    "/ca/certificate",
    { params: { algorithm: profile } }
  );

  return response.data;
}

/* =========================================================
   GET PUBLIC KEY
========================================================= */

export async function getCAPublicKey(
  profile: CAProfile = "ECDSA_P256"
): Promise<CAPublicKeyResponse> {
  const response = await api.get<CAPublicKeyResponse>(
    "/ca/public-key",
    { params: { algorithm: profile } }
  );

  return response.data;
}

export interface RotateCAFragment {
  file: File;
  password: string;
}

export async function rotateCA(
  fragments: RotateCAFragment[]
) {
  if (fragments.length < 3) {
    throw new Error(
      "Se requieren al menos 3 fragmentos."
    );
  }

  if (fragments.length > 4) {
    throw new Error(
      "No se pueden enviar más de 4 fragmentos."
    );
  }

  const formData = new FormData();

  fragments.forEach((fragment, index) => {
    const number = index + 1;

    formData.append(
      `fragment_${number}`,
      fragment.file
    );

    formData.append(
      `password_${number}`,
      fragment.password
    );
  });

  // La rotación existente del proyecto permanece limitada a ECDSA.
  const response = await api.post(
    "/ca/rotate",
    formData
  );

  return response.data;
}
