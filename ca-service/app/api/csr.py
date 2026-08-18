from uuid import UUID
import hashlib

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.authorization import require_ca_admin
from app.core.database import get_db
from app.crypto.algorithm_registry import algorithm_label, detect_public_key_profile
from app.crypto.csr_identity import extract_csr_identity, extract_identity_from_pem
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
        raise HTTPException(status_code=400, detail="La CSR está vacía.")

    try:
        csr_obj = x509.load_pem_x509_csr(csr_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="La CSR no es válida.") from exc

    if not csr_obj.is_signature_valid:
        raise HTTPException(status_code=400, detail="La firma de la CSR no es válida.")

    public_key = csr_obj.public_key()

    try:
        profile = detect_public_key_profile(public_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    request_algorithm = algorithm_label(profile)

    public_key_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    public_key_fingerprint = hashlib.sha256(public_key_der).hexdigest()

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
                "Ya existe una solicitud o certificado asociado a esta clave pública."
            ),
        )

    pem = csr_obj.public_bytes(serialization.Encoding.PEM).decode("utf-8")
    subject = csr_obj.subject.rfc4514_string()
    username, email = extract_csr_identity(csr_obj)

    request = CertificateSigningRequest(
        # Se conserva el subject completo en la BD por compatibilidad/auditoría.
        requester_username=subject,
        csr_pem=pem,
        public_key_fingerprint=public_key_fingerprint,
        algorithm=request_algorithm,
        status="PENDING",
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "id": str(request.id),
        "status": request.status,
        "requester_username": request.requester_username,
        "username": username,
        "email": email,
        "algorithm": request.algorithm,
        "created_at": request.created_at,
    }


@router.get("/pending")
def get_pending_csrs(
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    requests = (
        db.query(CertificateSigningRequest)
        .filter(CertificateSigningRequest.status == "PENDING")
        .order_by(CertificateSigningRequest.created_at.asc())
        .all()
    )

    response = []
    for request in requests:
        username, email = extract_identity_from_pem(request.csr_pem)
        response.append(
            {
                "id": str(request.id),
                "username": username,
                "email": email,
                "algorithm": request.algorithm,
                "status": request.status,
                "created_at": request.created_at,
            }
        )

    return response


@router.get("/{request_id}")
def get_csr(
    request_id: UUID,
    db: Session = Depends(get_db),
):
    request = (
        db.query(CertificateSigningRequest)
        .filter(CertificateSigningRequest.id == request_id)
        .first()
    )

    if request is None:
        raise HTTPException(status_code=404, detail="Solicitud CSR no encontrada.")

    username, email = extract_identity_from_pem(request.csr_pem)

    response = {
        "id": str(request.id),
        "status": request.status,
        "requester_username": request.requester_username,
        "username": username,
        "email": email,
        "algorithm": request.algorithm,
        "created_at": request.created_at,
        "processed_at": request.processed_at,
    }

    if request.status == "ISSUED":
        certificate = (
            db.query(IssuedCertificate)
            .filter(IssuedCertificate.csr_id == request.id)
            .first()
        )

        if certificate:
            response.update(
                {
                    "certificate": certificate.certificate_pem,
                    "serial_number": certificate.serial_number,
                    "subject": certificate.subject,
                    "issuer": certificate.issuer,
                    "issued_at": certificate.issued_at,
                    "expires_at": certificate.expires_at,
                }
            )

    return response
