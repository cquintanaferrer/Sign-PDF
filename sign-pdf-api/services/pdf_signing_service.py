from datetime import datetime, timezone
from io import BytesIO

from asn1crypto import keys as asn1_keys
from asn1crypto import x509 as asn1_x509

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from pyhanko import stamp
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.text import TextBoxStyle
from pyhanko.sign import fields, signers
from pyhanko_certvalidator.registry import SimpleCertificateStore


MAX_PDF_SIZE = 25 * 1024 * 1024
MAX_KEY_SIZE = 64 * 1024
MAX_CERTIFICATE_SIZE = 64 * 1024


class PDFSigningError(Exception):
    """Error controlado durante la firma del PDF."""


def _load_certificate(
    certificate_data: bytes,
) -> x509.Certificate:
    if not certificate_data:
        raise PDFSigningError(
            "El certificado está vacío."
        )

    if len(certificate_data) > MAX_CERTIFICATE_SIZE:
        raise PDFSigningError(
            "El certificado supera el tamaño máximo permitido."
        )

    try:
        certificate = x509.load_pem_x509_certificate(
            certificate_data
        )
    except ValueError as exc:
        raise PDFSigningError(
            "El certificado no es un certificado X.509 PEM válido."
        ) from exc

    return certificate


def _validate_certificate(
    certificate: x509.Certificate,
) -> None:
    public_key = certificate.public_key()

    if not isinstance(
        public_key,
        ec.EllipticCurvePublicKey,
    ):
        raise PDFSigningError(
            "El certificado debe utilizar una clave ECDSA."
        )

    if public_key.curve.name != "secp256r1":
        raise PDFSigningError(
            "El certificado debe utilizar ECDSA P-256."
        )

    now = datetime.now(timezone.utc)

    if now < certificate.not_valid_before_utc:
        raise PDFSigningError(
            "El certificado todavía no es válido."
        )

    if now > certificate.not_valid_after_utc:
        raise PDFSigningError(
            "El certificado está expirado."
        )


def _load_private_key(
    private_key_data: bytes,
    password: str | None,
):
    if not private_key_data:
        raise PDFSigningError(
            "La clave privada está vacía."
        )

    if len(private_key_data) > MAX_KEY_SIZE:
        raise PDFSigningError(
            "La clave privada supera el tamaño máximo permitido."
        )

    password_bytes = (
        password.encode("utf-8")
        if password is not None
        else None
    )

    try:
        private_key = serialization.load_pem_private_key(
            private_key_data,
            password=password_bytes,
        )
    except (ValueError, TypeError) as exc:
        raise PDFSigningError(
            "No se pudo cargar la clave privada."
        ) from exc

    if not isinstance(
        private_key,
        ec.EllipticCurvePrivateKey,
    ):
        raise PDFSigningError(
            "La clave privada debe ser una clave ECDSA."
        )

    if private_key.curve.name != "secp256r1":
        raise PDFSigningError(
            "La clave privada debe utilizar ECDSA P-256."
        )

    return private_key


def _validate_key_matches_certificate(
    private_key: ec.EllipticCurvePrivateKey,
    certificate: x509.Certificate,
) -> None:
    private_public_key = private_key.public_key()
    certificate_public_key = certificate.public_key()

    if (
        private_public_key.public_numbers()
        != certificate_public_key.public_numbers()
    ):
        raise PDFSigningError(
            "La clave privada no corresponde al certificado."
        )


def sign_pdf(
    pdf_data: bytes,
    private_key_data: bytes,
    certificate_data: bytes,
    password: str | None = None,
    user_name: str | None = None,
) -> bytes:
    """
    Firma un PDF utilizando ECDSA P-256 / SHA-256.

    La clave privada y el certificado se reciben temporalmente
    desde el cliente y no se almacenan.

    La firma contiene además una representación visual en la
    primera página del PDF.
    """

    if not pdf_data:
        raise PDFSigningError(
            "El PDF está vacío."
        )

    if len(pdf_data) > MAX_PDF_SIZE:
        raise PDFSigningError(
            "El PDF supera el tamaño máximo permitido."
        )

    if user_name is None:
        user_name = "Usuario"

    # ---------------------------------------------------------
    # Certificado
    # ---------------------------------------------------------

    certificate = _load_certificate(
        certificate_data
    )

    _validate_certificate(
        certificate
    )

    # ---------------------------------------------------------
    # Clave privada
    # ---------------------------------------------------------

    private_key = _load_private_key(
        private_key_data,
        password,
    )

    _validate_key_matches_certificate(
        private_key,
        certificate,
    )

    # ---------------------------------------------------------
    # Conversión a ASN.1 para pyHanko
    # ---------------------------------------------------------

    try:
        asn1_certificate = asn1_x509.Certificate.load(
            certificate.public_bytes(
                serialization.Encoding.DER
            )
        )

        asn1_private_key = asn1_keys.PrivateKeyInfo.load(
            private_key.private_bytes(
                serialization.Encoding.DER,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )

    except (ValueError, TypeError) as exc:
        raise PDFSigningError(
            "No se pudieron convertir el certificado "
            "o la clave privada al formato requerido por pyHanko."
        ) from exc

    # ---------------------------------------------------------
    # Firma PDF
    # ---------------------------------------------------------

    try:
        cert_registry = SimpleCertificateStore()

        signer = signers.SimpleSigner(
            signing_cert=asn1_certificate,
            signing_key=asn1_private_key,
            cert_registry=cert_registry,
        )

        writer = IncrementalPdfFileWriter(
            BytesIO(pdf_data)
        )

        # -----------------------------------------------------
        # Información visible de la firma
        # -----------------------------------------------------

        signed_at = datetime.now(timezone.utc)

        signature_text = (
            "FIRMA DIGITAL\n"
            f"Usuario: {user_name}\n"
            "Algoritmo: ECDSA P-256 / SHA-256\n"
            f"Fecha: {signed_at.strftime('%d/%m/%Y %H:%M UTC')}"
        )

        stamp_style = stamp.TextStampStyle(
            border_width=2,
            stamp_text=signature_text,
            text_box_style=TextBoxStyle(
                font_size=9,
            ),
        )

        # -----------------------------------------------------
        # Crear firma
        # -----------------------------------------------------

        pdf_output = BytesIO()

        pdf_signer = signers.PdfSigner(
            signature_meta=signers.PdfSignatureMetadata(
                field_name="Signature1",
                md_algorithm="sha256",
                name=user_name,
                reason="Firma digital de documento",
            ),
            signer=signer,
            stamp_style=stamp_style,
            new_field_spec=fields.SigFieldSpec(
                sig_field_name="Signature1",
                on_page=0,
                box=(300, 50, 550, 140),
            ),
        )

        pdf_signer.sign_pdf(
            writer,
            output=pdf_output,
        )

        return pdf_output.getvalue()

    except Exception as exc:
        raise PDFSigningError(
            f"No fue posible firmar el PDF: {exc}"
        ) from exc

