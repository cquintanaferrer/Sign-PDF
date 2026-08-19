import asyncio

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from dependencies import get_current_user

from services.pdf_signing_service import (
    PDFSigningError,
    sign_pdf,
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