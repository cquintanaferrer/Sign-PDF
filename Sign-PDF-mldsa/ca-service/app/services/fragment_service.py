import hashlib
import hmac
from dataclasses import dataclass

from app.crypto.encryption import decrypt_fragment
from app.crypto.slip39 import reconstruct_secret


MINIMUM_SHARES = 3
MAXIMUM_SHARES = 4


@dataclass
class FragmentInput:
    """
    Fragmento cifrado recibido junto con la contraseña
    del custodio correspondiente.
    """

    encrypted_content: bytes
    password: str


def reconstruct_ca_secret(
    fragments: list[FragmentInput],
    expected_hash: str,
) -> bytes:
    """
    Descifra y reconstruye temporalmente el secreto
    privado de la CA.

    Se requieren como mínimo 3 fragmentos válidos
    de un máximo de 4.

    expected_hash:
        SHA-256 del scalar privado original de la CA,
        almacenado en PostgreSQL durante el bootstrap.

    Retorna:
        El scalar privado reconstruido de 32 bytes.

    No almacena ni persiste la clave privada.
    """

    # -------------------------------------------------
    # 1. Validar cantidad
    # -------------------------------------------------

    if len(fragments) < MINIMUM_SHARES:
        raise ValueError(
            "Se requieren al menos 3 fragmentos "
            "para reconstruir la clave de la CA."
        )

    if len(fragments) > MAXIMUM_SHARES:
        raise ValueError(
            "No se pueden proporcionar más de 4 fragmentos."
        )

    # -------------------------------------------------
    # 2. Validar hash esperado
    # -------------------------------------------------

    if not expected_hash:
        raise ValueError(
            "La CA no tiene registrado un hash "
            "de su clave privada."
        )

    # -------------------------------------------------
    # 3. Descifrar los fragmentos
    # -------------------------------------------------

    decrypted_shares: list[str] = []
    fragment_ids: set[int] = set()

    for fragment in fragments:

        if not fragment.password:
            raise ValueError(
                "La contraseña de un custodio "
                "no puede estar vacía."
            )

        try:
            fragment_id, share = decrypt_fragment(
                encrypted_data=fragment.encrypted_content,
                password=fragment.password,
            )

        except ValueError as exc:
            raise ValueError(
                "No fue posible descifrar uno de "
                "los fragmentos proporcionados."
            ) from exc

        # ---------------------------------------------
        # Evitar fragmentos duplicados
        # ---------------------------------------------

        if fragment_id in fragment_ids:
            raise ValueError(
                f"El fragmento {fragment_id} "
                "fue proporcionado más de una vez."
            )

        fragment_ids.add(fragment_id)
        decrypted_shares.append(share)

    # -------------------------------------------------
    # 4. Comprobar cantidad de shares válidos
    # -------------------------------------------------

    if len(decrypted_shares) < MINIMUM_SHARES:
        raise ValueError(
            "No existen suficientes fragmentos válidos "
            "para reconstruir la clave de la CA."
        )

    # -------------------------------------------------
    # 5. Reconstruir mediante SLIP-0039
    # -------------------------------------------------

    try:
        secret = reconstruct_secret(
            decrypted_shares
        )

    except ValueError as exc:
        raise ValueError(
            "No fue posible reconstruir el secreto "
            "mediante SLIP-0039."
        ) from exc

    # -------------------------------------------------
    # 6. Validar tamaño
    # -------------------------------------------------

    if len(secret) != 32:
        raise ValueError(
            "El secreto reconstruido no tiene "
            "el tamaño esperado de 32 bytes."
        )

    # -------------------------------------------------
    # 7. Verificar integridad mediante SHA-256
    # -------------------------------------------------

    reconstructed_hash = hashlib.sha256(
        secret
    ).hexdigest()

    if not hmac.compare_digest(
        reconstructed_hash,
        expected_hash,
    ):
        raise ValueError(
            "La clave reconstruida no coincide "
            "con la clave original de la CA."
        )

    # -------------------------------------------------
    # 8. El secreto es válido
    # -------------------------------------------------

    return secret