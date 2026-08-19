export interface CSR {
  id: string;
  username: string;
  email: string;
  algorithm: string;
  created_at: string;
  status: "PENDING" | "ISSUED" | "REJECTED";
}
