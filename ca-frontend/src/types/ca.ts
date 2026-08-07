export interface BootstrapResponse {
  initialized: boolean;

  rootCertificate: string;

  fragments: {
    id: number;
    content: string;
  }[];
}