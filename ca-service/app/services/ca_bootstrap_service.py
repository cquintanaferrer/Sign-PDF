from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.crypto.keys import (
    certificate_fingerprint,
    generate_ca_private_key,
    generate_root_certificate,
    serialize_certificate,
)
from app.models.ca import CertificateAuthority
from app.services.ca_service import get_ca


def bootstrap_ca(
    db: Session,
) -> dict:

    existing_ca = get_ca(db)

    if existing_ca and existing_ca.initialized:
        raise ValueError(
            "La Autoridad Certificadora ya fue inicializada."
        )

    private_key = generate_ca_private_key()

    certificate = generate_root_certificate(
        private_key
    )

    certificate_pem = serialize_certificate(
        certificate
    )

    fingerprint = certificate_fingerprint(
        certificate
    )

    serial_number = str(
        certificate.serial_number
    )

    now = datetime.now(timezone.utc)

    if existing_ca is None:

        ca = CertificateAuthority(
            initialized=True,
            root_certificate=certificate_pem.decode(),
            serial_number=serial_number,
            fingerprint=fingerprint,
            algorithm="ECDSA P-256 / SHA-256",
            issued_at=certificate.not_valid_before_utc,
            expires_at=certificate.not_valid_after_utc,
        )

        db.add(ca)

    else:

        existing_ca.initialized = True
        existing_ca.root_certificate = (
            certificate_pem.decode()
        )
        existing_ca.serial_number = serial_number
        existing_ca.fingerprint = fingerprint
        existing_ca.algorithm = (
            "ECDSA P-256 / SHA-256"
        )
        existing_ca.issued_at = (
            certificate.not_valid_before_utc
        )
        existing_ca.expires_at = (
            certificate.not_valid_after_utc
        )

    db.commit()

    return {
        "certificate": certificate_pem.decode(),
        "serial_number": serial_number,
        "fingerprint": fingerprint,
        "algorithm": "ECDSA P-256 / SHA-256",
    }