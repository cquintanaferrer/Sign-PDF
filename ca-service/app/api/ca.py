from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.authorization import require_ca_admin
from app.core.database import get_db
from app.core.security import verify_password
from app.crypto.algorithm_registry import ECDSA_PROFILE, normalize_profile
from app.models.ca_fragment import CAFragment
from app.models.ca_requests import ReconstructCARequest
from app.services.ca_bootstrap_service import bootstrap_ca
from app.services.ca_rotation_service import rotate_ca
from app.services.ca_service import get_ca
from app.services.fragment_service import FragmentInput, reconstruct_ca_secret
from app.services.user_service import get_user_by_username

router = APIRouter(
    prefix="/api/ca",
    tags=["Certificate Authority"],
)


class FragmentDownloadRequest(BaseModel):
    password: str


@router.get("/status")
def get_ca_status(
    algorithm: str = Query(ECDSA_PROFILE),
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    try:
        profile = normalize_profile(algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ca = get_ca(db, algorithm=profile)

    if not ca:
        return {
            "initialized": False,
            "profile": profile,
            "rootCertificate": None,
        }

    return {
        "initialized": ca.initialized,
        "profile": profile,
        "rootCertificate": {
            "serialNumber": ca.serial_number,
            "fingerprint": ca.fingerprint,
            "algorithm": ca.algorithm,
            "issuedAt": ca.issued_at,
            "expiresAt": ca.expires_at,
        },
    }


@router.get("/certificate")
def get_ca_certificate(
    algorithm: str = Query(ECDSA_PROFILE),
    db: Session = Depends(get_db),
):
    try:
        profile = normalize_profile(algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ca = get_ca(db, algorithm=profile)

    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=404,
            detail=f"La Autoridad Certificadora {profile} no está inicializada.",
        )

    return {
        "profile": profile,
        "certificate": ca.root_certificate,
        "serialNumber": ca.serial_number,
        "fingerprint": ca.fingerprint,
        "algorithm": ca.algorithm,
        "issuedAt": ca.issued_at,
        "expiresAt": ca.expires_at,
    }


@router.get("/public-key")
def get_ca_public_key(
    algorithm: str = Query(ECDSA_PROFILE),
    db: Session = Depends(get_db),
):
    try:
        profile = normalize_profile(algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ca = get_ca(db, algorithm=profile)

    if ca is None or not ca.initialized:
        raise HTTPException(
            status_code=404,
            detail=f"La Autoridad Certificadora {profile} no está inicializada.",
        )

    return {
        "profile": profile,
        "publicKey": ca.public_key,
        "algorithm": ca.algorithm,
    }


@router.post("/bootstrap")
def bootstrap(
    algorithm: str = Query(ECDSA_PROFILE),
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    try:
        profile = normalize_profile(algorithm)
        return bootstrap_ca(db, algorithm=profile)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


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
    """
    Rotación existente: por ahora permanece limitada a la raíz ECDSA.
    La rotación ML-DSA debe implementarse como una tarea separada para no
    mezclar cadenas ni cross-signing accidentalmente.
    """
    if fragment_4 is not None and password_4 is None:
        raise HTTPException(status_code=400, detail="El cuarto fragmento requiere su contraseña.")

    fragment_files = [
        (fragment_1, password_1),
        (fragment_2, password_2),
        (fragment_3, password_3),
    ]

    if fragment_4 is not None:
        fragment_files.append((fragment_4, password_4))

    fragments: list[FragmentInput] = []

    for upload, password in fragment_files:
        content = await upload.read()
        if not content:
            raise HTTPException(status_code=400, detail=f"El archivo {upload.filename} está vacío.")

        fragments.append(
            FragmentInput(
                encrypted_content=content,
                password=password,
            )
        )

    try:
        return rotate_ca(db=db, fragments=fragments)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/fragments/{fragment_id}/download")
def download_fragment(
    fragment_id: int,
    data: FragmentDownloadRequest,
    algorithm: str = Query(ECDSA_PROFILE),
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    if fragment_id not in (1, 2, 3, 4):
        raise HTTPException(status_code=404, detail="Fragmento no encontrado.")

    try:
        profile = normalize_profile(algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ca = get_ca(db, algorithm=profile)

    if ca is None or not ca.initialized:
        raise HTTPException(status_code=404, detail=f"La CA {profile} no está inicializada.")

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
        raise HTTPException(status_code=404, detail="Fragmento no encontrado o ya fue descargado.")

    user = get_user_by_username(db, fragment.owner_username)

    if user is None:
        raise HTTPException(status_code=404, detail="Custodio no encontrado.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="El custodio está desactivado.")
    if user.role != "CA_CUSTODIAN":
        raise HTTPException(status_code=403, detail="El usuario no es un custodio.")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    encrypted_content = fragment.encrypted_content
    current_fragment_id = fragment.fragment_id

    prefix = "ecdsa_p256" if profile == ECDSA_PROFILE else "mldsa65"
    filename = f"{prefix}_fragment_{current_fragment_id}.sss"

    db.delete(fragment)
    db.commit()

    return {
        "profile": profile,
        "fragmentId": current_fragment_id,
        "filename": filename,
        "content": encrypted_content,
    }


@router.post("/reconstruct")
def reconstruct_ca(
    request: ReconstructCARequest,
    algorithm: str = Query(ECDSA_PROFILE),
    db: Session = Depends(get_db),
    admin=Depends(require_ca_admin),
):
    try:
        profile = normalize_profile(algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ca = get_ca(db, algorithm=profile)

    if ca is None or not ca.initialized:
        raise HTTPException(status_code=404, detail=f"La CA {profile} no está inicializada.")

    fragments = [
        FragmentInput(
            encrypted_content=fragment.content.encode("utf-8"),
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
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "message": "Secreto reconstruido correctamente.",
        "profile": profile,
        "length": len(secret),
    }
