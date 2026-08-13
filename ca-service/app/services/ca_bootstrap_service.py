import hashlib
from app.core.config import settings
from app.crypto.encryption import encrypt_fragment
from app.crypto.keys import (
    certificate_fingerprint,
    generate_ca_private_key,
    generate_root_certificate,
    serialize_certificate,
    serialize_public_key,
)
from app.crypto.slip39 import split_secret
from app.models.ca import CertificateAuthority
from app.models.ca_fragment import CAFragment
from app.services.ca_service import get_ca

CUSTODIANS = [
    "autority1",
    "autority2",
    "autority3",
    "autority4",
]


def bootstrap_ca(db):
    """
    Inicializa la Autoridad Certificadora.

    Flujo:

        P-256
          ↓
        certificado raíz
          ↓
        private scalar
          ↓
        SLIP-0039 3-of-4
          ↓
        cifrado individual de los 4 shares
          ↓
        almacenamiento de los fragmentos cifrados
    """

    # --------------------------------------------------
    # 1. Comprobar si la CA ya existe
    # --------------------------------------------------

    existing_ca = get_ca(db)

    if existing_ca and existing_ca.initialized:
        raise ValueError(
            "La Autoridad Certificadora ya fue inicializada."
        )

    # --------------------------------------------------
    # 2. Generar clave privada P-256
    # --------------------------------------------------

    private_key = generate_ca_private_key()
    public_key_pem = serialize_public_key(private_key)
    private_value = (
        private_key
        .private_numbers()
        .private_value
    )

    private_scalar = private_value.to_bytes(
        32,
        byteorder="big",
    )

    private_key_hash = hashlib.sha256(
        private_scalar
    ).hexdigest()

    # --------------------------------------------------
    # 3. Generar certificado raíz
    # --------------------------------------------------

    certificate = generate_root_certificate(
        private_key
    )

    certificate_pem = serialize_certificate(
        certificate
    )

    fingerprint = certificate_fingerprint(
        certificate
    )

    serial_number = str(
        certificate.serial_number
    )

    # --------------------------------------------------
    # 4. Generar los 4 shares mediante SLIP-0039
    # --------------------------------------------------

    shares = split_secret(
        private_scalar
    )

    if len(shares) != 4:
        raise RuntimeError(
            "SLIP-0039 no generó exactamente "
            "4 fragmentos."
        )

    # --------------------------------------------------
    # 5. Crear/actualizar registro de CA
    # --------------------------------------------------

    if existing_ca is None:

        ca = CertificateAuthority(
        initialized=True,
        root_certificate=(
            certificate_pem.decode("utf-8")
        ),
        public_key=public_key_pem,
        serial_number=serial_number,
        fingerprint=fingerprint,
        algorithm="ECDSA P-256 / SHA-256",
        issued_at=certificate.not_valid_before_utc,
        expires_at=certificate.not_valid_after_utc,
        private_key_hash=private_key_hash
        )

        db.add(ca)

        # Necesitamos que SQLAlchemy obtenga el ID
        # antes de crear los fragmentos.
        db.flush()

    else:

        ca = existing_ca
        ca.public_key = public_key_pem
        ca.initialized = True
        ca.root_certificate = (
            certificate_pem.decode("utf-8")
        )
        ca.serial_number = serial_number
        ca.fingerprint = fingerprint
        ca.algorithm = (
            "ECDSA P-256 / SHA-256"
        )
        ca.issued_at = (
            certificate.not_valid_before_utc
        )
        ca.expires_at = (
            certificate.not_valid_after_utc
        )

    # --------------------------------------------------
    # 6. Contraseñas de los custodios
    # --------------------------------------------------

    passwords = [
        settings.authority1_password,
        settings.authority2_password,
        settings.authority3_password,
        settings.authority4_password,
    ]

    # Verificación defensiva
    if len(passwords) != 4:
        raise RuntimeError(
            "Deben existir exactamente cuatro "
            "contraseñas de custodios."
        )

    # --------------------------------------------------
    # 7. Cifrar y guardar cada fragmento
    # --------------------------------------------------

    for fragment_id, (share, password, owner) in enumerate(
        zip(
            shares,
            passwords,
            CUSTODIANS,
        ),
        start=1,
    ):

        encrypted = encrypt_fragment(
            fragment=share,
            password=password,
            fragment_id=fragment_id,
        )

        fragment = CAFragment(
            fragment_id=fragment_id,
            owner_username=owner,
            encrypted_content=encrypted.decode(
                "utf-8"
            ),
            ca_id=ca.id,
        )

        db.add(fragment)

    # --------------------------------------------------
    # 8. Guardar todo
    # --------------------------------------------------

    db.commit()

    # --------------------------------------------------
    # 9. Respuesta al frontend
    # --------------------------------------------------

    return {
        "message": (
            "Autoridad Certificadora "
            "generada correctamente."
        ),

        "rootCertificate": {
            "certificate": (
                certificate_pem.decode("utf-8")
            ),
            "serialNumber": serial_number,
            "fingerprint": fingerprint,
            "algorithm": (
                "ECDSA P-256 / SHA-256"
            ),
            "issuedAt": (
                certificate.not_valid_before_utc
            ),
            "expiresAt": (
                certificate.not_valid_after_utc
            ),
        },

        "fragments": [
            {
                "id": index,
                "owner": owner,
            }
            for index, owner in enumerate(
                CUSTODIANS,
                start=1,
            )
        ],
    }