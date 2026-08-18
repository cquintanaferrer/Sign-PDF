export interface RootCertificate {
  certificate: string;
  serialNumber: string;
  fingerprint: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
}

export interface ShamirFragment {
  id: number;
  content: string;
}

export interface BootstrapResponse {
  initialized: boolean;
  rootCertificate: RootCertificate;
  fragments: ShamirFragment[];
}

export interface CAStatus {
  initialized: boolean;
  rootCertificate: RootCertificate;
}