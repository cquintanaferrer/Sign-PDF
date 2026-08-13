from cryptography.hazmat.primitives.asymmetric import ec

from app.crypto.slip39 import (
    reconstruct_secret,
    split_secret,
)


# Generar una clave P-256
private_key = ec.generate_private_key(
    ec.SECP256R1()
)


# Obtener el escalar privado
private_value = (
    private_key
    .private_numbers()
    .private_value
)


# P-256 = 256 bits = 32 bytes
secret = private_value.to_bytes(
    32,
    byteorder="big",
)


print(
    "Private scalar original:"
)
print(secret.hex())


# SLIP-0039 3-of-4
shares = split_secret(secret)


print("\nShares generados:")

for index, share in enumerate(
    shares,
    start=1,
):
    print(f"\nShare {index}:")
    print(share)


# Reconstruir utilizando 3
reconstructed = reconstruct_secret(
    [
        shares[0],
        shares[2],
        shares[3],
    ]
)


print(
    "\nPrivate scalar reconstruido:"
)

print(
    reconstructed.hex()
)


assert reconstructed == secret


print(
    "\n✓ El scalar P-256 fue reconstruido correctamente."
)


# Volver a construir la clave P-256
reconstructed_key = ec.derive_private_key(
    int.from_bytes(
        reconstructed,
        byteorder="big",
    ),
    ec.SECP256R1(),
)


# Comparar las claves públicas
original_public = (
    private_key
    .public_key()
    .public_numbers()
)

reconstructed_public = (
    reconstructed_key
    .public_key()
    .public_numbers()
)


assert (
    original_public.x
    == reconstructed_public.x
)

assert (
    original_public.y
    == reconstructed_public.y
)


print(
    "✓ La clave pública P-256 coincide."
)