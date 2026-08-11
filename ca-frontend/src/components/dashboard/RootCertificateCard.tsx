interface Props {
  serialNumber: string;
  fingerprint: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
}

export default function RootCertificateCard({
  serialNumber,
  fingerprint,
  algorithm,
  issuedAt,
  expiresAt,
}: Props) {
  return (
    <div className="rounded-xl bg-white shadow p-6">

      <h2 className="text-xl font-semibold mb-6">
        Certificado Raíz
      </h2>

      <div className="space-y-2">

        <p>
          <strong>Algoritmo:</strong> {algorithm}
        </p>

        <p>
          <strong>Serial:</strong> {serialNumber}
        </p>

        <p>
          <strong>Fingerprint:</strong> {fingerprint}
        </p>

        <p>
          <strong>Emitido:</strong> {issuedAt}
        </p>

        <p>
          <strong>Expira:</strong> {expiresAt}
        </p>

      </div>

    </div>
  );
}