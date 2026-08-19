from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas

from dependencies import get_db, get_current_user

import uuid
import random
import tempfile
from pathlib import Path

from services.ca_verification_service import (
    verify_certificate_chain,
)

from services.certificate_chain_service import (
    download_certificate_chain,
)


router = APIRouter()


@router.get(
    "/script",
    response_model=schemas.ScriptResponse
)
def get_script_url():
    # Opción B implementada:
    # Devolvemos la URL donde estará el script.
    return {
        "script_url": "http://localhost:8443/demo-script.js"
    }


@router.post(
    "/sign",
    response_model=schemas.CertificateResponse
)
def sign_certificate(
    cert_data: schemas.CertificateCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Simulamos el envío a la CA real y obtenemos un request_id
    req_id = str(uuid.uuid4())

    new_cert = models.Certificate(
        user_id=current_user.id,
        request_id=req_id,
        csr=cert_data.csr,
        status="PENDING"
    )

    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)

    return new_cert


@router.get(
    "/{cert_id}/status",
    response_model=schemas.CertificateResponse
)
def get_certificate_status(
    cert_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cert = (
        db.query(models.Certificate)
        .filter(
            models.Certificate.id == cert_id,
            models.Certificate.user_id == current_user.id
        )
        .first()
    )

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="Certificado no encontrado"
        )

    if cert.status == "PENDING":

        # Simular que el administrador lo aprueba
        # después de unas cuantas llamadas de polling.
        if random.random() > 0.7:

            cert.status = "ISSUED"

            cert.signed_certificate = (
                "-----BEGIN CERTIFICATE-----\n"
                "MIID...[SIMULACION APROBADA]...\n"
                "-----END CERTIFICATE-----"
            )

            db.commit()
            db.refresh(cert)

    return cert


@router.get(
    "/me",
    response_model=list[schemas.CertificateResponse]
)
def get_my_certificates(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return current_user.certificates


# ============================================================
# VERIFICACIÓN DE CERTIFICADOS EXTERNOS
# ============================================================

@router.post("/verify-external")
async def verify_external_certificate(
    hostname: str,
):
    """
    Obtiene temporalmente la cadena de certificados del servidor
    indicado y solicita al SignPDF CA Service que valide la cadena
    de confianza.

    El archivo PEM solamente existe durante la ejecución de esta
    petición y se elimina automáticamente al finalizar.
    """

    if not hostname:
        raise HTTPException(
            status_code=400,
            detail="El hostname es obligatorio."
        )

    try:

        with tempfile.TemporaryDirectory() as temp_dir:

            pem_path = Path(temp_dir) / "chain.pem"

            # --------------------------------------------------
            # 1. Descargar temporalmente la cadena
            # --------------------------------------------------

            await download_certificate_chain(
                hostname=hostname,
                output_path=str(pem_path),
            )

            # --------------------------------------------------
            # 2. Enviar la cadena al SignPDF CA Service
            # --------------------------------------------------

            result = await verify_certificate_chain(
                pem_path=str(pem_path),
                hostname=hostname,
            )

            # --------------------------------------------------
            # 3. Devolver exactamente el resultado de la CA
            # --------------------------------------------------

            return result

    except FileNotFoundError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=502,
            detail=(
                "No fue posible verificar el certificado "
                f"con SignPDF CA: {str(exc)}"
            ),
        ) from exc