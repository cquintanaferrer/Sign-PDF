import hashlib

from app.services.fragment_service import (
    FragmentInput,
    reconstruct_ca_secret,
)


ORIGINAL_SECRET = bytes.fromhex(
    "00112233445566778899aabbccddeeff"
    "00112233445566778899aabbccddeeff"
)


EXPECTED_HASH = hashlib.sha256(
    ORIGINAL_SECRET
).hexdigest()


def read_fragment(path: str) -> bytes:
    with open(path, "rb") as file:
        return file.read()


if __name__ == "__main__":

    fragments = [
        FragmentInput(
            encrypted_content=read_fragment(
                "fragment_1.sss"
            ),
            password="123",
        ),
        FragmentInput(
            encrypted_content=read_fragment(
                "fragment_2.sss"
            ),
            password="123",
        ),
        FragmentInput(
            encrypted_content=read_fragment(
                "fragment_3.sss"
            ),
            password="123",
        ),
    ]

    secret = reconstruct_ca_secret(
        fragments=fragments,
        expected_hash=EXPECTED_HASH,
    )

    print("=" * 60)
    print("RECONSTRUCCIÓN CORRECTA")
    print("=" * 60)
    print(f"Longitud: {len(secret)} bytes")