from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes

from app.crypto.algorithm_registry import (
    ECDSA_PROFILE,
    algorithm_label,
    detect_public_key_profile,
    profile_from_algorithm_label,
)
from app.crypto.keys import private_key_from_secret, public_keys_equal
from app.models.ca import CertificateAuthority
from app.services.fragment_service import FragmentInput, reconstruct_ca_secret


def issue_certificate(
    csr_pem: bytes,
    fragments: list[FragmentInput],
    ca: CertificateAuthority,
) -> x509.Certificate:
    """
    Emite certificados ECDSA P-256 o ML-DSA-65 con la raíz correspondiente.

    La selección no se hace por un parámetro confiado del usuario: se detecta
    el tipo de clave pública contenido en la CSR y se comprueba que coincida
    con el algoritmo de la CA seleccionada.
    """
    try:
        csr = x509.load_pem_x509_csr(csr_pem)
    except ValueError as exc:
        raise ValueError("La CSR no es un PEM PKCS#10 válido.") from exc

    if not csr.is_signature_valid:
        raise ValueError("La firma de la CSR no es válida.")

    public_key = csr.public_key()
    csr_profile = detect_public_key_profile(public_key)
    ca_profile = profile_from_algorithm_label(ca.algorithm)

    if csr_profile != ca_profile:
        raise ValueError(
            "La CSR y la Autoridad Certificadora no utilizan el mismo perfil criptográfico."
        )

    private_secret = reconstruct_ca_secret(
        fragments=fragments,
        expected_hash=ca.private_key_hash,
    )

    ca_private_key = None

    try:
        ca_private_key = private_key_from_secret(
            private_secret,
            algorithm=ca_profile,
        )

        ca_certificate = x509.load_pem_x509_certificate(
            ca.root_certificate.encode("utf-8")
        )

        if not public_keys_equal(
            ca_private_key.public_key(),
            ca_certificate.public_key(),
        ):
            raise ValueError(
                "La clave reconstruida no corresponde al certificado de la CA."
            )

        now = datetime.now(timezone.utc)

        builder = (
            x509.CertificateBuilder()
            .subject_name(csr.subject)
            .issuer_name(ca_certificate.subject)
            .public_key(public_key)
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + timedelta(days=365))
        )

        for extension in csr.extensions:
            builder = builder.add_extension(
                extension.value,
                extension.critical,
            )

        sign_algorithm = (
            hashes.SHA256()
            if ca_profile == ECDSA_PROFILE
            else None
        )

        return builder.sign(
            private_key=ca_private_key,
            algorithm=sign_algorithm,
        )

    finally:
        del ca_private_key
        del private_secret
