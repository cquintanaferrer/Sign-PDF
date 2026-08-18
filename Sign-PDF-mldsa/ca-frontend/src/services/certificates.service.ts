import api from "../api/axios";

export interface IssuedCertificate {
  id: string;
  serial_number: string;
  subject: string;
  issuer: string;
  algorithm: string;
  issued_at: string;
  expires_at: string;
  status: string;
}

export async function getIssuedCertificates(): Promise<
  IssuedCertificate[]
> {
  const response = await api.get<IssuedCertificate[]>(
    "/ca/certificates"
  );

  return response.data;
}

export async function revokeIssuedCertificate(
  serialNumber: string
) {
  const response = await api.post(
    `/ca/certificates/${encodeURIComponent(serialNumber)}/revoke`
  );

  return response.data;
}