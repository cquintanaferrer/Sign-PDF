from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from sqlalchemy.orm import Session

from cryptography.hazmat.primitives import serialization

from app.core.database import get_db

from app.models.certificate import IssuedCertificateResponse

from app.services.ca_service import get_ca

from app.services.certificate_service import (
    issue_certificate,
)

from app.services.fragment_service import (
    FragmentInput,
)


router = APIRouter(
    prefix="/api/ca/certificates",
    tags=["CA Certificates"],
)


@router.post(
    "/sign",
    response_model=IssuedCertificateResponse,
)
async def sign_certificate(

    csr: UploadFile = File(...),

    fragment_1: UploadFile = File(...),
    password_1: str = Form(...),

    fragment_2: UploadFile = File(...),
    password_2: str = Form(...),

    fragment_3: UploadFile = File(...),
    password_3: str = Form(...),

    fragment_4: UploadFile | None = File(None),
    password_4: str | None = Form(None),

    db: Session = Depends(get_db),
):

    # ----------------------------------------------
    # 1. Validar cuarto fragmento
    # ----------------------------------------------

    if fragment_4 is not None and not password_4:
        raise HTTPException(
            status_code=400,
            detail=(
                "La contraseña del cuarto fragmento "
                "es obligatoria."
            ),
        )

    # ----------------------------------------------
    # 2. Obtener CA
    # ----------------------------------------------

    ca = get_ca(db)

    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=503,
            detail=(
                "La Autoridad Certificadora "
                "no está inicializada."
            ),
        )

    # ----------------------------------------------
    # 3. Leer CSR
    # ----------------------------------------------

    csr_data = await csr.read()

    # ----------------------------------------------
    # 4. Leer fragmentos
    # ----------------------------------------------

    fragments = [
        FragmentInput(
            encrypted_content=await fragment_1.read(),
            password=password_1,
        ),
        FragmentInput(
            encrypted_content=await fragment_2.read(),
            password=password_2,
        ),
        FragmentInput(
            encrypted_content=await fragment_3.read(),
            password=password_3,
        ),
    ]

    if fragment_4 is not None:
        fragments.append(
            FragmentInput(
                encrypted_content=await fragment_4.read(),
                password=password_4,
            )
        )

    # ----------------------------------------------
    # 5. Emitir certificado
    # ----------------------------------------------

    try:

        certificate = issue_certificate(
            csr_pem=csr_data,
            fragments=fragments,
            ca=ca,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # ----------------------------------------------
    # 6. Respuesta
    # ----------------------------------------------

    return IssuedCertificateResponse(

        certificate=certificate.public_bytes(
            serialization.Encoding.PEM
        ).decode("utf-8"),

        serial_number=str(
            certificate.serial_number
        ),

        subject=(
            certificate.subject
            .rfc4514_string()
        ),

        issuer=(
            certificate.issuer
            .rfc4514_string()
        ),

        algorithm="ECDSA P-256 / SHA-256",

        not_valid_before=(
            certificate
            .not_valid_before_utc
            .isoformat()
        ),

        not_valid_after=(
            certificate
            .not_valid_after_utc
            .isoformat()
        ),
    )