import base64
import json
import os

from argon2.low_level import (
    Type,
    hash_secret_raw,
)

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# Argon2id
ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65536      # 64 MiB
ARGON2_PARALLELISM = 4

# AES-256
KEY_LENGTH = 32

# AES-GCM recomienda un nonce de 12 bytes
NONCE_LENGTH = 12

# Salt independiente para cada fragmento
SALT_LENGTH = 16


def derive_key(
    password: str,
    salt: bytes,
) -> bytes:
    """
    Deriva una KEK de 256 bits utilizando Argon2id.
    """

    if not password:
        raise ValueError(
            "La contraseña no puede estar vacía."
        )

    return hash_secret_raw(
        secret=password.encode("utf-8"),
        salt=salt,
        time_cost=ARGON2_TIME_COST,
        memory_cost=ARGON2_MEMORY_COST,
        parallelism=ARGON2_PARALLELISM,
        hash_len=KEY_LENGTH,
        type=Type.ID,
    )


def encrypt_fragment(
    fragment: str,
    password: str,
    fragment_id: int,
) -> bytes:
    """
    Cifra un fragmento SLIP-0039 utilizando:

        contraseña
            ↓
        Argon2id
            ↓
        KEK
            ↓
        AES-256-GCM

    fragment_id se utiliza como AAD para impedir que
    un fragmento cifrado pueda ser reasignado
    silenciosamente a otro identificador.
    """

    if fragment_id not in (1, 2, 3, 4):
        raise ValueError(
            "El fragment_id debe estar entre 1 y 4."
        )

    salt = os.urandom(SALT_LENGTH)
    nonce = os.urandom(NONCE_LENGTH)

    key = derive_key(
        password=password,
        salt=salt,
    )

    aes = AESGCM(key)

    plaintext = fragment.encode("utf-8")

    aad = f"SignPDF-SLIP39-v1:fragment:{fragment_id}".encode(
        "utf-8"
    )

    ciphertext = aes.encrypt(
        nonce,
        plaintext,
        aad,
    )

    payload = {
        "version": 1,
        "format": "SignPDF-SLIP39",
        "fragment_id": fragment_id,
        "kdf": {
            "algorithm": "Argon2id",
            "time_cost": ARGON2_TIME_COST,
            "memory_cost": ARGON2_MEMORY_COST,
            "parallelism": ARGON2_PARALLELISM,
            "key_length": KEY_LENGTH,
            "salt": base64.b64encode(salt).decode("ascii"),
        },
        "cipher": {
            "algorithm": "AES-256-GCM",
            "nonce": base64.b64encode(nonce).decode("ascii"),
        },
        "ciphertext": base64.b64encode(
            ciphertext
        ).decode("ascii"),
    }

    return json.dumps(
        payload,
        indent=2,
    ).encode("utf-8")


def decrypt_fragment(
    encrypted_data: bytes,
    password: str,
) -> tuple[int, str]:
    """
    Descifra un fragmento cifrado.

    Devuelve:

        (fragment_id, slip39_fragment)
    """

    try:
        payload = json.loads(
            encrypted_data.decode("utf-8")
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(
            "El archivo de fragmento no es válido."
        ) from exc

    if payload.get("version") != 1:
        raise ValueError(
            "Versión de fragmento no soportada."
        )

    if payload.get("format") != "SignPDF-SLIP39":
        raise ValueError(
            "Formato de fragmento no soportado."
        )

    fragment_id = payload.get("fragment_id")

    if fragment_id not in (1, 2, 3, 4):
        raise ValueError(
            "Identificador de fragmento inválido."
        )

    kdf = payload.get("kdf", {})
    cipher = payload.get("cipher", {})

    if kdf.get("algorithm") != "Argon2id":
        raise ValueError(
            "Algoritmo KDF no soportado."
        )

    if cipher.get("algorithm") != "AES-256-GCM":
        raise ValueError(
            "Algoritmo de cifrado no soportado."
        )

    try:
        salt = base64.b64decode(
            kdf["salt"]
        )

        nonce = base64.b64decode(
            cipher["nonce"]
        )

        ciphertext = base64.b64decode(
            payload["ciphertext"]
        )

    except (KeyError, ValueError) as exc:
        raise ValueError(
            "Datos criptográficos incompletos."
        ) from exc

    key = derive_key(
        password=password,
        salt=salt,
    )

    aes = AESGCM(key)

    aad = f"SignPDF-SLIP39-v1:fragment:{fragment_id}".encode(
        "utf-8"
    )

    try:
        plaintext = aes.decrypt(
            nonce,
            ciphertext,
            aad,
        )

    except Exception as exc:
        raise ValueError(
            "No fue posible descifrar el fragmento. "
            "La contraseña puede ser incorrecta o "
            "el archivo puede haber sido alterado."
        ) from exc

    try:
        fragment = plaintext.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(
            "El fragmento descifrado no es válido."
        ) from exc

    return fragment_id, fragment