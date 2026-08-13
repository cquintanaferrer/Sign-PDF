import hashlib

from app.crypto.slip39 import split_secret, reconstruct_secret


def test_ca_secret_integrity():

    original_secret = bytes.fromhex(
        "00112233445566778899aabbccddeeff"
        "00112233445566778899aabbccddeeff"
    )

    original_hash = hashlib.sha256(
        original_secret
    ).hexdigest()

    shares = split_secret(
        original_secret
    )

    reconstructed_secret = reconstruct_secret(
        shares[:3]
    )

    reconstructed_hash = hashlib.sha256(
        reconstructed_secret
    ).hexdigest()

    assert reconstructed_secret == original_secret

    assert reconstructed_hash == original_hash