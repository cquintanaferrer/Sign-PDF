from datetime import datetime, timezone

import certifi

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.x509.general_name import DNSName
from cryptography.x509.verification import PolicyBuilder, Store


def verify_external_certificate_chain(
    chain_pem: bytes,
    hostname: str,
) -> dict:

    if not chain_pem:
        raise ValueError("La cadena de certificados está vacía.")

    hostname = hostname.strip()

    if not hostname:
        raise ValueError("El hostname es obligatorio.")

    try:
        certificates = x509.load_pem_x509_certificates(
            chain_pem
        )
    except ValueError as exc:
        raise ValueError(
            "El archivo no contiene certificados X.509 PEM válidos."
        ) from exc

    if not certificates:
        raise ValueError(
            "No se encontraron certificados en la cadena PEM."
        )

    leaf_certificate = certificates[0]
    intermediates = certificates[1:]

    try:
        with open(certifi.where(), "rb") as trust_store_file:
            trusted_certificates = (
                x509.load_pem_x509_certificates(
                    trust_store_file.read()
                )
            )
    except OSError as exc:
        raise ValueError(
            "No fue posible cargar el almacén de confianza público."
        ) from exc

    store = Store(trusted_certificates)

    try:
        verifier = (
            PolicyBuilder()
            .store(store)
            .time(datetime.now(timezone.utc))
            .build_server_verifier(
                DNSName(hostname)
            )
        )
    except Exception as exc:
        raise ValueError(
            "No fue posible construir el verificador X.509."
        ) from exc

    try:
        verified_chain = verifier.verify(
            leaf_certificate,
            intermediates,
        )

    except Exception as exc:
        return {
            "valid": False,
            "hostname": hostname,
            "reason": str(exc),
            "leaf": _certificate_info(
                leaf_certificate
            ),
            "chain": [],
        }

    return {
        "valid": True,
        "hostname": hostname,
        "reason": None,
        "leaf": _certificate_info(
            leaf_certificate
        ),
        "chain": [
            _certificate_info(certificate)
            for certificate in verified_chain
        ],
    }


def _certificate_info(
    certificate: x509.Certificate,
) -> dict:
    return {
        "subject": certificate.subject.rfc4514_string(),
        "issuer": certificate.issuer.rfc4514_string(),
        "serial_number": str(
            certificate.serial_number
        ),
        "not_valid_before": (
            certificate.not_valid_before_utc
        ),
        "not_valid_after": (
            certificate.not_valid_after_utc
        ),
        "fingerprint": certificate.fingerprint(
            hashes.SHA256()
        ).hex(":"),
        "signature_algorithm": (
            certificate.signature_algorithm_oid._name
            or certificate.signature_algorithm_oid.dotted_string
        ),
    }