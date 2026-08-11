import api from "../api/axios";
import { CSR } from "../types/csr";

export async function getPendingCSR() {
  const response = await api.get<CSR[]>("/csr/pending");

  return response.data;
}

export interface FragmentData {
  file: File;
  password: string;
}

export async function issueCertificate(
  csrId: string,
  fragments: FragmentData[]
) {
  const formData = new FormData();

  formData.append("csrId", csrId);

  fragments.forEach((fragment, index) => {
    formData.append(
      `fragment${index + 1}`,
      fragment.file
    );

    formData.append(
      `password${index + 1}`,
      fragment.password
    );
  });

  const response = await api.post(
    "/csr/issue",
    formData
  );

  return response.data;
}