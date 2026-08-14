import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey
from app.models.base import Base


class IssuedCertificate(Base):
    __tablename__ = "issued_certificates"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    serial_number: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    certificate_pem: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    issuer: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    algorithm: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    ca_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("certificate_authorities.id"),
        nullable=False,
        index=True,
    )

    csr_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("certificate_signing_requests.id"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ISSUED",
        index=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    revocation_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )