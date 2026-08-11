from fastapi import APIRouter, Depends
from sqlalchemy import delete

from app.core.database import get_db
from app.models.ca import CertificateAuthority
from app.models.ca_fragment import CAFragment


router = APIRouter(
    prefix="/api/dev",
    tags=["Development"],
)


@router.post("/reset-bootstrap")
def reset_bootstrap(
    db=Depends(get_db),
):
    """
    SOLO PARA DESARROLLO.

    Elimina el estado de la CA para permitir
    repetir la ceremonia de bootstrap durante
    las pruebas.
    """

    db.execute(
        delete(CAFragment)
    )

    db.execute(
        delete(CertificateAuthority)
    )

    db.commit()

    return {
        "ok": True,
        "message": (
            "Estado de bootstrap reiniciado."
        ),
    }