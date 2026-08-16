from datetime import datetime
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

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

    root_certificate: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    public_key: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    serial_number: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    fingerprint: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    algorithm: Mapped[str] = mapped_column(
        String(255),
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

    private_key_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    generation: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    parent_ca_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "certificate_authorities.id"
        ),
        nullable=True,
    )

    cross_certificate: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )