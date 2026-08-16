from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.services.ca_bootstrap_service import bootstrap_ca
from app.core.database import get_db
from app.core.authorization import require_ca_admin
from app.services.ca_service import get_ca

from app.models.ca_fragment import CAFragment
from app.services.user_service import get_user_by_username
from app.core.security import verify_password

from app.models.ca_requests import ReconstructCARequest
from app.services.fragment_service import (
    FragmentInput,
    reconstruct_ca_secret,
)
from app.services.ca_rotation_service import (
    rotate_ca,
)

router = APIRouter(
    prefix="/api/ca",
    tags=["Certificate Authority"],
)

class FragmentDownloadRequest(BaseModel):
    password: str
class RotateCARequest(BaseModel):
    fragments: list[FragmentInput]

@router.get("/status")
def get_ca_status(
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    ca = get_ca(db)

    if not ca:
        return {
            "initialized": False,
            "rootCertificate": None,
        }

    return {
        "initialized": ca.initialized,
        "rootCertificate": (
            {
                "serialNumber": ca.serial_number,
                "fingerprint": ca.fingerprint,
                "algorithm": ca.algorithm,
                "issuedAt": ca.issued_at,
                "expiresAt": ca.expires_at,
            }
            if ca.initialized
            else None
        ),
    }

@router.get("/certificate")
def get_ca_certificate(
    db: Session = Depends(get_db),
):
    ca = get_ca(db)

    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=404,
            detail="La Autoridad Certificadora no está inicializada.",
        )

    return {
        "certificate": ca.root_certificate,
        "serialNumber": ca.serial_number,
        "fingerprint": ca.fingerprint,
        "algorithm": ca.algorithm,
        "issuedAt": ca.issued_at,
        "expiresAt": ca.expires_at,
    }


@router.get("/public-key")
def get_ca_public_key(
    db: Session = Depends(get_db),
):
    ca = get_ca(db)

    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=404,
            detail="La Autoridad Certificadora no está inicializada.",
        )

    return {
        "publicKey": ca.public_key,
        "algorithm": "EC P-256",
    }

@router.post("/bootstrap")
def bootstrap(
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    try:
        return bootstrap_ca(db)

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        )


@router.post("/rotate")
async def rotate(
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
    # ---------------------------------------------
    # 1. El cuarto fragmento requiere contraseña
    # ---------------------------------------------

    if fragment_4 is not None and password_4 is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "El cuarto fragmento requiere "
                "su contraseña."
            ),
        )

    # ---------------------------------------------
    # 2. Leer fragmentos
    # ---------------------------------------------

    fragment_files = [
        (fragment_1, password_1),
        (fragment_2, password_2),
        (fragment_3, password_3),
    ]

    if fragment_4 is not None:
        fragment_files.append(
            (fragment_4, password_4)
        )

    fragments: list[FragmentInput] = []

    for upload, password in fragment_files:

        content = await upload.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"El archivo "
                    f"{upload.filename} está vacío."
                ),
            )

        fragments.append(
            FragmentInput(
                encrypted_content=content,
                password=password,
            )
        )

    # ---------------------------------------------
    # 3. Ejecutar rotación
    # ---------------------------------------------

    try:
        return rotate_ca(
            db=db,
            fragments=fragments,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.post("/fragments/{fragment_id}/download")
def download_fragment(
    fragment_id: int,
    data: FragmentDownloadRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    if fragment_id not in (1, 2, 3, 4):
        raise HTTPException(
            status_code=404,
            detail="Fragmento no encontrado.",
        )

    ca = get_ca(db)
    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=404,
            detail=(
                "La Autoridad Certificadora "
                "no está inicializada."
            ),
        )

    statement = (
        select(CAFragment)
        .where(
            CAFragment.ca_id == ca.id,
            CAFragment.fragment_id == fragment_id,
        )
        .with_for_update()
    )
    
    fragment = db.scalar(statement)

    if fragment is None:
        raise HTTPException(
            status_code=404,
            detail="Fragmento no encontrado o ya fue descargado.",
        )

    user = get_user_by_username(
        db,
        fragment.owner_username,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Custodio no encontrado.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="El custodio está desactivado.",
        )

    if user.role != "CA_CUSTODIAN":
        raise HTTPException(
            status_code=403,
            detail="El usuario no es un custodio.",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Contraseña incorrecta.",
        )

    # Guardamos el contenido antes de eliminar
    encrypted_content = fragment.encrypted_content
    current_fragment_id = fragment.fragment_id

    filename = (
        f"fragment_{current_fragment_id}.sss"
    )

    # Eliminación definitiva
    db.delete(fragment)

    db.commit()

    return {
        "fragmentId": current_fragment_id,
        "filename": filename,
        "content": encrypted_content,
    }

@router.post("/reconstruct")
def reconstruct_ca(
    request: ReconstructCARequest,
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    ca = get_ca(db)

    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=404,
            detail=(
                "La Autoridad Certificadora "
                "no está inicializada."
            ),
        )

    fragments = [
        FragmentInput(
            encrypted_content=fragment.content.encode(
                "utf-8"
            ),
            password=fragment.password,
        )
        for fragment in request.fragments
    ]

    try:
        secret = reconstruct_ca_secret(
            fragments=fragments,
            expected_hash=ca.private_key_hash,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return {
        "message": (
            "Secreto reconstruido correctamente."
        ),
        "length": len(secret),
    }