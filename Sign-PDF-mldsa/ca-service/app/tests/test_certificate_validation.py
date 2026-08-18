import sys
from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent
API_URL = "http://127.0.0.1:8001"

REQUEST_ID = sys.argv[1] if len(sys.argv) > 1 else None


def submit_csr() -> str:
    """
    Envía la CSR de prueba a la CA.
    """
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

    if not response.ok:
        print("Error al enviar la CSR:")
        print(response.text)
        response.raise_for_status()

    data = response.json()

    print()
    print("=" * 60)
    print("CSR ENVIADA")
    print("=" * 60)
    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")
    print(f"Algoritmo: {data.get('algorithm')}")

    return data["id"]


def get_certificate(request_id: str):
    """
    Consulta la solicitud.

    Si ya fue emitida, guarda el certificado
    en received_certificate.pem.
    """
    response = requests.get(
        f"{API_URL}/api/csr/{request_id}",
        timeout=10,
    )

    if not response.ok:
        print("Error al consultar la solicitud:")
        print(response.text)
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
        return None

    certificate = data.get("certificate")

    if not certificate:
        raise RuntimeError(
            "La solicitud está marcada como ISSUED, "
            "pero no contiene el certificado."
        )

    certificate_path = (
        BASE_DIR / "received_certificate.pem"
    )

    certificate_path.write_text(
        certificate,
        encoding="utf-8",
    )

    print()
    print("=" * 60)
    print("CERTIFICADO EMITIDO")
    print("=" * 60)

    print(f"Serial: {data['serial_number']}")
    print(f"Subject: {data['subject']}")
    print(f"Issuer: {data['issuer']}")
    print(f"Emitido: {data['issued_at']}")
    print(f"Expira: {data['expires_at']}")

    print()
    print("Certificado guardado en:")
    print(certificate_path)

    return certificate_path


def verify_certificate(certificate_path: Path):
    """
    Envía el certificado a la CA para comprobar:

    - firma del certificado;
    - issuer;
    - existencia en PostgreSQL;
    - vigencia;
    - revocación.
    """
    if not certificate_path.exists():
        raise FileNotFoundError(
            f"No existe el certificado: {certificate_path}"
        )

    with open(certificate_path, "rb") as file:
        response = requests.post(
            f"{API_URL}/api/ca/certificates/verify",
            files={
                "certificate": (
                    certificate_path.name,
                    file,
                    "application/x-pem-file",
                )
            },
            timeout=10,
        )

    if not response.ok:
        print("Error al verificar el certificado:")
        print(response.text)
        response.raise_for_status()

    data = response.json()

    print()
    print("=" * 60)
    print("VERIFICACIÓN DEL CERTIFICADO")
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

    if data["revoked"]:
        print(f"Revocado:          {data['revoked_at']}")
        print(
            f"Motivo:            "
            f"{data['revocation_reason']}"
        )

    print()

    if data["valid"]:
        print("RESULTADO: CERTIFICADO VÁLIDO")
    else:
        print("RESULTADO: CERTIFICADO NO VÁLIDO")

    return data


def main():
    """
    Uso:

    1. Enviar CSR:
       python test_certificate_verification.py

    2. Después de firmarla desde el frontend:
       python test_certificate_verification.py REQUEST_ID

    El segundo comando consulta la emisión y,
    si existe el certificado, lo verifica automáticamente.
    """

    if REQUEST_ID:
        certificate_path = get_certificate(
            REQUEST_ID
        )

        if certificate_path is not None:
            verify_certificate(certificate_path)

        return

    request_id = submit_csr()

    print()
    print("=" * 60)
    print("SOLICITUD PENDIENTE")
    print("=" * 60)
    print()
    print("Ahora firma la CSR desde el frontend")
    print("administrativo de la CA.")
    print()
    print("Después ejecuta:")
    print()
    print(
        f"python {Path(__file__).name} {request_id}"
    )
    print()


if __name__ == "__main__":
    main()