from __future__ import annotations

from io import BytesIO

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import async_validate_pdf_signature
from pyhanko.sign.validation.settings import KeyUsageConstraints
from pyhanko_certvalidator import ValidationContext


def _read_first_signature(pdf_bytes: bytes):
    try:
        reader = PdfFileReader(BytesIO(pdf_bytes), strict=False)
        signatures = list(reader.embedded_signatures)
    except Exception as exc:
        raise ValueError("No fue posible leer el PDF.") from exc

    if not signatures:
        raise ValueError("El PDF no contiene ninguna firma digital.")

    return signatures[0], len(signatures)


def extract_signing_certificate(pdf_bytes: bytes) -> bytes:
    """Extrae el certificado X.509 del primer firmante en formato PEM."""
    signature, _ = _read_first_signature(pdf_bytes)
    certificate = signature.signer_cert
    if certificate is None:
        raise ValueError(
            "La firma del PDF no contiene un certificado del firmante."
        )

    try:
        cert = x509.load_der_x509_certificate(certificate.dump())
        return cert.public_bytes(serialization.Encoding.PEM)
    except Exception as exc:
        raise ValueError(
            "No fue posible convertir el certificado del firmante a PEM."
        ) from exc


async def validate_pdf_cryptographic_signature(pdf_bytes: bytes) -> dict:
    """
    Comprueba la firma CMS/PDF, ByteRange e integridad del documento.

    La confianza en la CA y el estado de revocación se comprueban después
    contra SignPDF CA. Aquí el certificado del firmante se usa como ancla
    local únicamente para permitir que pyHanko evalúe la firma del PDF sin
    depender del almacén de confianza del sistema operativo.
    """
    signature, signature_count = _read_first_signature(pdf_bytes)
    signer_cert = signature.signer_cert
    if signer_cert is None:
        raise ValueError(
            "La firma del PDF no contiene un certificado del firmante."
        )

    try:
        validation_context = ValidationContext(
            trust_roots=[signer_cert],
            allow_fetching=False,
        )
        status = await async_validate_pdf_signature(
            signature,
            signer_validation_context=validation_context,
            key_usage_settings=KeyUsageConstraints(key_usage=None),
        )
    except Exception as exc:
        raise ValueError(
            f"No fue posible validar criptográficamente la firma del PDF: {exc}"
        ) from exc

    mechanism = None
    try:
        mechanism = status.pkcs7_signature_mechanism
        if mechanism is not None:
            mechanism = str(mechanism)
    except Exception:
        mechanism = None

    md_algorithm = None
    try:
        md_algorithm = status.md_algorithm
    except Exception:
        md_algorithm = None

    # `intact`: ByteRange/digest no cambió. `valid`: firma matemática válida.
    return {
        "intact": bool(status.intact),
        "signature_valid": bool(status.valid),
        "trusted_locally": bool(getattr(status, "trusted", False)),
        "signature_mechanism": mechanism,
        "digest_algorithm": md_algorithm,
        "signature_count": signature_count,
    }
