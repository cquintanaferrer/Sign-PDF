import api from "../api/axios";
import { Certificate } from "../types/certificate";

export async function getCertificates() {
  const response = await api.get<Certificate[]>("/certificates");

  return response.data;
}

export async function revokeCertificate(id: string) {
  return api.patch(`/certificates/${id}/revoke`);
}