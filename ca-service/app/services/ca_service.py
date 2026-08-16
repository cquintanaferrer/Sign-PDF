from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ca import CertificateAuthority


def get_ca(
    db: Session,
) -> CertificateAuthority | None:

    statement = (
        select(CertificateAuthority)
        .where(
            CertificateAuthority.is_active.is_(True),
            CertificateAuthority.initialized.is_(True),
        )
        .order_by(
            CertificateAuthority.generation.desc()
        )
    )

    return db.scalar(statement)


def create_ca_record(
    db: Session,
) -> CertificateAuthority:

    existing_ca = get_ca(db)

    if existing_ca:
        return existing_ca

    ca = CertificateAuthority(
        initialized=False,
    )

    db.add(ca)
    db.commit()
    db.refresh(ca)

    return ca
