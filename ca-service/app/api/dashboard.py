from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crypto.algorithm_registry import (
    ECDSA_PROFILE,
    MLDSA65_PROFILE,
)
from app.models.ca import CertificateAuthority
from app.models.ca_fragment import CAFragment
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate
from app.services.ca_service import get_ca


router = APIRouter(
    prefix="/api/ca/dashboard",
    tags=["Dashboard"],
)


def _fragment_count(db: Session, ca: CertificateAuthority | None) -> int:
    if ca is None:
        return 0

    return (
        db.query(func.count(CAFragment.id))
        .filter(CAFragment.ca_id == ca.id)
        .scalar()
        or 0
    )


def _ca_summary(
    profile: str,
    ca: CertificateAuthority | None,
    fragments: int,
) -> dict:
    return {
        "profile": profile,
        "initialized": ca is not None,
        "algorithm": ca.algorithm if ca else None,
        "generation": ca.generation if ca else None,
        "serial_number": ca.serial_number if ca else None,
        "fingerprint": ca.fingerprint if ca else None,
        "fragments": fragments,
    }


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
):
    # Las dos raíces son lógicamente independientes, aunque vivan
    # dentro del mismo servicio y la misma base de datos.
    ecdsa_ca = get_ca(db, algorithm=ECDSA_PROFILE)
    mldsa_ca = get_ca(db, algorithm=MLDSA65_PROFILE)

    ecdsa_fragments = _fragment_count(db, ecdsa_ca)
    mldsa_fragments = _fragment_count(db, mldsa_ca)

    pending_csr = (
        db.query(func.count(CertificateSigningRequest.id))
        .filter(CertificateSigningRequest.status == "PENDING")
        .scalar()
        or 0
    )

    issued_csr = (
        db.query(func.count(CertificateSigningRequest.id))
        .filter(CertificateSigningRequest.status == "ISSUED")
        .scalar()
        or 0
    )

    issued_certificates = (
        db.query(func.count(IssuedCertificate.id))
        .scalar()
        or 0
    )

    fragments = (
        db.query(func.count(CAFragment.id))
        .scalar()
        or 0
    )

    recent_csr = (
        db.query(CertificateSigningRequest)
        .order_by(CertificateSigningRequest.created_at.desc())
        .limit(10)
        .all()
    )

    recent_certificates = (
        db.query(IssuedCertificate)
        .order_by(IssuedCertificate.issued_at.desc())
        .limit(10)
        .all()
    )

    recent_revocations = (
        db.query(IssuedCertificate)
        .filter(
            IssuedCertificate.status == "REVOKED",
            IssuedCertificate.revoked_at.isnot(None),
        )
        .order_by(IssuedCertificate.revoked_at.desc())
        .limit(10)
        .all()
    )

    recent_rotations = (
        db.query(CertificateAuthority)
        .filter(
            CertificateAuthority.generation > 1,
            CertificateAuthority.parent_ca_id.isnot(None),
        )
        .order_by(CertificateAuthority.issued_at.desc())
        .limit(10)
        .all()
    )

    activity = []

    for request in recent_csr:
        activity.append({
            "type": "CSR",
            "action": (
                "CSR emitida"
                if request.status == "ISSUED"
                else "CSR recibida"
            ),
            "status": request.status,
            "timestamp": request.created_at,
            "request_id": str(request.id),
            "requester": request.requester_username,
            "algorithm": request.algorithm,
        })

    for certificate in recent_certificates:
        activity.append({
            "type": "CERTIFICATE",
            "action": "Certificado emitido",
            "status": "ISSUED",
            "timestamp": certificate.issued_at,
            "serial_number": certificate.serial_number,
            "subject": certificate.subject,
            "algorithm": certificate.algorithm,
        })

    for certificate in recent_revocations:
        activity.append({
            "type": "CERTIFICATE",
            "action": "Certificado revocado",
            "status": "REVOKED",
            "timestamp": certificate.revoked_at,
            "serial_number": certificate.serial_number,
            "subject": certificate.subject,
            "algorithm": certificate.algorithm,
        })

    for ca_rotation in recent_rotations:
        activity.append({
            "type": "CA_ROTATION",
            "action": "Autoridad Certificadora reiniciada",
            "status": "ROTATED",
            "timestamp": ca_rotation.issued_at,
            "generation": ca_rotation.generation,
            "ca_id": str(ca_rotation.id),
            "previous_ca_id": (
                str(ca_rotation.parent_ca_id)
                if ca_rotation.parent_ca_id
                else None
            ),
            "fingerprint": ca_rotation.fingerprint,
            "algorithm": ca_rotation.algorithm,
        })

    activity.sort(
        key=lambda item: item["timestamp"],
        reverse=True,
    )
    activity = activity[:10]

    ca_profiles = [
        _ca_summary(ECDSA_PROFILE, ecdsa_ca, ecdsa_fragments),
        _ca_summary(MLDSA65_PROFILE, mldsa_ca, mldsa_fragments),
    ]

    # "ca" se conserva por compatibilidad con clientes anteriores.
    return {
        "ca": {
            "initialized": ecdsa_ca is not None,
            "algorithm": ecdsa_ca.algorithm if ecdsa_ca else None,
        },
        "cas": ca_profiles,
        "csr": {
            "pending": pending_csr,
            "issued": issued_csr,
        },
        "certificates": {
            "issued": issued_certificates,
        },
        "fragments": {
            "total": fragments,
        },
        "activity": activity,
    }
