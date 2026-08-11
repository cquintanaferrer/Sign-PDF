import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CertificateAuthority(Base):
    __tablename__ = "certificate_authorities"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    initialized: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    root_certificate: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    serial_number: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    fingerprint: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    algorithm: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    issued_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )