import hashlib

from app.core.config import settings
from app.crypto.algorithm_registry import (
    ECDSA_PROFILE,
    MLDSA65_PROFILE,
    algorithm_label,
    normalize_profile,
)
from app.crypto.encryption import encrypt_fragment
from app.crypto.keys import (
    ca_secret_bytes,
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


def bootstrap_ca(
    db,
    algorithm: str = ECDSA_PROFILE,
):
    """
    Inicializa una raíz lógica dentro del mismo servicio de CA.

    ECDSA_P256:
        scalar P-256 de 32 bytes -> SLIP-0039 3-of-4

    ML_DSA_65:
        seed ML-DSA-65 de 32 bytes -> SLIP-0039 3-of-4

    Las dos raíces son independientes y pueden coexistir en PostgreSQL.
    """
    profile = normalize_profile(algorithm)
    stored_algorithm = algorithm_label(profile)

    existing_ca = get_ca(db, algorithm=profile)

    if existing_ca and existing_ca.initialized:
        raise ValueError(
            f"La Autoridad Certificadora {stored_algorithm} ya fue inicializada."
        )

    private_key = generate_ca_private_key(profile)
    public_key_pem = serialize_public_key(private_key)
    private_secret = ca_secret_bytes(private_key, profile)

    private_key_hash = hashlib.sha256(private_secret).hexdigest()

    certificate = generate_root_certificate(private_key)
    certificate_pem = serialize_certificate(certificate)
    fingerprint = certificate_fingerprint(certificate)
    serial_number = str(certificate.serial_number)

    shares = split_secret(private_secret)

    if len(shares) != 4:
        raise RuntimeError("SLIP-0039 no generó exactamente 4 fragmentos.")

    ca = CertificateAuthority(
        initialized=True,
        root_certificate=certificate_pem.decode("utf-8"),
        public_key=public_key_pem,
        serial_number=serial_number,
        fingerprint=fingerprint,
        algorithm=stored_algorithm,
        issued_at=certificate.not_valid_before_utc,
        expires_at=certificate.not_valid_after_utc,
        private_key_hash=private_key_hash,
        is_active=True,
        generation=1,
    )

    db.add(ca)
    db.flush()

    # Protección temporal en servidor: los shares nunca se guardan en claro.
    # Estas contraseñas son las credenciales de las cuentas custodias y NO
    # son la contraseña final del archivo .sss. Al descargar, cada custodio
    # elige una contraseña independiente y el share se vuelve a cifrar con ella.
    passwords = [
        settings.authority1_password,
        settings.authority2_password,
        settings.authority3_password,
        settings.authority4_password,
    ]

    for fragment_id, (share, password, owner) in enumerate(
        zip(shares, passwords, CUSTODIANS),
        start=1,
    ):
        encrypted = encrypt_fragment(
            fragment=share,
            password=password,
            fragment_id=fragment_id,
        )

        db.add(
            CAFragment(
                fragment_id=fragment_id,
                owner_username=owner,
                encrypted_content=encrypted.decode("utf-8"),
                ca_id=ca.id,
            )
        )

    db.commit()

    return {
        "message": f"Autoridad Certificadora {stored_algorithm} generada correctamente.",
        "profile": profile,
        "rootCertificate": {
            "certificate": certificate_pem.decode("utf-8"),
            "serialNumber": serial_number,
            "fingerprint": fingerprint,
            "algorithm": stored_algorithm,
            "issuedAt": certificate.not_valid_before_utc,
            "expiresAt": certificate.not_valid_after_utc,
        },
        "fragments": [
            {
                "id": index,
                "owner": owner,
                "algorithm": profile,
            }
            for index, owner in enumerate(CUSTODIANS, start=1)
        ],
    }
