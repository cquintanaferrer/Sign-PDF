from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.authorization import require_ca_admin
from app.services.ca_service import get_ca


router = APIRouter(
    prefix="/api/ca",
    tags=["Certificate Authority"],
)


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