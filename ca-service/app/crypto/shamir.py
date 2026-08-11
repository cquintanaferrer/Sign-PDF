import secrets


FIELD_SIZE = 256
SHARES_COUNT = 4
THRESHOLD = 2


def _gf_mul(a: int, b: int) -> int:
    """
    Multiplicación en GF(2^8) usando el polinomio
    irreducible x^8 + x^4 + x^3 + x + 1 (0x11B).
    """

    result = 0

    while b:
        if b & 1:
            result ^= a

        high_bit = a & 0x80
        a <<= 1

        if high_bit:
            a ^= 0x11B

        a &= 0xFF
        b >>= 1

    return result


def _gf_pow(a: int, exponent: int) -> int:
    result = 1

    while exponent:
        if exponent & 1:
            result = _gf_mul(result, a)

        a = _gf_mul(a, a)
        exponent >>= 1

    return result


def _gf_inverse(a: int) -> int:
    if a == 0:
        raise ValueError("No existe inverso multiplicativo de 0.")

    return _gf_pow(a, 254)


def _evaluate_polynomial(
    coefficients: list[int],
    x: int,
) -> int:

    result = 0

    for coefficient in reversed(coefficients):
        result = _gf_mul(result, x)
        result ^= coefficient

    return result


def split_secret(
    secret: bytes,
) -> list[tuple[int, bytes]]:
    """
    Divide un secreto usando Shamir 2-of-4.

    Devuelve cuatro shares:

        [
            (1, share_data),
            (2, share_data),
            (3, share_data),
            (4, share_data),
        ]

    Cada byte del secreto utiliza un polinomio de grado 1:

        f(x) = secret + random*x
    """

    if not secret:
        raise ValueError(
            "El secreto no puede estar vacío."
        )

    shares = [
        bytearray(len(secret))
        for _ in range(SHARES_COUNT)
    ]

    for byte_index, secret_byte in enumerate(secret):

        random_coefficient = secrets.randbelow(
            FIELD_SIZE
        )

        coefficients = [
            secret_byte,
            random_coefficient,
        ]

        for share_index in range(SHARES_COUNT):

            x = share_index + 1

            shares[share_index][byte_index] = (
                _evaluate_polynomial(
                    coefficients,
                    x,
                )
            )

    return [
        (index + 1, bytes(data))
        for index, data in enumerate(shares)
    ]


def reconstruct_secret(
    shares: list[tuple[int, bytes]],
) -> bytes:
    """
    Reconstruye el secreto mediante interpolación
    de Lagrange en GF(2^8).

    Matemáticamente son suficientes 2 shares porque
    el esquema utilizado es 2-of-4.

    La política de exigir mínimo 3 shares se aplicará
    posteriormente en el servicio de la CA.
    """

    if len(shares) < THRESHOLD:
        raise ValueError(
            f"Se necesitan al menos {THRESHOLD} shares."
        )

    secret_length = len(shares[0][1])

    for x, data in shares:

        if x == 0:
            raise ValueError(
                "El identificador x no puede ser 0."
            )

        if len(data) != secret_length:
            raise ValueError(
                "Los shares tienen longitudes diferentes."
            )

    x_values = [x for x, _ in shares]

    if len(set(x_values)) != len(x_values):
        raise ValueError(
            "No puede haber shares duplicados."
        )

    secret = bytearray(secret_length)

    for byte_index in range(secret_length):

        value = 0

        for i, (x_i, share_i) in enumerate(shares):

            basis = 1

            for j, (x_j, _) in enumerate(shares):

                if i == j:
                    continue

                numerator = x_j
                denominator = x_i ^ x_j

                basis = _gf_mul(
                    basis,
                    _gf_mul(
                        numerator,
                        _gf_inverse(denominator),
                    ),
                )

            value ^= _gf_mul(
                share_i[byte_index],
                basis,
            )

        secret[byte_index] = value

    return bytes(secret)