import api from "../api/axios";
import type { CAProfile } from "./ca.service";

export interface DashboardData {
  // Campo legado conservado por compatibilidad del backend.
  ca: {
    initialized: boolean;
    algorithm: string | null;
  };

  cas: {
    profile: CAProfile;
    initialized: boolean;
    algorithm: string | null;
    generation: number | null;
    serial_number: string | null;
    fingerprint: string | null;
    fragments: number;
  }[];

  csr: {
    pending: number;
    issued: number;
  };

  certificates: {
    issued: number;
  };

  fragments: {
    total: number;
  };
  
  activity: {
    type: "CSR" | "CERTIFICATE" | "CA_ROTATION";
    action: string;
    status: string;
    timestamp: string;
    algorithm?: string;
    request_id?: string;
    requester?: string;
    serial_number?: string;
    subject?: string;
    generation?: number;
    ca_id?: string;
    previous_ca_id?: string;
    fingerprint?: string;
  }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardData>(
    "/ca/dashboard"
  );

  return response.data;
}
