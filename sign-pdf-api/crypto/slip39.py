from itertools import combinations

from shamir_mnemonic import (
    combine_mnemonics,
    generate_mnemonics,
)
from shamir_mnemonic.utils import MnemonicError


GROUP_THRESHOLD = 1
SHARES_THRESHOLD = 3
SHARES_TOTAL = 4


def split_secret(secret: bytes) -> list[str]:
    """
    Divide un secreto utilizando SLIP-0039.

    Configuración:
        1 grupo
        3 shares necesarios
        4 shares totales
    """

    if not secret:
        raise ValueError(
            "El secreto no puede estar vacío."
        )

    if len(secret) not in (16, 32):
        raise ValueError(
            "El secreto debe tener 16 o 32 bytes."
        )

    groups = generate_mnemonics(
        group_threshold=GROUP_THRESHOLD,
        groups=[
            (
                SHARES_THRESHOLD,
                SHARES_TOTAL,
            )
        ],
        master_secret=secret,
    )

    return groups[0]


def reconstruct_secret(
    mnemonics: list[str],
) -> bytes:
    """
    Reconstruye el secreto.

    Política de la aplicación:

        1 share → ❌
        2 shares → ❌
        3 shares → ✓
        4 shares → ✓

    SLIP-0039 espera exactamente el threshold
    de cada grupo al combinar, por lo que cuando
    recibimos 4 shares probamos las combinaciones
    posibles de 3.
    """

    if len(mnemonics) < SHARES_THRESHOLD:
        raise ValueError(
            "Se requieren al menos 3 fragmentos."
        )

    if len(mnemonics) > SHARES_TOTAL:
        raise ValueError(
            "No se pueden proporcionar más de 4 fragmentos."
        )

    # Caso normal: exactamente 3 shares.
    if len(mnemonics) == SHARES_THRESHOLD:
        return combine_mnemonics(mnemonics)

    # Tenemos 4 shares.
    #
    # SLIP-0039 requiere exactamente 3 para este
    # grupo. Probamos todas las combinaciones posibles.
    errors = []

    for combination in combinations(
        mnemonics,
        SHARES_THRESHOLD,
    ):
        try:
            return combine_mnemonics(
                list(combination)
            )

        except MnemonicError as error:
            errors.append(error)

    raise ValueError(
        "No fue posible reconstruir el secreto "
        "con los fragmentos proporcionados."
    )