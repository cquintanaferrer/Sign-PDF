from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent

API_URL = "http://127.0.0.1:8000"

CERTIFICATE_PATH = (
    BASE_DIR / "received_mldsa_certificate.pem"
)


def verify_certificate():
    if not CERTIFICATE_PATH.exists():
        raise FileNotFoundError(
            f"No existe el certificado ML-DSA: "
            f"{CERTIFICATE_PATH}"
        )

    print()
    print("=" * 60)
    print("PRUEBA DE VERIFICACIÓN DE CERTIFICADO ML-DSA-65")
    print("=" * 60)

    print()
    print(f"Certificado: {CERTIFICATE_PATH}")

    with open(CERTIFICATE_PATH, "rb") as file:
        response = requests.post(
            f"{API_URL}/api/ca/certificates/verify",
            files={
                "certificate": (
                    "received_mldsa_certificate.pem",
                    file,
                    "application/x-pem-file",
                )
            },
            timeout=10,
        )

    if not response.ok:
        print()
        print("ERROR HTTP")
        print(response.status_code)
        print(response.text)

        response.raise_for_status()

    data = response.json()

    print()
    print("=" * 60)
    print("RESULTADO")
    print("=" * 60)

    print(f"Válido:            {data['valid']}")
    print(f"Emitido por CA:    {data['issued_by_ca']}")
    print(f"Firma válida:      {data['signature_valid']}")
    print(f"Existe en BD:      {data['exists_in_database']}")
    print(f"Revocado:          {data['revoked']}")
    print(f"Expirado:          {data['expired']}")
    print(f"Aún no válido:     {data['not_yet_valid']}")

    print()

    print(f"Serial:            {data['serial_number']}")
    print(f"Fingerprint:       {data['fingerprint']}")
    print(f"Subject:           {data['subject']}")
    print(f"Issuer:            {data['issuer']}")
    print(f"Algoritmo:         {data['algorithm']}")
    print(f"Emitido:           {data['issued_at']}")
    print(f"Expira:            {data['expires_at']}")

    print()

    if data["valid"]:
        print(
            "RESULTADO FINAL: "
            "CERTIFICADO ML-DSA-65 VÁLIDO"
        )
    else:
        print(
            "RESULTADO FINAL: "
            "CERTIFICADO ML-DSA-65 NO VÁLIDO"
        )

    return data


if __name__ == "__main__":
    verify_certificate()