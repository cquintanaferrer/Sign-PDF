import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CAFragment(Base):
    __tablename__ = "ca_fragments"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    fragment_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    owner_username: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    encrypted_content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    ca_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("certificate_authorities.id"),
        nullable=False,
    )