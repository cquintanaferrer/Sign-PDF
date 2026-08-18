from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent

API_URL = "http://127.0.0.1:8001"

CERTIFICATE_PATH = (
    BASE_DIR / "received_certificate.pem"
)


def verify_certificate():
    # ---------------------------------------------
    # 1. Comprobar que existe el certificado
    # ---------------------------------------------

    if not CERTIFICATE_PATH.exists():
        raise FileNotFoundError(
            f"No existe el certificado: "
            f"{CERTIFICATE_PATH}"
        )

    print()
    print("=" * 60)
    print("PRUEBA DE VERIFICACIÓN DE CERTIFICADO")
    print("=" * 60)

    print()
    print(f"Certificado: {CERTIFICATE_PATH}")

    # ---------------------------------------------
    # 2. Enviar certificado a la CA
    # ---------------------------------------------

    with open(
        CERTIFICATE_PATH,
        "rb",
    ) as file:

        response = requests.post(
            f"{API_URL}/api/ca/certificates/verify",
            files={
                "certificate": (
                    "received_certificate.pem",
                    file,
                    "application/x-pem-file",
                )
            },
            timeout=10,
        )

    # ---------------------------------------------
    # 3. Comprobar respuesta HTTP
    # ---------------------------------------------

    if not response.ok:
        print()
        print("ERROR HTTP")
        print(response.status_code)
        print(response.text)

        response.raise_for_status()

    data = response.json()

    # ---------------------------------------------
    # 4. Mostrar resultado
    # ---------------------------------------------

    print()
    print("=" * 60)
    print("RESULTADO")
    print("=" * 60)

    print(
        f"Válido:            "
        f"{data['valid']}"
    )

    print(
        f"Emitido por CA:    "
        f"{data['issued_by_ca']}"
    )

    print(
        f"Firma válida:      "
        f"{data['signature_valid']}"
    )

    print(
        f"Existe en BD:      "
        f"{data['exists_in_database']}"
    )

    print(
        f"Revocado:          "
        f"{data['revoked']}"
    )

    print(
        f"Expirado:          "
        f"{data['expired']}"
    )

    print(
        f"Aún no válido:     "
        f"{data['not_yet_valid']}"
    )

    print()

    print(f"Serial:            {data['serial_number']}")
    print(f"Fingerprint:       {data['fingerprint']}")
    print(f"Subject:           {data['subject']}")
    print(f"Issuer:            {data['issuer']}")
    print(f"Algoritmo:         {data['algorithm']}")
    print(f"Emitido:           {data['issued_at']}")
    print(f"Expira:            {data['expires_at']}")

    # ---------------------------------------------
    # 5. Resultado final
    # ---------------------------------------------

    print()

    if data["valid"]:
        print(
            "RESULTADO FINAL: "
            "CERTIFICADO VÁLIDO"
        )
    else:
        print(
            "RESULTADO FINAL: "
            "CERTIFICADO NO VÁLIDO"
        )

    return data


if __name__ == "__main__":
    verify_certificate()