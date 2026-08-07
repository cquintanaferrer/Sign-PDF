import api from "../api/axios";
import { CSR } from "../types/csr";

export async function getPendingCSR() {
  const response = await api.get<CSR[]>("/csr/pending");

  return response.data;
}

export async function issueCertificate(
  csrId: string,
  fragment1: File,
  fragment2: File
) {
  const formData = new FormData();

  formData.append("csrId", csrId);
  formData.append("fragment1", fragment1);
  formData.append("fragment2", fragment2);

  const response = await api.post(
    "/csr/issue",
    formData
  );

  return response.data;
}