import asyncio

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from dependencies import get_current_user

from services.pdf_signing_service import (
    PDFSigningError,
    sign_pdf,
)
from services.pdf_certificate_service import (
    extract_signing_certificate,
)

from services.ca_client import (
    verify_certificate_with_ca,
)

router = APIRouter(
    prefix="/api/signatures",
    tags=["Signatures"],
)


@router.post("/sign-pdf")
async def sign_pdf_endpoint(
    pdf: UploadFile = File(...),
    private_key: UploadFile = File(...),
    certificate: UploadFile = File(...),
    password: str | None = Form(default=None),
    current_user=Depends(get_current_user),
):
    """
    Firma digitalmente un PDF utilizando ECDSA P-256 / SHA-256.
    """

    pdf_data = await pdf.read()
    private_key_data = await private_key.read()
    certificate_data = await certificate.read()

    try:
        signed_pdf = await asyncio.to_thread(
            sign_pdf,
            pdf_data=pdf_data,
            private_key_data=private_key_data,
            certificate_data=certificate_data,
            password=password,
            user_name=current_user.email,
        )
    except PDFSigningError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return Response(
        content=signed_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                'attachment; filename="signed-document.pdf"'
            )
        },
    )
@router.post(
    "/verify-pdf-certificate"
)
async def verify_pdf_certificate(
    pdf: UploadFile = File(...),
    current_user=Depends(get_current_user),
):

    if pdf.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser un PDF.",
        )

    try:

        pdf_bytes = await pdf.read()

        if not pdf_bytes:
            raise ValueError(
                "El PDF está vacío."
            )

        certificate_pem = (
            extract_signing_certificate(
                pdf_bytes
            )
        )

        result = (
            await verify_certificate_with_ca(
                certificate_pem
            )
        )

        return {
            "success": True,
            "certificate": result,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=(
                "No fue posible validar "
                "el certificado del PDF: "
                f"{exc}"
            ),
        ) from exc