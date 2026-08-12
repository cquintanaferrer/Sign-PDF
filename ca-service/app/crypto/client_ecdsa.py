"""ECDSA P-256 interoperability helpers for SignPDF.

The browser-side contract uses Web Crypto's fixed-width P-256 signature format:
64 bytes = r (32 bytes) || s (32 bytes).  PyCA cryptography uses ASN.1 DER for
ECDSA signatures, so conversion happens explicitly at the Python boundary.
"""
from __future__ import annotations

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature

P256_COMPONENT_BYTES = 32
P256_RAW_SIGNATURE_BYTES = 64


def _ensure_p256_public_key(key: object) -> ec.EllipticCurvePublicKey:
    if not isinstance(key, ec.EllipticCurvePublicKey):
        raise TypeError("Expected an elliptic-curve public key.")
    if not isinstance(key.curve, ec.SECP256R1):
        raise ValueError("Expected ECDSA P-256 / secp256r1 public key.")
    return key


def _ensure_p256_private_key(key: object) -> ec.EllipticCurvePrivateKey:
    if not isinstance(key, ec.EllipticCurvePrivateKey):
        raise TypeError("Expected an elliptic-curve private key.")
    if not isinstance(key.curve, ec.SECP256R1):
        raise ValueError("Expected ECDSA P-256 / secp256r1 private key.")
    return key


def load_private_key(pem: bytes, password: bytes | None = None) -> ec.EllipticCurvePrivateKey:
    """Load an unencrypted/encrypted PKCS#8 PEM private key and require P-256."""
    return _ensure_p256_private_key(serialization.load_pem_private_key(pem, password=password))


def load_public_key(pem: bytes) -> ec.EllipticCurvePublicKey:
    """Load an SPKI PEM public key and require P-256."""
    return _ensure_p256_public_key(serialization.load_pem_public_key(pem))


def raw_signature_to_der(signature_raw: bytes) -> bytes:
    """Convert Web Crypto P-256 r||s (64 bytes) to ASN.1 DER."""
    if len(signature_raw) != P256_RAW_SIGNATURE_BYTES:
        raise ValueError(f"P-256 raw signature must be {P256_RAW_SIGNATURE_BYTES} bytes.")
    r = int.from_bytes(signature_raw[:P256_COMPONENT_BYTES], "big")
    s = int.from_bytes(signature_raw[P256_COMPONENT_BYTES:], "big")
    if r == 0 or s == 0:
        raise ValueError("ECDSA signature components must be non-zero.")
    return encode_dss_signature(r, s)


def der_signature_to_raw(signature_der: bytes) -> bytes:
    """Convert an ASN.1 DER ECDSA P-256 signature to fixed-width r||s."""
    r, s = decode_dss_signature(signature_der)
    try:
        return r.to_bytes(P256_COMPONENT_BYTES, "big") + s.to_bytes(P256_COMPONENT_BYTES, "big")
    except OverflowError as exc:
        raise ValueError("ECDSA signature component is too large for P-256.") from exc


def sign(data: bytes, private_key: ec.EllipticCurvePrivateKey, *, raw: bool = True) -> bytes:
    """Sign data with ECDSA P-256/SHA-256; return raw r||s by default."""
    key = _ensure_p256_private_key(private_key)
    signature_der = key.sign(data, ec.ECDSA(hashes.SHA256()))
    return der_signature_to_raw(signature_der) if raw else signature_der


def verify(data: bytes, signature: bytes, public_key: ec.EllipticCurvePublicKey, *, raw: bool = True) -> bool:
    """Verify ECDSA P-256/SHA-256; raw input is the browser/API contract."""
    key = _ensure_p256_public_key(public_key)
    signature_der = raw_signature_to_der(signature) if raw else signature
    try:
        key.verify(signature_der, data, ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        return False
