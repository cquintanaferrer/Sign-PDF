from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ml_dsa
from cryptography.x509.oid import NameOID


private_key = ml_dsa.MLDSA65PrivateKey.generate()


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
            "usuario-prueba-mldsa",
        ),
    ]
)


csr = (
    x509.CertificateSigningRequestBuilder()
    .subject_name(subject)
    .sign(
        private_key,
        algorithm=None,
    )
)


with open(
    "test_mldsa_request.csr",
    "wb",
) as file:

    file.write(
        csr.public_bytes(
            serialization.Encoding.PEM
        )
    )


with open(
    "test_mldsa_user_private_key.pem",
    "wb",
) as file:

    file.write(
        private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )


print("CSR ML-DSA-65 generada:")
print("test_mldsa_request.csr")

print("Clave privada ML-DSA-65 de prueba:")
print("test_mldsa_user_private_key.pem")