from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, mldsa
from cryptography.x509 import BasicConstraints, CertificateBuilder, Name, NameAttribute
from cryptography.x509.oid import NameOID

from app.crypto.algorithm_registry import (
    ECDSA_PROFILE,
    MLDSA65_PROFILE,
    normalize_profile,
)


def generate_ca_private_key(
    algorithm: str = ECDSA_PROFILE,
):
    profile = normalize_profile(algorithm)

    if profile == ECDSA_PROFILE:
        return ec.generate_private_key(ec.SECP256R1())

    if profile == MLDSA65_PROFILE:
        return mldsa.MLDSA65PrivateKey.generate()

    raise ValueError("Algoritmo de CA no soportado.")


def ca_secret_bytes(
    private_key,
    algorithm: str,
) -> bytes:
    """
    Devuelve el secreto de 32 bytes que se divide mediante SLIP-0039.

    ECDSA P-256: scalar privado de 32 bytes.
    ML-DSA-65: seed privado de 32 bytes definido por la API de cryptography.
    """
    profile = normalize_profile(algorithm)

    if profile == ECDSA_PROFILE:
        if not isinstance(private_key, ec.EllipticCurvePrivateKey):
            raise ValueError("La clave privada no corresponde a ECDSA P-256.")

        private_value = private_key.private_numbers().private_value
        return private_value.to_bytes(32, byteorder="big")

    if profile == MLDSA65_PROFILE:
        if not isinstance(private_key, mldsa.MLDSA65PrivateKey):
            raise ValueError("La clave privada no corresponde a ML-DSA-65.")

        return private_key.private_bytes_raw()

    raise ValueError("Algoritmo de CA no soportado.")


def private_key_from_secret(
    secret: bytes,
    algorithm: str,
):
    """Reconstruye temporalmente el objeto de clave desde el secreto SLIP-39."""
    if len(secret) != 32:
        raise ValueError("El secreto de la CA debe tener exactamente 32 bytes.")

    profile = normalize_profile(algorithm)

    if profile == ECDSA_PROFILE:
        private_value = int.from_bytes(secret, byteorder="big")
        return ec.derive_private_key(private_value, ec.SECP256R1())

    if profile == MLDSA65_PROFILE:
        return mldsa.MLDSA65PrivateKey.from_seed_bytes(secret)

    raise ValueError("Algoritmo de CA no soportado.")


def serialize_private_key(private_key) -> bytes:
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def _profile_from_private_key(private_key) -> str:
    if isinstance(private_key, ec.EllipticCurvePrivateKey):
        if private_key.curve.name != "secp256r1":
            raise ValueError("La clave EC de la CA debe ser P-256.")
        return ECDSA_PROFILE

    if isinstance(private_key, mldsa.MLDSA65PrivateKey):
        return MLDSA65_PROFILE

    raise ValueError("Tipo de clave privada de CA no soportado.")


def generate_root_certificate(
    private_key,
    common_name: str | None = None,
    validity_days: int = 3650,
):
    profile = _profile_from_private_key(private_key)

    if common_name is None:
        common_name = (
            "SignPDF Root CA"
            if profile == ECDSA_PROFILE
            else "SignPDF ML-DSA-65 Root CA"
        )

    subject = issuer = Name(
        [
            NameAttribute(NameOID.COUNTRY_NAME, "MX"),
            NameAttribute(NameOID.ORGANIZATION_NAME, "SignPDF"),
            NameAttribute(NameOID.COMMON_NAME, common_name),
        ]
    )

    now = datetime.now(timezone.utc)

    builder = (
        CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + timedelta(days=validity_days))
        .add_extension(
            BasicConstraints(ca=True, path_length=None),
            critical=True,
        )
        .add_extension(
            x509.KeyUsage(
                digital_signature=False,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
    )

    # ECDSA usa SHA-256 externo. ML-DSA puro no recibe un HashAlgorithm
    # separado en X.509; cryptography exige algorithm=None para ML-DSA.
    sign_algorithm = hashes.SHA256() if profile == ECDSA_PROFILE else None

    return builder.sign(
        private_key=private_key,
        algorithm=sign_algorithm,
    )


def serialize_certificate(certificate) -> bytes:
    return certificate.public_bytes(serialization.Encoding.PEM)


def serialize_public_key(private_key) -> str:
    public_key = private_key.public_key()

    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")


def public_keys_equal(first, second) -> bool:
    first_der = first.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    second_der = second.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return first_der == second_der


def certificate_fingerprint(certificate) -> str:
    fingerprint = certificate.fingerprint(hashes.SHA256())
    return fingerprint.hex(":")
