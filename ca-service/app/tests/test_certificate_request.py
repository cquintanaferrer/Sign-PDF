import sys
from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent

API_URL = "http://127.0.0.1:8001"

REQUEST_ID = sys.argv[1] if len(sys.argv) > 1 else None


def submit_csr() -> str:
    csr_path = BASE_DIR / "test_request.csr"

    if not csr_path.exists():
        raise FileNotFoundError(
            f"No existe la CSR: {csr_path}"
        )

    with open(csr_path, "rb") as file:
        response = requests.post(
            f"{API_URL}/api/csr",
            files={
                "csr": (
                    "test_request.csr",
                    file,
                    "application/pkcs10",
                )
            },
            timeout=10,
        )

    response.raise_for_status()

    data = response.json()

    print("CSR enviada correctamente")
    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")

    return data["id"]


def get_certificate(request_id: str):
    response = requests.get(
        f"{API_URL}/api/csr/{request_id}",
        timeout=10,
    )

    response.raise_for_status()

    data = response.json()

    print()
    print("=" * 60)
    print("ESTADO DE LA SOLICITUD")
    print("=" * 60)

    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")
    print(f"Solicitante: {data['requester_username']}")

    if data["status"] != "ISSUED":
        print()
        print("El certificado todavía no ha sido emitido.")
        return

    certificate = data.get("certificate")

    if not certificate:
        print()
        print(
            "La solicitud está marcada como ISSUED, "
            "pero no contiene el certificado."
        )
        return

    certificate_path = (
        BASE_DIR / "received_certificate.pem"
    )

    certificate_path.write_text(
        certificate,
        encoding="utf-8",
    )

    print()
    print("=" * 60)
    print("CERTIFICADO DISPONIBLE")
    print("=" * 60)

    print(f"Serial: {data['serial_number']}")
    print(f"Subject: {data['subject']}")
    print(f"Issuer: {data['issuer']}")
    print(f"Algoritmo: {data['algorithm']}")
    print(f"Emitido: {data['issued_at']}")
    print(f"Expira: {data['expires_at']}")

    print()
    print(f"Certificado guardado en:")
    print(certificate_path)


def main():
    if REQUEST_ID:
        get_certificate(REQUEST_ID)
        return

    request_id = submit_csr()

    print()
    print(
        "La CSR está pendiente de aprobación."
    )
    print(
        "Guarda este Request ID para consultar "
        "el certificado después:"
    )
    print(request_id)


if __name__ == "__main__":
    main()