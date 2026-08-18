from datetime import datetime, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, mldsa
from sqlalchemy.orm import Session

from app.models.ca import CertificateAuthority
from app.models.issued_certificate import IssuedCertificate


def verify_certificate(
    certificate_pem: bytes,
    db: Session,
) -> dict:
    try:
        certificate = x509.load_pem_x509_certificate(certificate_pem)
    except ValueError as exc:
        raise ValueError("El certificado no es un X.509 PEM válido.") from exc

    serial_number = str(certificate.serial_number)

    issued_certificate = (
        db.query(IssuedCertificate)
        .filter(IssuedCertificate.serial_number == serial_number)
        .first()
    )

    exists_in_database = issued_certificate is not None
    ca = None

    if issued_certificate is not None:
        ca = (
            db.query(CertificateAuthority)
            .filter(CertificateAuthority.id == issued_certificate.ca_id)
            .first()
        )

    if ca is None:
        issuer_matches = False
        signature_valid = False
    else:
        try:
            ca_certificate = x509.load_pem_x509_certificate(
                ca.root_certificate.encode("utf-8")
            )
        except ValueError as exc:
            raise ValueError("El certificado raíz de la CA no es válido.") from exc

        issuer_matches = certificate.issuer == ca_certificate.subject
        signature_valid = False
        ca_public_key = ca_certificate.public_key()

        try:
            if isinstance(ca_public_key, ec.EllipticCurvePublicKey):
                ca_public_key.verify(
                    certificate.signature,
                    certificate.tbs_certificate_bytes,
                    ec.ECDSA(certificate.signature_hash_algorithm),
                )
                signature_valid = True

            elif isinstance(
                ca_public_key,
                (
                    mldsa.MLDSA44PublicKey,
                    mldsa.MLDSA65PublicKey,
                    mldsa.MLDSA87PublicKey,
                ),
            ):
                # En X.509, ML-DSA usa la variante pura: la firma se verifica
                # directamente sobre el TBSCertificate DER.
                ca_public_key.verify(
                    certificate.signature,
                    certificate.tbs_certificate_bytes,
                )
                signature_valid = True

        except Exception:
            signature_valid = False

    fingerprint = certificate.fingerprint(hashes.SHA256()).hex(":")

    now = datetime.now(timezone.utc)
    not_valid_before = certificate.not_valid_before_utc
    not_valid_after = certificate.not_valid_after_utc
    expired = now > not_valid_after
    not_yet_valid = now < not_valid_before
    currently_valid = not not_yet_valid and not expired

    revoked = (
        issued_certificate is not None
        and issued_certificate.status == "REVOKED"
    )

    valid = (
        issuer_matches
        and signature_valid
        and exists_in_database
        and currently_valid
        and not revoked
    )

    return {
        "valid": valid,
        "issued_by_ca": issuer_matches and signature_valid and exists_in_database,
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
            certificate.signature_algorithm_oid._name
            or certificate.signature_algorithm_oid.dotted_string
        ),
        "issued_at": certificate.not_valid_before_utc,
        "expires_at": certificate.not_valid_after_utc,
        "revoked_at": (
            issued_certificate.revoked_at if issued_certificate else None
        ),
        "revocation_reason": (
            issued_certificate.revocation_reason if issued_certificate else None
        ),
        "ca_id": str(ca.id) if ca else None,
        "ca_generation": ca.generation if ca else None,
        "ca_active": ca.is_active if ca else None,
        "ca_algorithm": ca.algorithm if ca else None,
    }
