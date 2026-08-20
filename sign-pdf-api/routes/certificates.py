from fastapi import APIRouter, Depends, HTTPException
import tempfile
from pathlib import Path

import models
import schemas
from dependencies import get_current_user
from services.ca_client import get_certificate_requests_for_user
from services.ca_verification_service import verify_certificate_chain
from services.certificate_chain_service import download_certificate_chain

router = APIRouter()


@router.get("/me", response_model=list[schemas.CertificateResponse])
def get_my_certificates(
    current_user: models.User = Depends(get_current_user),
):
    """Conserva la consulta de registros locales asociados al usuario."""
    return current_user.certificates


@router.get("/ca-records")
async def get_my_ca_certificate_records(
    current_user: models.User = Depends(get_current_user),
):
    """
    Devuelve el estado actual de todas las CSR/certificados del usuario en la CA.

    La identidad se resuelve usando el correo del usuario autenticado; el
    navegador no necesita conservar manualmente los request_id.
    """
    try:
        return await get_certificate_requests_for_user(current_user.email)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/verify-external")
async def verify_external_certificate(hostname: str):
    """Verifica una cadena X.509 externa mediante SignPDF CA."""
    if not hostname:
        raise HTTPException(status_code=400, detail="El hostname es obligatorio.")

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            pem_path = Path(temp_dir) / "chain.pem"
            await download_certificate_chain(
                hostname=hostname,
                output_path=str(pem_path),
            )
            return await verify_certificate_chain(
                pem_path=str(pem_path),
                hostname=hostname,
            )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"No fue posible verificar el certificado con SignPDF CA: {exc}",
        ) from exc
