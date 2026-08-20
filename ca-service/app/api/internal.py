from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crypto.csr_identity import extract_identity_from_pem
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.get("/certificate-requests")
def get_certificate_requests_for_user(
    email: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
):
    """
    Endpoint interno para el backend del cliente.

    Devuelve las solicitudes CSR cuyo correo del subject coincide con el
    usuario autenticado del cliente. No se publica a través del proxy /api/ de
    Nginx; el backend de cliente lo consulta dentro de la red Docker.
    """
    target_email = email.strip().lower()

    requests = (
        db.query(CertificateSigningRequest)
        .order_by(CertificateSigningRequest.created_at.desc())
        .all()
    )

    result = []
    for request in requests:
        username, request_email = extract_identity_from_pem(request.csr_pem)
        if not request_email or request_email.strip().lower() != target_email:
            continue

        entry = {
            "id": str(request.id),
            "status": request.status,
            "requester_username": request.requester_username,
            "username": username,
            "email": request_email,
            "algorithm": request.algorithm,
            "created_at": request.created_at,
            "processed_at": request.processed_at,
        }

        certificate = (
            db.query(IssuedCertificate)
            .filter(IssuedCertificate.csr_id == request.id)
            .first()
        )
        if certificate is not None:
            entry.update(
                {
                    "certificate": certificate.certificate_pem,
                    "serial_number": certificate.serial_number,
                    "subject": certificate.subject,
                    "issuer": certificate.issuer,
                    "issued_at": certificate.issued_at,
                    "expires_at": certificate.expires_at,
                    "certificate_status": certificate.status,
                    "revoked_at": certificate.revoked_at,
                    "revocation_reason": certificate.revocation_reason,
                }
            )

        result.append(entry)

    return result
