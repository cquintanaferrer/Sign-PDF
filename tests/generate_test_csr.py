from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID


private_key = ec.generate_private_key(
    ec.SECP256R1()
)

subject = x509.Name(
    [
        x509.NameAttribute(
            NameOID.COUNTRY_NAME,
            "MX",
        ),
        x509.NameAttribute(
            NameOID.ORGANIZATION_NAME,
            "SignPDF Test",
        ),
        x509.NameAttribute(
            NameOID.COMMON_NAME,
            "usuario-prueba",
        ),
    ]
)

csr = (
    x509.CertificateSigningRequestBuilder()
    .subject_name(subject)
    .sign(
        private_key,
        hashes.SHA256(),
    )
)

with open(
    "test_request.csr",
    "wb",
) as file:

    file.write(
        csr.public_bytes(
            serialization.Encoding.PEM
        )
    )

with open(
    "test_user_private_key.pem",
    "wb",
) as file:

    file.write(
        private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )

print("CSR generada:")
print("test_request.csr")

print("Clave privada de prueba:")
print("test_user_private_key.pem")