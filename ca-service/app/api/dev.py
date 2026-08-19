from fastapi import APIRouter, Depends
from sqlalchemy import delete

from app.core.database import get_db

from app.models.ca import CertificateAuthority
from app.models.ca_fragment import CAFragment
from app.models.csr import CertificateSigningRequest
from app.models.issued_certificate import IssuedCertificate


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

    Elimina todos los datos dependientes de la CA
    y finalmente elimina la Autoridad Certificadora.

    Permite repetir la ceremonia de bootstrap durante
    las pruebas.
    """

    # ------------------------------------------
    # 1. Certificados emitidos
    # ------------------------------------------

    db.execute(
        delete(IssuedCertificate)
    )

    # ------------------------------------------
    # 2. Solicitudes CSR
    # ------------------------------------------

    db.execute(
        delete(CertificateSigningRequest)
    )

    # ------------------------------------------
    # 3. Fragmentos de la CA
    # ------------------------------------------

    db.execute(
        delete(CAFragment)
    )

    # ------------------------------------------
    # 4. Autoridad Certificadora
    # ------------------------------------------

    db.execute(
        delete(CertificateAuthority)
    )

    db.commit()

    return {
        "ok": True,
        "message": (
            "Estado completo de la CA "
            "reiniciado correctamente."
        ),
    }