from __future__ import annotations

import base64
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO

from asn1crypto import x509 as asn1_x509
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, mldsa

from pyhanko import stamp
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.text import TextBoxStyle
from pyhanko.sign import fields, signers
from pyhanko_certvalidator.registry import SimpleCertificateStore


MAX_PDF_SIZE = 25 * 1024 * 1024
MAX_CERTIFICATE_SIZE = 64 * 1024
OPERATION_TTL_SECONDS = 15 * 60


class PDFSigningError(Exception):
    """Error controlado durante la preparación/finalización de la firma PDF."""


@dataclass
class PendingPdfSignature:
    created_at: float
    prepared_digest: object
    output_handle: BytesIO
    signed_attrs: object
    asn1_certificate: asn1_x509.Certificate
    certificate: x509.Certificate
    algorithm: str
    digest_algorithm: str
    user_name: str
    owner_email: str


_PENDING: dict[str, PendingPdfSignature] = {}


def _cleanup_expired_operations() -> None:
    cutoff = time.time() - OPERATION_TTL_SECONDS
    expired = [
        operation_id
        for operation_id, operation in _PENDING.items()
        if operation.created_at < cutoff
    ]
    for operation_id in expired:
        _PENDING.pop(operation_id, None)


def _load_certificate(certificate_data: bytes) -> x509.Certificate:
    if not certificate_data:
        raise PDFSigningError("El certificado está vacío.")
    if len(certificate_data) > MAX_CERTIFICATE_SIZE:
        raise PDFSigningError("El certificado supera el tamaño máximo permitido.")

    try:
        return x509.load_pem_x509_certificate(certificate_data)
    except ValueError as exc:
        raise PDFSigningError(
            "El certificado no es un certificado X.509 PEM válido."
        ) from exc


def _certificate_profile(certificate: x509.Certificate) -> tuple[str, str, int]:
    """Retorna (algoritmo_cliente, digest_CMS, tamaño_placeholder_firma)."""
    public_key = certificate.public_key()

    if isinstance(public_key, ec.EllipticCurvePublicKey):
        if public_key.curve.name != "secp256r1":
            raise PDFSigningError("Solo se admite ECDSA sobre P-256.")
        # CMS ECDSA usa firma ASN.1 DER (r,s), que ronda 70-72 bytes.
        return "ECDSA_P256", "sha256", 80

    if isinstance(public_key, mldsa.MLDSA65PublicKey):
        # RFC 9882 permite SHA-512 como messageDigest para ML-DSA-65.
        # La operación ML-DSA firma en modo puro los SignedAttributes DER.
        return "ML_DSA_65", "sha512", 3309

    raise PDFSigningError(
        "El certificado debe utilizar ECDSA P-256 o ML-DSA-65."
    )


def _validate_certificate_time(certificate: x509.Certificate) -> None:
    now = datetime.now(timezone.utc)
    if now < certificate.not_valid_before_utc:
        raise PDFSigningError("El certificado todavía no es válido.")
    if now > certificate.not_valid_after_utc:
        raise PDFSigningError("El certificado está expirado.")


def _asn1_certificate(certificate: x509.Certificate) -> asn1_x509.Certificate:
    try:
        return asn1_x509.Certificate.load(
            certificate.public_bytes(serialization.Encoding.DER)
        )
    except (TypeError, ValueError) as exc:
        raise PDFSigningError(
            "No fue posible convertir el certificado al formato requerido por pyHanko."
        ) from exc


def _external_signer(
    certificate: asn1_x509.Certificate,
    signature_value: bytes,
) -> signers.ExternalSigner:
    return signers.ExternalSigner(
        signing_cert=certificate,
        cert_registry=SimpleCertificateStore(),
        signature_value=signature_value,
    )


def _signature_label(algorithm: str) -> str:
    if algorithm == "ECDSA_P256":
        return "ECDSA P-256 / SHA-256"
    return "ML-DSA-65"


