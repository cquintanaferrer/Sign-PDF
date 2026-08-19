from datetime import datetime, timedelta, timezone
from cryptography.hazmat.primitives import serialization
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509 import (
    BasicConstraints,
    CertificateBuilder,
    Name,
    NameAttribute,
)
from cryptography.x509.oid import NameOID


def generate_ca_private_key():
    return ec.generate_private_key(
        ec.SECP256R1()
    )


def serialize_private_key(
    private_key,
) -> bytes:

    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def generate_root_certificate(
    private_key,
    common_name: str = "SignPDF Root CA",
    validity_days: int = 3650,
):

    subject = issuer = Name(
        [
            NameAttribute(
                NameOID.COUNTRY_NAME,
                "MX",
            ),
            NameAttribute(
                NameOID.ORGANIZATION_NAME,
                "SignPDF",
            ),
            NameAttribute(
                NameOID.COMMON_NAME,
                common_name,
            ),
        ]
    )

    now = datetime.now(timezone.utc)

    certificate = (
        CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(
            private_key.public_key()
        )
        .serial_number(
            x509.random_serial_number()
        )
        .not_valid_before(now)
        .not_valid_after(
            now + timedelta(
                days=validity_days
            )
        )
        .add_extension(
            BasicConstraints(
                ca=True,
                path_length=None,
            ),
            critical=True,
        )
        .sign(
            private_key,
            hashes.SHA256(),
        )
    )

    return certificate


def serialize_certificate(
    certificate,
) -> bytes:

    return certificate.public_bytes(
        serialization.Encoding.PEM
    )

def serialize_public_key(private_key) -> str:
    """
    Obtiene la clave pública correspondiente a una
    clave privada EC y la serializa en PEM.
    """

    public_key = private_key.public_key()

    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

def certificate_fingerprint(
    certificate,
) -> str:

    fingerprint = certificate.fingerprint(
        hashes.SHA256()
    )

    return fingerprint.hex(":")