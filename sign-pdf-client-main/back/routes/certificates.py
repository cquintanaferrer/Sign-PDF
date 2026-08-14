from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from dependencies import get_db, get_current_user

import uuid
import random

router = APIRouter()

@router.get("/script", response_model=schemas.ScriptResponse)
def get_script_url():
    # Opción B implementada: Devolvemos la URL donde estará el script.
    return {"script_url": "http://localhost:8443/demo-script.js"}

@router.post("/sign", response_model=schemas.CertificateResponse)
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

@router.get("/{cert_id}/status", response_model=schemas.CertificateResponse)
def get_certificate_status(
    cert_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id, models.Certificate.user_id == current_user.id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    
    if cert.status == "PENDING":
        # Simular que el administrador lo aprueba después de unas cuantas llamadas de polling
        if random.random() > 0.7:
            cert.status = "ISSUED"
            cert.signed_certificate = "-----BEGIN CERTIFICATE-----\nMIID...[SIMULACION APROBADA]...\n-----END CERTIFICATE-----"
            db.commit()
            db.refresh(cert)
            
    return cert

@router.get("/me", response_model=list[schemas.CertificateResponse])
def get_my_certificates(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return current_user.certificates
