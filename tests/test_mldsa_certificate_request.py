from pathlib import Path
import sys

import requests
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import mldsa
from cryptography.x509.oid import NameOID


BASE_DIR = Path(__file__).resolve().parent

API_URL = "http://127.0.0.1:8000"

CSR_PATH = BASE_DIR / "test_mldsa_request.csr"
PRIVATE_KEY_PATH = BASE_DIR / "test_mldsa_private_key.pem"

REQUEST_ID = sys.argv[1] if len(sys.argv) > 1 else None


def generate_mldsa_csr() -> None:
    print()
    print("=" * 60)
    print("GENERANDO CSR ML-DSA-65")
    print("=" * 60)

    # ---------------------------------------------------------
    # 1. Generar clave privada ML-DSA-65
    # ---------------------------------------------------------

    private_key = mldsa.MLDSA65PrivateKey.generate()

    # ---------------------------------------------------------
    # 2. Construir identidad del solicitante
    # ---------------------------------------------------------

    subject = x509.Name(
        [
            x509.NameAttribute(
                NameOID.COUNTRY_NAME,
                "MX",
            ),
            x509.NameAttribute(
                NameOID.ORGANIZATION_NAME,
                "SignPDF Test",
            ),
            x509.NameAttribute(
                NameOID.COMMON_NAME,
                "usuario-prueba-mldsa",
            ),
        ]
    )

    # ---------------------------------------------------------
    # 3. Construir CSR PKCS#10
    #
    # ML-DSA no utiliza SHA256() como algoritmo separado.
    # cryptography requiere algorithm=None.
    # ---------------------------------------------------------

    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(subject)
        .sign(
            private_key,
            algorithm=None,
        )
    )

    # ---------------------------------------------------------
    # 4. Verificar la firma de la CSR
    # ---------------------------------------------------------

    if not csr.is_signature_valid:
        raise RuntimeError(
            "La firma de la CSR ML-DSA-65 no es válida."
        )

    # ---------------------------------------------------------
    # 5. Guardar CSR
    # ---------------------------------------------------------

    CSR_PATH.write_bytes(
        csr.public_bytes(
            serialization.Encoding.PEM
        )
    )

    # ---------------------------------------------------------
    # 6. Guardar clave privada del usuario
    #
    # Solo para la prueba.
    # ---------------------------------------------------------

    PRIVATE_KEY_PATH.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    print()
    print("CSR generada correctamente.")
    print(f"CSR: {CSR_PATH}")

    print()
    print("Clave privada ML-DSA-65:")
    print(PRIVATE_KEY_PATH)

    print()
    print("Tipo de clave pública:")
    print(type(csr.public_key()).__name__)

    print()
    print("Firma de la CSR: OK")


def submit_csr() -> str:
    # ---------------------------------------------------------
    # Si no existe la CSR, generarla.
    # Si ya existe, utilizar la existente.
    # ---------------------------------------------------------

    if not CSR_PATH.exists():
        generate_mldsa_csr()

    print()
    print("=" * 60)
    print("ENVIANDO CSR ML-DSA-65 A LA CA")
    print("=" * 60)

    with open(CSR_PATH, "rb") as file:
        response = requests.post(
            f"{API_URL}/api/csr",
            files={
                "csr": (
                    CSR_PATH.name,
                    file,
                    "application/pkcs10",
                )
            },
            timeout=10,
        )

    if not response.ok:
        print()
        print("ERROR HTTP")
        print(f"Status: {response.status_code}")
        print(response.text)

        response.raise_for_status()

    data = response.json()

    print()
    print("CSR enviada correctamente.")

    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")

    if "algorithm" in data:
        print(f"Algoritmo: {data['algorithm']}")

    return str(data["id"])


def get_certificate(request_id: str) -> None:
    print()
    print("=" * 60)
    print("CONSULTANDO SOLICITUD ML-DSA-65")
    print("=" * 60)

    response = requests.get(
        f"{API_URL}/api/csr/{request_id}",
        timeout=10,
    )

    if not response.ok:
        print()
        print("ERROR HTTP")
        print(f"Status: {response.status_code}")
        print(response.text)

        response.raise_for_status()

    data = response.json()

    print()
    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")
    print(f"Solicitante: {data['requester_username']}")

    if "algorithm" in data:
        print(f"Algoritmo: {data['algorithm']}")

    # ---------------------------------------------------------
    # La CSR todavía está pendiente
    # ---------------------------------------------------------

    if data["status"] != "ISSUED":
        print()
        print("El certificado todavía no ha sido emitido.")
        return

    # ---------------------------------------------------------
    # Obtener certificado
    # ---------------------------------------------------------

    certificate = data.get("certificate")

    if not certificate:
        print()
        print(
            "La solicitud está marcada como ISSUED, "
            "pero no contiene el certificado."
        )
        return

    certificate_path = (
        BASE_DIR / "received_mldsa_certificate.pem"
    )

    certificate_path.write_text(
        certificate,
        encoding="utf-8",
    )

    print()
    print("=" * 60)
    print("CERTIFICADO ML-DSA-65 DISPONIBLE")
    print("=" * 60)

    print(f"Serial: {data['serial_number']}")
    print(f"Subject: {data['subject']}")
    print(f"Issuer: {data['issuer']}")
    print(f"Algoritmo: {data['algorithm']}")
    print(f"Emitido: {data['issued_at']}")
    print(f"Expira: {data['expires_at']}")

    print()
    print("Certificado guardado en:")
    print(certificate_path)


def main() -> None:
    # ---------------------------------------------------------
    # Modo 1:
    #
    # python3 -m test_mldsa_certificate_request
    #
    # Genera/usa CSR y la envía.
    # ---------------------------------------------------------

    if REQUEST_ID is None:
        request_id = submit_csr()

        print()
        print("=" * 60)
        print("SOLICITUD CREADA")
        print("=" * 60)

        print()
        print(
            "La CSR ML-DSA-65 está pendiente de aprobación."
        )

        print()
        print("Request ID:")
        print(request_id)

        print()
        print("Para consultar posteriormente:")
        print(
            f"python3 -m test_mldsa_certificate_request "
            f"{request_id}"
        )

        return

    # ---------------------------------------------------------
    # Modo 2:
    #
    # python3 -m test_mldsa_certificate_request <REQUEST_ID>
    #
    # Consulta la solicitud existente.
    # ---------------------------------------------------------

    get_certificate(REQUEST_ID)


if __name__ == "__main__":
    main()