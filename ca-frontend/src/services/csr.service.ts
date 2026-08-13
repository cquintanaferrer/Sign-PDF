import api from "../api/axios";
import { CSR } from "../types/csr";

export async function getPendingCSR() {
  const response = await api.get<CSR[]>(
    "/csr/pending"
  );

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
  if (fragments.length < 3) {
    throw new Error(
      "Se requieren al menos 3 fragmentos."
    );
  }

  if (fragments.length > 4) {
    throw new Error(
      "No se pueden enviar más de 4 fragmentos."
    );
  }

  const formData = new FormData();

  // ID de la CSR almacenada en PostgreSQL
  formData.append(
    "csr_id",
    csrId
  );

  fragments.forEach((fragment, index) => {
    const number = index + 1;

    formData.append(
      `fragment_${number}`,
      fragment.file
    );

    formData.append(
      `password_${number}`,
      fragment.password
    );
  });

  const response = await api.post(
    "/ca/certificates/sign",
    formData
  );

  return response.data;
}