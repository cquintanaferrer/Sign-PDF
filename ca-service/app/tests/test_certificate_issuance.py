from pathlib import Path

from app.core.database import SessionLocal

from app.services.ca_service import get_ca

from app.services.certificate_service import (
    issue_certificate,
)

from app.services.fragment_service import (
    FragmentInput,
)


TEST_DIR = Path(__file__).resolve().parent


def read_file(path: Path) -> bytes:
    with open(path, "rb") as file:
        return file.read()


def main():

    # ----------------------------------------------
    # 1. Crear sesión PostgreSQL
    # ----------------------------------------------

    db = SessionLocal()

    try:

        # ------------------------------------------
        # 2. Obtener CA desde PostgreSQL
        # ------------------------------------------

        ca = get_ca(db)

        if ca is None or not ca.initialized:
            raise RuntimeError(
                "No existe una CA inicializada."
            )

        print(
            f"CA encontrada: {ca.serial_number}"
        )

        print(
            f"Algoritmo: {ca.algorithm}"
        )

        # ------------------------------------------
        # 3. Leer CSR
        # ------------------------------------------

        csr = read_file(
            TEST_DIR / "test_request.csr"
        )

        # ------------------------------------------
        # 4. Fragmentos
        # ------------------------------------------

        fragments = [
            FragmentInput(
                encrypted_content=read_file(
                    TEST_DIR / "fragment_1.sss"
                ),
                password="123",
            ),

            FragmentInput(
                encrypted_content=read_file(
                    TEST_DIR / "fragment_2.sss"
                ),
                password="123",
            ),

            FragmentInput(
                encrypted_content=read_file(
                    TEST_DIR / "fragment_3.sss"
                ),
                password="123",
            ),
        ]

        # ------------------------------------------
        # 5. Emitir certificado
        # ------------------------------------------

        certificate = issue_certificate(
            csr_pem=csr,
            fragments=fragments,
            ca=ca,
        )

        # ------------------------------------------
        # 6. Guardar resultado
        # ------------------------------------------

        output = (
            TEST_DIR /
            "issued_certificate.pem"
        )

        with open(output, "wb") as file:
            file.write(certificate)

        print()
        print("=" * 60)
        print(
            "CERTIFICADO EMITIDO CORRECTAMENTE"
        )
        print("=" * 60)
        print(output)

    finally:

        db.close()


if __name__ == "__main__":
    main()