async def prepare_pdf_signature(
    *,
    pdf_data: bytes,
    certificate_data: bytes,
    user_name: str | None,
    owner_email: str,
) -> dict:
    """
    Prepara el PDF y los SignedAttributes CMS.

    IMPORTANTE: aquí NO se recibe ninguna llave privada. El resultado
    `to_sign_b64` se firma posteriormente en el navegador del usuario.
    """
    _cleanup_expired_operations()

    if not pdf_data:
        raise PDFSigningError("El PDF está vacío.")
    if len(pdf_data) > MAX_PDF_SIZE:
        raise PDFSigningError("El PDF supera el tamaño máximo permitido.")

    certificate = _load_certificate(certificate_data)
    _validate_certificate_time(certificate)
    algorithm, digest_algorithm, placeholder_size = _certificate_profile(certificate)
    asn1_cert = _asn1_certificate(certificate)

    display_name = user_name or "Usuario"
    signed_at = datetime.now(timezone.utc)
    signature_text = (
        "FIRMA DIGITAL\n"
        f"Usuario: {display_name}\n"
        f"Algoritmo: {_signature_label(algorithm)}\n"
        f"Fecha: {signed_at.strftime('%d/%m/%Y %H:%M UTC')}"
    )

    try:
        ext_signer = _external_signer(
            asn1_cert,
            bytes(placeholder_size),
        )

        writer = IncrementalPdfFileWriter(BytesIO(pdf_data), strict=False)
        stamp_style = stamp.TextStampStyle(
            border_width=2,
            stamp_text=signature_text,
            text_box_style=TextBoxStyle(font_size=9),
        )

        # Reservamos holgura suficiente para el CMS completo. ML-DSA tiene
        # firmas y llaves públicas considerablemente mayores que ECDSA.
        bytes_reserved = 16_384 if algorithm == "ECDSA_P256" else 65_536

        pdf_signer = signers.PdfSigner(
            signature_meta=signers.PdfSignatureMetadata(
                field_name="Signature1",
                md_algorithm=digest_algorithm,
                name=display_name,
                reason="Firma digital de documento",
                subfilter=fields.SigSeedSubFilter.PADES,
            ),
            signer=ext_signer,
            stamp_style=stamp_style,
            new_field_spec=fields.SigFieldSpec(
                sig_field_name="Signature1",
                on_page=0,
                box=(300, 50, 550, 140),
            ),
        )

        prepared_digest, _tbs_document, output_handle = (
            await pdf_signer.async_digest_doc_for_signing(
                writer,
                bytes_reserved=bytes_reserved,
            )
        )

        signed_attrs = await ext_signer.signed_attrs(
            prepared_digest.document_digest,
            digest_algorithm,
            use_pades=True,
        )
        to_sign = signed_attrs.dump()

    except PDFSigningError:
        raise
    except Exception as exc:
        raise PDFSigningError(
            f"No fue posible preparar el PDF para firma: {exc}"
        ) from exc

    operation_id = str(uuid.uuid4())
    _PENDING[operation_id] = PendingPdfSignature(
        created_at=time.time(),
        prepared_digest=prepared_digest,
        output_handle=output_handle,
        signed_attrs=signed_attrs,
        asn1_certificate=asn1_cert,
        certificate=certificate,
        algorithm=algorithm,
        digest_algorithm=digest_algorithm,
        user_name=display_name,
        owner_email=owner_email,
    )

    return {
        "operation_id": operation_id,
        "algorithm": algorithm,
        "algorithm_label": _signature_label(algorithm),
        "digest_algorithm": digest_algorithm,
        "to_sign_b64": base64.b64encode(to_sign).decode("ascii"),
        "expires_in_seconds": OPERATION_TTL_SECONDS,
    }


def _verify_external_signature(
    operation: PendingPdfSignature,
    signature: bytes,
) -> None:
    to_sign = operation.signed_attrs.dump()
    public_key = operation.certificate.public_key()

    try:
        if operation.algorithm == "ECDSA_P256":
            assert isinstance(public_key, ec.EllipticCurvePublicKey)
            # El navegador devuelve la codificación DER CMS de (r,s).
            public_key.verify(
                signature,
                to_sign,
                ec.ECDSA(hashes.SHA256()),
            )
            return

        if operation.algorithm == "ML_DSA_65":
            assert isinstance(public_key, mldsa.MLDSA65PublicKey)
            # ML-DSA se usa en modo puro sobre los SignedAttributes DER.
            public_key.verify(signature, to_sign)
            return

    except (InvalidSignature, ValueError) as exc:
        raise PDFSigningError(
            "La firma recibida no corresponde al certificado o a los datos preparados."
        ) from exc

    raise PDFSigningError("Algoritmo de firma no soportado.")


async def finalize_pdf_signature(
    *,
    operation_id: str,
    signature_b64: str,
    owner_email: str,
) -> bytes:
    """Inserta la firma producida en el navegador en el CMS/PDF preparado."""
    _cleanup_expired_operations()

    operation = _PENDING.get(operation_id)
    if operation is None:
        raise PDFSigningError(
            "La operación de firma no existe o expiró. Vuelve a preparar el PDF."
        )

    if operation.owner_email != owner_email:
        raise PDFSigningError("La operación de firma pertenece a otra sesión de usuario.")

    try:
        signature = base64.b64decode(signature_b64, validate=True)
    except Exception as exc:
        raise PDFSigningError("La firma Base64 es inválida.") from exc

    if not signature:
        raise PDFSigningError("La firma está vacía.")

    # Antes de crear el CMS, verificamos explícitamente que la firma venga de
    # la llave privada correspondiente al certificado del firmante.
    _verify_external_signature(operation, signature)

    try:
        ext_signer = _external_signer(
            operation.asn1_certificate,
            signature,
        )
        sig_cms = await ext_signer.async_sign_prescribed_attributes(
            operation.digest_algorithm,
            signed_attrs=operation.signed_attrs,
        )
        operation.prepared_digest.fill_with_cms(
            operation.output_handle,
            sig_cms,
        )
        signed_pdf = operation.output_handle.getvalue()
    except Exception as exc:
        raise PDFSigningError(
            f"No fue posible completar la firma CMS/PDF: {exc}"
        ) from exc

    if not signed_pdf:
        raise PDFSigningError("El PDF firmado quedó vacío.")

    _PENDING.pop(operation_id, None)
    return signed_pdf
