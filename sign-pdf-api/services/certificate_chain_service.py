import asyncio
from pathlib import Path


async def download_certificate_chain(
    hostname: str,
    output_path: str,
) -> None:

    command = [
        "openssl",
        "s_client",
        "-showcerts",
        "-connect",
        f"{hostname}:443",
    ]

    process = await asyncio.create_subprocess_exec(
        *command,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )

    stdout, _ = await process.communicate(
        input=b"",
    )

    if process.returncode != 0:
        raise RuntimeError(
            "OpenSSL no pudo obtener la cadena."
        )

    text = stdout.decode(
        "utf-8",
        errors="ignore",
    )

    certificates = []

    inside_certificate = False
    current_certificate = []

    for line in text.splitlines():

        if "-----BEGIN CERTIFICATE-----" in line:
            inside_certificate = True
            current_certificate = [
                "-----BEGIN CERTIFICATE-----"
            ]
            continue

        if "-----END CERTIFICATE-----" in line:

            current_certificate.append(
                "-----END CERTIFICATE-----"
            )

            certificates.append(
                "\n".join(current_certificate)
            )

            inside_certificate = False
            current_certificate = []

            continue

        if inside_certificate:
            current_certificate.append(line)

    if not certificates:
        raise RuntimeError(
            "OpenSSL no encontró certificados."
        )

    Path(output_path).write_text(
        "\n".join(certificates),
        encoding="utf-8",
    )