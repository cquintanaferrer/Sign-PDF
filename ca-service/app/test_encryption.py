from app.crypto.encryption import (
    decrypt_fragment,
    encrypt_fragment,
)


fragment = (
    "alien lily academic acne agree western "
    "invasion column daisy formal shadow antenna"
)

password = "password-segura-authority1"

fragment_id = 1


print("Fragmento original:")
print(fragment)


encrypted = encrypt_fragment(
    fragment=fragment,
    password=password,
    fragment_id=fragment_id,
)


print("\nFragmento cifrado:")
print(encrypted.decode())


recovered_id, recovered_fragment = decrypt_fragment(
    encrypted_data=encrypted,
    password=password,
)


print("\nFragmento recuperado:")
print(recovered_fragment)


assert recovered_id == fragment_id
assert recovered_fragment == fragment


print(
    "\n✓ AES-256-GCM + Argon2id funciona correctamente."
)

try:
    decrypt_fragment(
        encrypted_data=encrypted,
        password="contraseña-incorrecta",
    )

    raise AssertionError(
        "Se permitió descifrar con contraseña incorrecta."
    )

except ValueError:
    print(
        "✓ Contraseña incorrecta correctamente rechazada."
    )

tampered = bytearray(encrypted)

tampered[-10] ^= 1

try:
    decrypt_fragment(
        encrypted_data=bytes(tampered),
        password=password,
    )

    raise AssertionError(
        "Se permitió descifrar un archivo alterado."
    )

except ValueError:
    print(
        "✓ Archivo alterado correctamente rechazado."
    )