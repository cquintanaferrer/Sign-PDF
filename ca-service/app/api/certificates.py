from datetime import datetime, timezone
from uuid import UUID

from cryptography.hazmat.primitives import serialization
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.core.authorization import require_ca_admin
from app.core.database import get_db
from app.models.ca import CertificateAuthority
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate
from app.models.certificate import IssuedCertificateResponse
from app.services.certificate_service import (
    issue_certificate,
)
from app.services.fragment_service import (
    FragmentInput,
)

router = APIRouter(
    prefix="/api/ca/certificates",
    tags=["Certificates"],
)


@router.post(
    "/sign",
    response_model=IssuedCertificateResponse,
)
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
    # ------------------------------------------
    # 1. Buscar CA
    # ------------------------------------------

    ca = (
        db.query(CertificateAuthority)
        .filter(
            CertificateAuthority.initialized.is_(True)
        )
        .first()
    )

    if ca is None:
        raise HTTPException(
            status_code=404,
            detail="La Autoridad Certificadora no está inicializada.",
        )

    # ------------------------------------------
    # 2. Buscar CSR pendiente
    # ------------------------------------------

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

    # ------------------------------------------
    # 3. Preparar fragmentos
    # ------------------------------------------

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

        fragment_files.append(
            (fragment_4, password_4)
        )

    fragments: list[FragmentInput] = []

    for fragment_file, password in fragment_files:
        content = await fragment_file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uno de los fragmentos está vacío.",
            )

        fragments.append(
            FragmentInput(
                encrypted_content=content,
                password=password,
            )
        )

    # ------------------------------------------
    # 4. Firmar CSR
    # ------------------------------------------

    try:
        certificate = issue_certificate(
            csr_pem=request.csr_pem.encode("utf-8"),
            fragments=fragments,
            ca=ca,
        )

        # --------------------------------------
        # 5. Convertir certificado a PEM
        # --------------------------------------

        certificate_pem = certificate.public_bytes(
            serialization.Encoding.PEM
        ).decode("utf-8")

        # --------------------------------------
        # 6. Guardar certificado emitido
        # --------------------------------------

        issued_certificate = IssuedCertificate(
            csr_id=request.id,
            serial_number=str(
                certificate.serial_number
            ),

            certificate_pem=certificate_pem,

            subject=certificate.subject.rfc4514_string(),

            issuer=certificate.issuer.rfc4514_string(),

            algorithm="ECDSA P-256 / SHA-256",

            issued_at=certificate.not_valid_before_utc,

            expires_at=certificate.not_valid_after_utc,

            ca_id=ca.id,
        )

        db.add(issued_certificate)

        # --------------------------------------
        # 7. Marcar CSR como emitida
        # --------------------------------------

        request.status = "ISSUED"

        request.processed_at = datetime.now(
            timezone.utc
        )

        db.commit()

        db.refresh(issued_certificate)

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible emitir el certificado.",
        ) from exc

    # ------------------------------------------
    # 8. Respuesta al frontend
    # ------------------------------------------

    return IssuedCertificateResponse(
        certificate=certificate_pem,

        serial_number=str(
            certificate.serial_number
        ),

        subject=certificate.subject.rfc4514_string(),

        issuer=certificate.issuer.rfc4514_string(),

        algorithm="ECDSA P-256 / SHA-256",

        not_valid_before=(
            certificate.not_valid_before_utc.isoformat()
        ),

        not_valid_after=(
            certificate.not_valid_after_utc.isoformat()
        ),
    )