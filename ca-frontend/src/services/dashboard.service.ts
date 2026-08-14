import api from "../api/axios";

export interface DashboardData {
  ca: {
    initialized: boolean;
    algorithm: string | null;
  };

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
    type: "CSR" | "CERTIFICATE";
    action: string;
    status: string;
    timestamp: string;
    request_id?: string;
    requester?: string;
    serial_number?: string;
    subject?: string;
  }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardData>(
    "/ca/dashboard"
  );

  return response.data;
}