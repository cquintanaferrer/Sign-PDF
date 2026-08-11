import api from "../api/axios";

/* =========================================================
   CA STATUS
========================================================= */

export interface CAStatus {
  initialized: boolean;

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
}

export interface BootstrapResponse {
  message: string;

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
  fragmentId: number;
  filename: string;
  content: string;
}

/* =========================================================
   PUBLIC CA INFORMATION
========================================================= */

export interface CACertificateResponse {
  certificate: string;
  serialNumber: string;
  fingerprint: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
}

export interface CAPublicKeyResponse {
  publicKey: string;
  algorithm: string;
}

/* =========================================================
   GET CA STATUS
========================================================= */

export async function getCAStatus(): Promise<CAStatus> {
  const response = await api.get<CAStatus>(
    "/ca/status"
  );

  return response.data;
}

/* =========================================================
   BOOTSTRAP CA
========================================================= */

export async function bootstrapCA(): Promise<BootstrapResponse> {
  const response =
    await api.post<BootstrapResponse>(
      "/ca/bootstrap"
    );

  return response.data;
}

/* =========================================================
   DOWNLOAD CA FRAGMENT
========================================================= */

export async function downloadCAFragment(
  fragmentId: number,
  password: string
): Promise<FragmentDownloadResponse> {
  const response =
    await api.post<FragmentDownloadResponse>(
      `/ca/fragments/${fragmentId}/download`,
      {
        password,
      }
    );

  return response.data;
}

/* =========================================================
   GET ROOT CERTIFICATE
========================================================= */

export async function getCACertificate(): Promise<CACertificateResponse> {
  const response =
    await api.get<CACertificateResponse>(
      "/ca/certificate"
    );

  return response.data;
}

/* =========================================================
   GET PUBLIC KEY
========================================================= */

export async function getCAPublicKey(): Promise<CAPublicKeyResponse> {
  const response =
    await api.get<CAPublicKeyResponse>(
      "/ca/public-key"
    );

  return response.data;
}