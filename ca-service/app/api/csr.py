from datetime import datetime, timezone
from uuid import UUID
import hashlib

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.authorization import require_ca_admin
from app.core.database import get_db
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate

router = APIRouter(
    prefix="/csr",
    tags=["CSR"],
)


@router.post("")
async def create_csr(
    csr: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    csr_data = await csr.read()

    if not csr_data:
        raise HTTPException(
            status_code=400,
            detail="La CSR está vacía.",
        )

    try:
        csr_obj = x509.load_pem_x509_csr(
            csr_data
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="La CSR no es válida.",
        ) from exc

    public_key = csr_obj.public_key()

    if public_key.curve.name != "secp256r1":
        raise HTTPException(
            status_code=400,
            detail="La CSR debe utilizar ECDSA P-256.",
        )

    public_key_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    public_key_fingerprint = hashlib.sha256(
        public_key_der
    ).hexdigest()

    existing_request = (
        db.query(CertificateSigningRequest)
        .filter(
            CertificateSigningRequest.public_key_fingerprint
            == public_key_fingerprint
        )
        .first()
    )

    if existing_request is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una solicitud o certificado "
                "asociado a esta clave pública."
            ),
        )

    pem = csr_obj.public_bytes(
        serialization.Encoding.PEM
    ).decode("utf-8")

    subject = csr_obj.subject.rfc4514_string()

    request = CertificateSigningRequest(
        requester_username=subject,
        csr_pem=pem,
        public_key_fingerprint=public_key_fingerprint,
        algorithm="ECDSA P-256 / SHA-256",
        status="PENDING",
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "id": str(request.id),
        "status": request.status,
        "requester_username": request.requester_username,
        "algorithm": request.algorithm,
        "created_at": request.created_at,
    }


@router.get("/pending")
def get_pending_csrs(
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    """
    Devuelve las CSR pendientes para el frontend
    administrativo de la CA.
    """

    requests = (
        db.query(CertificateSigningRequest)
        .filter(
            CertificateSigningRequest.status == "PENDING"
        )
        .order_by(
            CertificateSigningRequest.created_at.asc()
        )
        .all()
    )

    return [
        {
            "id": str(request.id),
            "username": request.requester_username,
            "algorithm": request.algorithm,
            "status": request.status,
            "created_at": request.created_at,
        }
        for request in requests
    ]


@router.get("/{request_id}")
def get_csr(
    request_id: UUID,
    db: Session = Depends(get_db),
):
    request = (
        db.query(CertificateSigningRequest)
        .filter(
            CertificateSigningRequest.id == request_id
        )
        .first()
    )

    if request is None:
        raise HTTPException(
            status_code=404,
            detail="Solicitud CSR no encontrada.",
        )

    response = {
        "id": str(request.id),
        "status": request.status,
        "requester_username": request.requester_username,
        "algorithm": request.algorithm,
        "created_at": request.created_at,
        "processed_at": request.processed_at,
    }

    # ------------------------------------------
    # CSR ya firmada
    # ------------------------------------------

    if request.status == "ISSUED":

        certificate = (
            db.query(IssuedCertificate)
            .filter(
                IssuedCertificate.csr_id == request.id
            )
            .first()
        )

        if certificate:
            response.update({
                "certificate": certificate.certificate_pem,
                "serial_number": certificate.serial_number,
                "subject": certificate.subject,
                "issuer": certificate.issuer,
                "issued_at": certificate.issued_at,
                "expires_at": certificate.expires_at,
            })

    return response