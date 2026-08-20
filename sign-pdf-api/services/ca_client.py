import httpx


CA_VERIFY_URL = (
    "http://ca-service:8000"
    "/api/ca/certificates/verify"
)


async def verify_certificate_with_ca(
    certificate_pem: bytes,
) -> dict:

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
            "No fue posible comunicarse con "
            "el servicio de la CA."
        ) from exc

    if response.status_code >= 400:

        try:
            detail = response.json()

        except Exception:
            detail = response.text

        raise RuntimeError(
            f"La CA rechazó la consulta: {detail}"
        )

    return response.json()