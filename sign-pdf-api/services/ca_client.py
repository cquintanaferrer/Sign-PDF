import os

import httpx


CA_SERVICE_URL = os.getenv("CA_SERVICE_URL", "http://ca-service:8000").rstrip("/")
CA_VERIFY_URL = f"{CA_SERVICE_URL}/api/ca/certificates/verify"
CA_USER_CERTIFICATE_REQUESTS_URL = f"{CA_SERVICE_URL}/internal/certificate-requests"


async def verify_certificate_with_ca(certificate_pem: bytes) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CA_VERIFY_URL,
                files={
                    "certificate": (
                        "signer.crt",
                        certificate_pem,
                        "application/x-pem-file",
                    )
                },
                timeout=10,
            )
    except httpx.RequestError as exc:
        raise RuntimeError(
            "No fue posible comunicarse con el servicio de la CA."
        ) from exc

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text

        raise RuntimeError(f"La CA rechazó la consulta: {detail}")

    return response.json()


async def get_certificate_requests_for_user(email: str) -> list[dict]:
    """Consulta en la CA todas las CSR/certificados asociados al correo."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                CA_USER_CERTIFICATE_REQUESTS_URL,
                params={"email": email},
                timeout=10,
            )
    except httpx.RequestError as exc:
        raise RuntimeError(
            "No fue posible consultar los certificados del usuario en la CA."
        ) from exc

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise RuntimeError(f"La CA rechazó la consulta de certificados: {detail}")

    data = response.json()
    if not isinstance(data, list):
        raise RuntimeError("La CA devolvió una respuesta inesperada.")
    return data
