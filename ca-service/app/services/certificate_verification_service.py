from datetime import datetime, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy.orm import Session

from app.models.ca import CertificateAuthority
from app.models.issued_certificate import IssuedCertificate


def verify_certificate(
    certificate_pem: bytes,
    db: Session,
) -> dict:
    # ---------------------------------------------
    # 1. Cargar certificado
    # ---------------------------------------------

    try:
        certificate = x509.load_pem_x509_certificate(
            certificate_pem
        )
    except ValueError as exc:
        raise ValueError(
            "El certificado no es un X.509 PEM válido."
        ) from exc

    # ---------------------------------------------
    # 2. Obtener CA actual
    # ---------------------------------------------

    ca = (
        db.query(CertificateAuthority)
        .filter(
            CertificateAuthority.initialized.is_(True)
        )
        .first()
    )

    if ca is None:
        raise ValueError(
            "La Autoridad Certificadora no está inicializada."
        )

    # ---------------------------------------------
    # 3. Cargar certificado raíz de la CA
    # ---------------------------------------------

    try:
        ca_certificate = (
            x509.load_pem_x509_certificate(
                ca.root_certificate.encode("utf-8")
            )
        )
    except ValueError as exc:
        raise ValueError(
            "El certificado raíz de la CA no es válido."
        ) from exc

    # ---------------------------------------------
    # 4. Comprobar issuer
    # ---------------------------------------------

    issuer_matches = (
        certificate.issuer
        == ca_certificate.subject
    )

    # ---------------------------------------------
    # 5. Verificar firma del certificado
    # ---------------------------------------------

    signature_valid = False

    ca_public_key = ca_certificate.public_key()

    if isinstance(
        ca_public_key,
        ec.EllipticCurvePublicKey,
    ):
        try:
            ca_public_key.verify(
                certificate.signature,
                certificate.tbs_certificate_bytes,
                ec.ECDSA(
                    certificate.signature_hash_algorithm
                ),
            )

            signature_valid = True

        except Exception:
            signature_valid = False

    # ---------------------------------------------
    # 6. Buscar certificado en PostgreSQL
    # ---------------------------------------------

    serial_number = str(
        certificate.serial_number
    )

    issued_certificate = (
        db.query(IssuedCertificate)
        .filter(
            IssuedCertificate.serial_number
            == serial_number
        )
        .first()
    )

    exists_in_database = (
        issued_certificate is not None
    )

    # ---------------------------------------------
    # 7. Verificar fingerprint
    # ---------------------------------------------

    fingerprint = certificate.fingerprint(
        hashes.SHA256()
    ).hex(":")

    # ---------------------------------------------
    # 8. Verificar vigencia
    # ---------------------------------------------

    now = datetime.now(timezone.utc)

    not_valid_before = (
        certificate.not_valid_before_utc
    )

    not_valid_after = (
        certificate.not_valid_after_utc
    )

    expired = now > not_valid_after

    not_yet_valid = now < not_valid_before

    currently_valid = (
        not_yet_valid is False
        and expired is False
    )

    # ---------------------------------------------
    # 9. Verificar revocación
    # ---------------------------------------------

    revoked = (
        issued_certificate is not None
        and issued_certificate.status == "REVOKED"
    )

    # ---------------------------------------------
    # 10. Determinar resultado final
    # ---------------------------------------------

    valid = (
        issuer_matches
        and signature_valid
        and exists_in_database
        and currently_valid
        and not revoked
    )

    return {
        "valid": valid,
        "issued_by_ca": (
            issuer_matches
            and signature_valid
            and exists_in_database
        ),
        "signature_valid": signature_valid,
        "exists_in_database": exists_in_database,
        "revoked": revoked,
        "expired": expired,
        "not_yet_valid": not_yet_valid,
        "serial_number": serial_number,
        "fingerprint": fingerprint,
        "subject": certificate.subject.rfc4514_string(),
        "issuer": certificate.issuer.rfc4514_string(),
        "algorithm": (
            certificate.signature_algorithm_oid
            ._name
            or certificate.signature_algorithm_oid.dotted_string
        ),
        "issued_at": (
            certificate.not_valid_before_utc
        ),
        "expires_at": (
            certificate.not_valid_after_utc
        ),
        "revoked_at": (
            issued_certificate.revoked_at
            if issued_certificate
            else None
        ),
        "revocation_reason": (
            issued_certificate.revocation_reason
            if issued_certificate
            else None
        ),
    }