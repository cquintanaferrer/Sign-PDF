export interface CSR {
  id: string;
  username: string;
  email: string;
  algorithm: string;
  createdAt: string;
  status: "PENDING" | "SIGNED";
}