import api from "../api/axios";
import {
  BootstrapResponse,
  CAStatus,
} from "../types/ca";

export async function bootstrapCA() {
  const response = await api.post<BootstrapResponse>(
    "/ca/bootstrap"
  );

  return response.data;
}

export async function getCAStatus() {
  const response = await api.get<CAStatus>(
    "/ca/status"
  );

  return response.data;
}