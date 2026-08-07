import api from "../api/axios";
import { Dashboard } from "../types/dashboard";

export async function getDashboard() {
  const response = await api.get<Dashboard>("/dashboard");

  return response.data;
}