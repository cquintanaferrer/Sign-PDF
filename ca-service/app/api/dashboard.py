from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.ca import CertificateAuthority
from app.models.ca_fragment import CAFragment
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate


router = APIRouter(
    prefix="/api/ca/dashboard",
    tags=["Dashboard"],
)


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
):
    # ------------------------------------------
    # Estado de la CA
    # ------------------------------------------

    ca = (
        db.query(CertificateAuthority)
        .first()
    )

    ca_initialized = ca is not None

    # ------------------------------------------
    # CSR
    # ------------------------------------------

    pending_csr = (
        db.query(
            func.count(
                CertificateSigningRequest.id
            )
        )
        .filter(
            CertificateSigningRequest.status == "PENDING"
        )
        .scalar()
    )

    issued_csr = (
        db.query(
            func.count(
                CertificateSigningRequest.id
            )
        )
        .filter(
            CertificateSigningRequest.status == "ISSUED"
        )
        .scalar()
    )

    # ------------------------------------------
    # Certificados
    # ------------------------------------------

    issued_certificates = (
        db.query(
            func.count(
                IssuedCertificate.id
            )
        )
        .scalar()
    )

    # ------------------------------------------
    # Fragmentos
    # ------------------------------------------

    fragments = (
        db.query(
            func.count(
                CAFragment.id
            )
        )
        .scalar()
    )

    # ------------------------------------------
    # Actividad reciente
    # ------------------------------------------

    recent_csr = (
        db.query(CertificateSigningRequest)
        .order_by(
            CertificateSigningRequest.created_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_certificates = (
        db.query(IssuedCertificate)
        .order_by(
            IssuedCertificate.issued_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_revocations = (
        db.query(IssuedCertificate)
        .filter(
            IssuedCertificate.status == "REVOKED",
            IssuedCertificate.revoked_at.isnot(None),
        )
        .order_by(
            IssuedCertificate.revoked_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_rotations = (
        db.query(CertificateAuthority)
        .filter(
            CertificateAuthority.generation > 1,
            CertificateAuthority.parent_ca_id.isnot(None),
        )
        .order_by(
            CertificateAuthority.issued_at.desc()
        )
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
        })

    for certificate in recent_certificates:
        activity.append({
            "type": "CERTIFICATE",
            "action": "Certificado emitido",
            "status": "ISSUED",
            "timestamp": certificate.issued_at,
            "serial_number": certificate.serial_number,
            "subject": certificate.subject,
        })

    for certificate in recent_revocations:
        activity.append({
            "type": "CERTIFICATE",
            "action": "Certificado revocado",
            "status": "REVOKED",
            "timestamp": certificate.revoked_at,
            "serial_number": certificate.serial_number,
            "subject": certificate.subject,
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
        })

    # Ordenar toda la actividad por fecha
    activity.sort(
        key=lambda item: item["timestamp"],
        reverse=True,
    )

    # Mostrar únicamente las 10 más recientes
    activity = activity[:10]

    # ------------------------------------------
    # Respuesta
    # ------------------------------------------

    return {
        "ca": {
            "initialized": ca_initialized,
            "algorithm": (
                "ECDSA P-256 / SHA-256"
                if ca_initialized
                else None
            ),
        },

        "csr": {
            "pending": pending_csr or 0,
            "issued": issued_csr or 0,
        },

        "certificates": {
            "issued": issued_certificates or 0,
        },

        "fragments": {
            "total": fragments or 0,
        },

        "activity": activity,
    }