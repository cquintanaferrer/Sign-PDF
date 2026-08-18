from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crypto.algorithm_registry import ECDSA_PROFILE, algorithm_label, normalize_profile
from app.models.ca import CertificateAuthority


def get_ca(
    db: Session,
    algorithm: str = ECDSA_PROFILE,
) -> CertificateAuthority | None:
    """
    Obtiene la CA activa del perfil solicitado.

    La misma aplicación puede alojar dos raíces lógicas independientes:
    ECDSA P-256 y ML-DSA-65.
    """
    profile = normalize_profile(algorithm)
    stored_algorithm = algorithm_label(profile)

    statement = (
        select(CertificateAuthority)
        .where(
            CertificateAuthority.is_active.is_(True),
            CertificateAuthority.initialized.is_(True),
            CertificateAuthority.algorithm == stored_algorithm,
        )
        .order_by(CertificateAuthority.generation.desc())
    )

    return db.scalar(statement)


def create_ca_record(
    db: Session,
    algorithm: str = ECDSA_PROFILE,
) -> CertificateAuthority | None:
    """
    Conservado por compatibilidad. El bootstrap crea el registro completo,
    porque el modelo requiere certificado, clave pública y metadatos no nulos.
    """
    return get_ca(db, algorithm=algorithm)
