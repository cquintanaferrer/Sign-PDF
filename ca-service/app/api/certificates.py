from datetime import datetime, timezone
from uuid import UUID

from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.authorization import require_ca_admin
from app.core.database import get_db
from app.crypto.algorithm_registry import profile_from_algorithm_label
from app.models.certificate import IssuedCertificateResponse
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate
from app.services.ca_service import get_ca
from app.services.certificate_service import issue_certificate
from app.services.certificate_verification_service import verify_certificate
from app.services.fragment_service import FragmentInput

router = APIRouter(
    prefix="/api/ca/certificates",
    tags=["Certificates"],
)


@router.get("")
def get_certificates(
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    certificates = (
        db.query(IssuedCertificate)
        .order_by(IssuedCertificate.issued_at.desc())
        .all()
    )

    return [
        {
            "id": str(certificate.id),
            "serial_number": certificate.serial_number,
            "subject": certificate.subject,
            "issuer": certificate.issuer,
            "algorithm": certificate.algorithm,
            "issued_at": certificate.issued_at,
            "expires_at": certificate.expires_at,
            "status": getattr(certificate, "status", "ISSUED"),
        }
        for certificate in certificates
    ]


@router.post("/sign", response_model=IssuedCertificateResponse)
async def sign_certificate(
    csr_id: UUID = Form(...),
    fragment_1: UploadFile = File(...),
    password_1: str = Form(...),
    fragment_2: UploadFile = File(...),
    password_2: str = Form(...),
    fragment_3: UploadFile = File(...),
    password_3: str = Form(...),
    fragment_4: UploadFile | None = File(None),
    password_4: str | None = Form(None),
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    # Primero obtenemos la CSR: ella determina qué raíz debe usarse.
    request = (
        db.query(CertificateSigningRequest)
        .filter(
            CertificateSigningRequest.id == csr_id,
            CertificateSigningRequest.status == "PENDING",
        )
        .first()
    )

    if request is None:
        raise HTTPException(
            status_code=404,
            detail="La solicitud CSR no existe o ya fue procesada.",
        )

    try:
        profile = profile_from_algorithm_label(request.algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ca = get_ca(db, algorithm=profile)

    if ca is None:
        raise HTTPException(
            status_code=409,
            detail=(
                f"No existe una raíz activa para {request.algorithm}. "
                "Inicialícela antes de firmar esta CSR."
            ),
        )

    fragment_files = [
        (fragment_1, password_1),
        (fragment_2, password_2),
        (fragment_3, password_3),
    ]

    if fragment_4 is not None:
        if password_4 is None:
            raise HTTPException(
                status_code=400,
                detail="El cuarto fragmento requiere su contraseña.",
            )
        fragment_files.append((fragment_4, password_4))

    fragments: list[FragmentInput] = []

    for fragment_file, password in fragment_files:
        content = await fragment_file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uno de los fragmentos está vacío.")

        fragments.append(
            FragmentInput(
                encrypted_content=content,
                password=password,
            )
        )

    try:
        certificate = issue_certificate(
            csr_pem=request.csr_pem.encode("utf-8"),
            fragments=fragments,
            ca=ca,
        )

        certificate_pem = certificate.public_bytes(
            serialization.Encoding.PEM
        ).decode("utf-8")

        issued_certificate = IssuedCertificate(
            csr_id=request.id,
            serial_number=str(certificate.serial_number),
            certificate_pem=certificate_pem,
            subject=certificate.subject.rfc4514_string(),
            issuer=certificate.issuer.rfc4514_string(),
            algorithm=request.algorithm,
            issued_at=certificate.not_valid_before_utc,
            expires_at=certificate.not_valid_after_utc,
            ca_id=ca.id,
        )

        db.add(issued_certificate)
        request.status = "ISSUED"
        request.processed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(issued_certificate)

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No fue posible emitir el certificado.",
        ) from exc

    return IssuedCertificateResponse(
        certificate=certificate_pem,
        serial_number=str(certificate.serial_number),
        subject=certificate.subject.rfc4514_string(),
        issuer=certificate.issuer.rfc4514_string(),
        algorithm=request.algorithm,
        not_valid_before=certificate.not_valid_before_utc.isoformat(),
        not_valid_after=certificate.not_valid_after_utc.isoformat(),
    )


@router.post("/verify")
async def verify_certificate_endpoint(
    certificate: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    certificate_data = await certificate.read()

    if not certificate_data:
        raise HTTPException(status_code=400, detail="El certificado está vacío.")

    try:
        return verify_certificate(certificate_pem=certificate_data, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{serial_number}/revoke")
def revoke_certificate(
    serial_number: str,
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    certificate = (
        db.query(IssuedCertificate)
        .filter(IssuedCertificate.serial_number == serial_number)
        .first()
    )

    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificado no encontrado.")

    if certificate.status == "REVOKED":
        raise HTTPException(status_code=409, detail="El certificado ya está revocado.")

    certificate.status = "REVOKED"
    certificate.revoked_at = datetime.now(timezone.utc)
    certificate.revocation_reason = "Revocado por el administrador de la CA."

    db.commit()
    db.refresh(certificate)

    return {
        "id": str(certificate.id),
        "serial_number": certificate.serial_number,
        "status": certificate.status,
        "revoked_at": certificate.revoked_at,
        "revocation_reason": certificate.revocation_reason,
    }
