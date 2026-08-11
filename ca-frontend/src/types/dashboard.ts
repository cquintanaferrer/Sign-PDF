import { RootCertificate } from "./ca";

export interface Dashboard {
  initialized: boolean;

  certificatesIssued: number;

  pendingCSR: number;

  revokedCertificates: number;

  rootCertificate: RootCertificate;
}