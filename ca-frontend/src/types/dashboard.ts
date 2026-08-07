export interface Dashboard {
  initialized: boolean;
  certificatesIssued: number;
  pendingCSR: number;
  revokedCertificates: number;

  rootCertificate: {
    serialNumber: string;
    fingerprint: string;
    algorithm: string;
    issuedAt: string;
    expiresAt: string;
  };
}