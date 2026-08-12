"""PKCS#10 CSR validation for client-generated ECDSA P-256 requests."""
from __future__ import annotations

from dataclasses import dataclass

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID


@dataclass(frozen=True)
class CsrValidationResult:
    common_name: str | None
    email: str | None
    algorithm: str
    curve: str
    signature_valid: bool
    csr: x509.CertificateSigningRequest
    public_key: ec.EllipticCurvePublicKey


def _single_name_value(csr: x509.CertificateSigningRequest, oid: x509.ObjectIdentifier) -> str | None:
    attrs = csr.subject.get_attributes_for_oid(oid)
    return attrs[0].value if attrs else None


def validate_csr(csr_pem: bytes) -> CsrValidationResult:
    """Parse and validate the SignPDF ECDSA_P256 CSR contract.

    This validates the CSR's proof-of-possession signature and algorithm/curve.
    It does not perform identity vetting; that belongs to CA policy.
    """
    csr = x509.load_pem_x509_csr(csr_pem)
    public_key = csr.public_key()
    if not isinstance(public_key, ec.EllipticCurvePublicKey):
        raise ValueError("CSR public key is not elliptic-curve.")
    if not isinstance(public_key.curve, ec.SECP256R1):
        raise ValueError("CSR must use P-256 / secp256r1.")
    hash_algorithm = csr.signature_hash_algorithm
    if not isinstance(hash_algorithm, hashes.SHA256):
        raise ValueError("CSR must use ECDSA with SHA-256.")
    if not csr.is_signature_valid:
        raise ValueError("CSR proof-of-possession signature is invalid.")

    return CsrValidationResult(
        common_name=_single_name_value(csr, NameOID.COMMON_NAME),
        email=_single_name_value(csr, NameOID.EMAIL_ADDRESS),
        algorithm="ECDSA_P256",
        curve="P-256",
        signature_valid=True,
        csr=csr,
        public_key=public_key,
    )
