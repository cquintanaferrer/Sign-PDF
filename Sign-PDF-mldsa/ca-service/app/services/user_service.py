from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User


def get_user_by_username(
    db: Session,
    username: str,
) -> User | None:

    statement = select(User).where(
        User.username == username
    )

    return db.scalar(statement)


def get_user_by_id(
    db: Session,
    user_id,
) -> User | None:

    return db.get(User, user_id)


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    role: str = "CA_ADMIN",
    fragment_id: int | None = None,
) -> User:

    existing_user = get_user_by_username(
        db,
        username,
    )

    if existing_user:
        raise ValueError(
            "El usuario ya existe"
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
        fragment_id=fragment_id,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user