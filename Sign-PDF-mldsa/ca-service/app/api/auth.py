from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    verify_password,
)

from app.services.user_service import (
    get_user_by_id,
    get_user_by_username,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = get_user_by_username(
        db,
        data.username,
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Usuario desactivado",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos",
        )

    token = create_access_token(
        subject=str(user.id),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/profile")
def get_profile(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_user_by_id(
        db,
        current_user,
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado",
        )

    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
    }