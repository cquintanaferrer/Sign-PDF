import unittest

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.crypto.client_ecdsa import (
    der_signature_to_raw,
    load_private_key,
    load_public_key,
    raw_signature_to_der,
    sign,
    verify,
)


class ClientEcdsaTests(unittest.TestCase):
    def test_key_round_trip_and_sign_verify(self) -> None:
        private = ec.generate_private_key(ec.SECP256R1())
        private_pem = private.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        public_pem = private.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )

        loaded_private = load_private_key(private_pem)
        loaded_public = load_public_key(public_pem)
        data = b"SignPDF ECDSA interoperability"
        signature = sign(data, loaded_private)

        self.assertEqual(len(signature), 64)
        self.assertTrue(verify(data, signature, loaded_public))
        self.assertFalse(verify(data + b"!", signature, loaded_public))

    def test_raw_der_round_trip(self) -> None:
        private = ec.generate_private_key(ec.SECP256R1())
        raw = sign(b"round trip", private)
        self.assertEqual(der_signature_to_raw(raw_signature_to_der(raw)), raw)


if __name__ == "__main__":
    unittest.main()
