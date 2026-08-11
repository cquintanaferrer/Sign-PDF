import api from "../api/axios";

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

export async function getCAStatus(): Promise<CAStatus> {
  const response = await api.get<CAStatus>("/ca/status");

  return response.data;
}

export async function bootstrapCA() {
  const response = await api.post("/ca/bootstrap");

  return response.data;
}