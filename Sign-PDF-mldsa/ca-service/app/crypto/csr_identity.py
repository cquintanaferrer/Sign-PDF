"""Utilidades para extraer identidad de solicitudes PKCS#10."""

from cryptography import x509
from cryptography.x509.oid import ExtensionOID, NameOID


def extract_csr_identity(
    csr_obj: x509.CertificateSigningRequest,
) -> tuple[str, str]:
    """Devuelve (nombre, email) a partir de una CSR.

    - Nombre: Common Name (CN); si no existe, subject completo.
    - Email: emailAddress del subject; si no existe, RFC822Name del SAN.
    - Si no hay correo, devuelve el guion largo "—" para la UI.
    """

    common_names = csr_obj.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
    username = (
        common_names[0].value
        if common_names
        else csr_obj.subject.rfc4514_string()
    )

    subject_emails = csr_obj.subject.get_attributes_for_oid(NameOID.EMAIL_ADDRESS)
    if subject_emails:
        return username, subject_emails[0].value

    try:
        san = csr_obj.extensions.get_extension_for_oid(
            ExtensionOID.SUBJECT_ALTERNATIVE_NAME
        ).value
        san_emails = san.get_values_for_type(x509.RFC822Name)
        if san_emails:
            return username, san_emails[0]
    except x509.ExtensionNotFound:
        pass

    return username, "—"


def extract_identity_from_pem(csr_pem: str) -> tuple[str, str]:
    """Extrae identidad de una CSR PEM almacenada en la base de datos."""

    try:
        csr_obj = x509.load_pem_x509_csr(csr_pem.encode("utf-8"))
        return extract_csr_identity(csr_obj)
    except (TypeError, ValueError):
        return "CSR inválida", "—"
