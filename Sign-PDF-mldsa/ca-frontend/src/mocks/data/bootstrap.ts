import { BootstrapResponse } from "../../types/ca";

export let bootstrapState: BootstrapResponse = {
  initialized: false,

  rootCertificate: {
    certificate: `-----BEGIN CERTIFICATE-----
MIIFakeCertificate
-----END CERTIFICATE-----`,

    serialNumber: "",

    fingerprint: "",

    algorithm: "ECDSA P-384",

    issuedAt: "",

    expiresAt: "",
  },

  fragments: [],
};

export function initializeCA(): BootstrapResponse {
  bootstrapState = {
    initialized: true,

    rootCertificate: {
      certificate: `-----BEGIN CERTIFICATE-----
MIIFakeCertificate
-----END CERTIFICATE-----`,

      serialNumber: "01A2B3C4D5",

      fingerprint:
        "5A:72:CC:12:AA:33:98:EE:77:12",

      algorithm: "ECDSA P-384",

      issuedAt: "2026-08-06",

      expiresAt: "2036-08-06",
    },

    fragments: [
      {
        id: 1,
        content: "Fragmento 1",
      },
      {
        id: 2,
        content: "Fragmento 2",
      },
      {
        id: 3,
        content: "Fragmento 3",
      },
      {
        id: 4,
        content: "Fragmento 4",
      },
    ],
  };

  return bootstrapState;
}

export function resetBootstrap() {
  bootstrapState.initialized = false;

  bootstrapState.fragments = [];

  bootstrapState.rootCertificate = {
    certificate: "",

    serialNumber: "",

    fingerprint: "",

    algorithm: "ECDSA P-384",

    issuedAt: "",

    expiresAt: "",
  };
}