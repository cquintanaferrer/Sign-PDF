export interface Certificate {
  id: string;
  serialNumber: string;
  username: string;
  email: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
}