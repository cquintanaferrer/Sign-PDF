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
  csrFile: File,
  fragments: FragmentData[]
) {
  // ------------------------------------------
  // Validación del umbral
  // ------------------------------------------

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

  // ------------------------------------------
  // Crear multipart/form-data
  // ------------------------------------------

  const formData = new FormData();

  // CSR
  formData.append(
    "csr",
    csrFile
  );

  // Fragmentos
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

  // ------------------------------------------
  // Solicitar emisión
  // ------------------------------------------

  const response = await api.post(
    "/api/ca/certificates/sign",
    formData
  );

  return response.data;
}