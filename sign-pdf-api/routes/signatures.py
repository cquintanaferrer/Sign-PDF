from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from dependencies import get_current_user
from services.ca_client import verify_certificate_with_ca
from services.pdf_certificate_service import (
    extract_signing_certificate,
    validate_pdf_cryptographic_signature,
)
from services.pdf_signing_service import (
    PDFSigningError,
    finalize_pdf_signature,
    prepare_pdf_signature,
)

router = APIRouter(
    prefix="/api/signatures",
    tags=["Signatures"],
)


class FinalizePdfRequest(BaseModel):
    operation_id: str
    signature_b64: str


@router.post("/prepare-pdf")
async def prepare_pdf_endpoint(
    pdf: UploadFile = File(...),
    certificate: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Prepara una firma PDF ECDSA o ML-DSA.

    La clave privada NO forma parte de esta petición. pyHanko devuelve los
    SignedAttributes CMS que el navegador debe firmar localmente.
    """
    pdf_filename = pdf.filename or ""
    if pdf.content_type not in (None, "application/pdf") and not pdf_filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")

    pdf_data = await pdf.read()
    certificate_data = await certificate.read()

    try:
        ca_result = await verify_certificate_with_ca(certificate_data)
        if not ca_result.get("valid"):
            raise PDFSigningError(
                "El certificado no es válido, está revocado o no fue emitido por SignPDF CA."
            )

        return await prepare_pdf_signature(
            pdf_data=pdf_data,
            certificate_data=certificate_data,
            user_name=current_user.name or current_user.email,
            owner_email=current_user.email,
        )
    except PDFSigningError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/finalize-pdf")
async def finalize_pdf_endpoint(
    request: FinalizePdfRequest,
    current_user=Depends(get_current_user),
):
    """Finaliza el CMS/PDF con la firma generada localmente en el navegador."""
    try:
        signed_pdf = await finalize_pdf_signature(
            operation_id=request.operation_id,
            signature_b64=request.signature_b64,
            owner_email=current_user.email,
        )
    except PDFSigningError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(
        content=signed_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="signed-document.pdf"'
        },
    )


@router.post("/verify-pdf")
@router.post("/verify-pdf-certificate")
async def verify_pdf_endpoint(
    pdf: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Verifica el PDF completo para ECDSA o ML-DSA:
    1. firma CMS/ByteRange e integridad con pyHanko;
    2. certificado, confianza, vigencia y revocación con SignPDF CA.
    """
    del current_user

    pdf_filename = pdf.filename or ""
    if pdf.content_type not in (None, "application/pdf") and not pdf_filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")

    try:
        pdf_bytes = await pdf.read()
        if not pdf_bytes:
            raise ValueError("El PDF está vacío.")

        pdf_validation = await validate_pdf_cryptographic_signature(pdf_bytes)
        certificate_pem = extract_signing_certificate(pdf_bytes)
        certificate_validation = await verify_certificate_with_ca(certificate_pem)

        overall_valid = (
            pdf_validation["intact"]
            and pdf_validation["signature_valid"]
            and bool(certificate_validation.get("valid"))
        )

        return {
            "success": True,
            "valid": overall_valid,
            "pdf_signature": pdf_validation,
            "certificate": certificate_validation,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"No fue posible validar el PDF firmado: {exc}",
        ) from exc
