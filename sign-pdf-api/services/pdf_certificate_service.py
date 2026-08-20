from io import BytesIO

from pyhanko.pdf_utils.reader import PdfFileReader
from cryptography.hazmat.primitives import serialization


def extract_signing_certificate(
    pdf_bytes: bytes,
) -> bytes:
    """
    Extrae el certificado X.509 del primer
    firmante de un PDF firmado.

    Retorna el certificado en formato PEM.
    """

    try:
        reader = PdfFileReader(
            BytesIO(pdf_bytes)
        )

        signatures = list(
            reader.embedded_signatures
        )

    except Exception as exc:
        raise ValueError(
            "No fue posible leer el PDF."
        ) from exc

    if not signatures:
        raise ValueError(
            "El PDF no contiene ninguna firma digital."
        )

    signature = signatures[0]

    certificate = signature.signer_cert

    if certificate is None:
        raise ValueError(
            "La firma del PDF no contiene "
            "un certificado del firmante."
        )

    try:
        certificate_der = certificate.dump()

        from cryptography import x509

        cert = x509.load_der_x509_certificate(
            certificate_der
        )

        certificate_pem = cert.public_bytes(
            serialization.Encoding.PEM
        )

        return certificate_pem

    except Exception as exc:
        raise ValueError(
            "No fue posible convertir el certificado "
            "del firmante a PEM."
        ) from exc