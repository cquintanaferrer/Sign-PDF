import httpx


CA_VERIFY_URL = (
    "http://ca-service:8000/api/ca/certificates/verify-chain"
)


async def verify_certificate_chain(
    pem_path: str,
    hostname: str,
) -> dict:
    """
    Envía una cadena X.509 PEM al SignPDF CA Service
    para validar su cadena de confianza.
    """

    with open(pem_path, "rb") as pem_file:

        files = {
            "chain": (
                "certificate_chain.pem",
                pem_file,
                "application/x-pem-file",
            )
        }

        data = {
            "hostname": hostname,
        }

        async with httpx.AsyncClient(
            timeout=30.0
        ) as client:

            response = await client.post(
                CA_VERIFY_URL,
                files=files,
                data=data,
            )

    response.raise_for_status()

    return response.json()