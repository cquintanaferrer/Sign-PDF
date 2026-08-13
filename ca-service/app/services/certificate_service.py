from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.models.ca import CertificateAuthority

from app.services.fragment_service import (
    FragmentInput,
    reconstruct_ca_secret,
)

def issue_certificate(
    csr_pem: bytes,
    fragments: list[FragmentInput],
    ca: CertificateAuthority,
) -> x509.Certificate:
    """
    Reconstruye temporalmente la clave privada de la CA,
    valida la CSR y emite un certificado X.509.

    La clave privada reconstruida no se devuelve.
    """

    # --------------------------------------------------
    # 1. Cargar CSR
    # --------------------------------------------------

    try:
        csr = x509.load_pem_x509_csr(csr_pem)
    except ValueError as exc:
        raise ValueError(
            "La CSR no es un PEM PKCS#10 válido."
        ) from exc

    # --------------------------------------------------
    # 2. Verificar firma de la CSR
    # --------------------------------------------------

    if not csr.is_signature_valid:
        raise ValueError(
            "La firma de la CSR no es válida."
        )

    # --------------------------------------------------
    # 3. Obtener clave pública del solicitante
    # --------------------------------------------------

    public_key = csr.public_key()

    if not isinstance(
        public_key,
        ec.EllipticCurvePublicKey,
    ):
        raise ValueError(
            "La CSR debe utilizar una clave EC."
        )

    if public_key.curve.name != "secp256r1":
        raise ValueError(
            "La CSR debe utilizar la curva P-256."
        )

    # --------------------------------------------------
    # 4. Reconstruir clave privada de la CA
    # --------------------------------------------------

    private_scalar = reconstruct_ca_secret(
        fragments=fragments,
        expected_hash=ca.private_key_hash,
    )

    ca_private_key = None

    try:

        # ----------------------------------------------
        # 5. Reconstruir objeto P-256
        # ----------------------------------------------

        private_value = int.from_bytes(
            private_scalar,
            byteorder="big",
        )

        ca_private_key = ec.derive_private_key(
            private_value,
            ec.SECP256R1(),
        )

        # ----------------------------------------------
        # 6. Cargar certificado raíz de la CA
        # ----------------------------------------------

        ca_certificate = x509.load_pem_x509_certificate(
            ca.root_certificate.encode("utf-8")
        )

        # ----------------------------------------------
        # 7. Comprobar que la clave reconstruida
        #    corresponde al certificado de la CA
        # ----------------------------------------------

        ca_public_from_private = (
            ca_private_key.public_key()
        )

        ca_public_from_certificate = (
            ca_certificate.public_key()
        )

        if (
            ca_public_from_private.public_numbers()
            != ca_public_from_certificate.public_numbers()
        ):
            raise ValueError(
                "La clave reconstruida no corresponde "
                "al certificado de la CA."
            )

        # ----------------------------------------------
        # 8. Crear certificado del solicitante
        # ----------------------------------------------

        now = datetime.now(timezone.utc)

        serial_number = x509.random_serial_number()

        builder = (
            x509.CertificateBuilder()
            .subject_name(csr.subject)
            .issuer_name(ca_certificate.subject)
            .public_key(public_key)
            .serial_number(serial_number)
            .not_valid_before(now)
            .not_valid_after(
                now + timedelta(days=365)
            )
        )

        # ----------------------------------------------
        # 9. Copiar extensiones de la CSR
        # ----------------------------------------------

        for extension in csr.extensions:

            builder = builder.add_extension(
                extension.value,
                extension.critical,
            )

        # ----------------------------------------------
        # 10. Firmar certificado
        # ----------------------------------------------

        certificate = builder.sign(
            private_key=ca_private_key,
            algorithm=hashes.SHA256(),
        )

        return certificate

    finally:

        # ----------------------------------------------
        # 11. Eliminar referencias Python
        # ----------------------------------------------

        del ca_private_key
        del private_scalar