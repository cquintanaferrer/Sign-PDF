import api from "../api/axios";
import { BootstrapResponse } from "../types/ca";

export async function bootstrapCA() {
  const response = await api.post<BootstrapResponse>("/ca/bootstrap");

  return response.data;
}

export async function getCAStatus() {
  const response = await api.get("/ca/status");

  return response.data;
}