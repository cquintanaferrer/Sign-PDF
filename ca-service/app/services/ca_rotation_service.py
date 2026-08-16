import hashlib
from datetime import datetime, timezone
from typing import Sequence

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtensionOID

from app.crypto.encryption import decrypt_fragment
from app.models.ca_fragment import CAFragment
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
from app.services.fragment_service import (
    FragmentInput,
    reconstruct_ca_secret,
)


CUSTODIANS = [
    "autority1",
    "autority2",
    "autority3",
    "autority4",
]


def _private_scalar_to_key(
    private_scalar: bytes,
) -> ec.EllipticCurvePrivateKey:
    """
    Convierte el scalar privado de 32 bytes
    nuevamente en una clave privada P-256.
    """

    if len(private_scalar) != 32:
        raise ValueError(
            "El scalar privado de la CA debe tener "
            "exactamente 32 bytes."
        )

    private_value = int.from_bytes(
        private_scalar,
        byteorder="big",
    )

    return ec.derive_private_key(
        private_value,
        ec.SECP256R1(),
    )


def _build_cross_signed_certificate(
    old_ca_certificate: x509.Certificate,
    new_ca_certificate: x509.Certificate,
    old_ca_private_key: ec.EllipticCurvePrivateKey,
) -> x509.Certificate:
    """
    Crea un certificado para la nueva CA firmado
    por la CA anterior.

    El resultado NO es el root autofirmado de la
    nueva CA. Es el certificado cross-signed:

        issuer = CA anterior
        subject = CA nueva
        public_key = CA nueva
    """

    now = datetime.now(timezone.utc)

    # --------------------------------------------------
    # Comprobar que la clave usada para firmar
    # corresponde al certificado antiguo.
    # --------------------------------------------------

    old_public_from_private = (
        old_ca_private_key.public_key()
    )

    old_public_from_certificate = (
        old_ca_certificate.public_key()
    )

    if (
        old_public_from_private.public_numbers()
        != old_public_from_certificate.public_numbers()
    ):
        raise ValueError(
            "La clave reconstruida no corresponde "
            "al certificado de la CA anterior."
        )

    # --------------------------------------------------
    # La validez del cross-certificate no puede superar
    # la validez de ninguna de las dos CAs.
    # --------------------------------------------------

    not_valid_before = max(
        now,
        old_ca_certificate.not_valid_before_utc,
        new_ca_certificate.not_valid_before_utc,
    )

    not_valid_after = min(
        old_ca_certificate.not_valid_after_utc,
        new_ca_certificate.not_valid_after_utc,
    )

    if not_valid_before >= not_valid_after:
        raise ValueError(
            "No existe un periodo de validez válido "
            "para el certificado cruzado."
        )

    new_public_key = new_ca_certificate.public_key()

    if not isinstance(
        new_public_key,
        ec.EllipticCurvePublicKey,
    ):
        raise ValueError(
            "La nueva CA debe utilizar una clave EC."
        )

    if new_public_key.curve.name != "secp256r1":
        raise ValueError(
            "La nueva CA debe utilizar P-256."
        )

    # --------------------------------------------------
    # Construcción del certificado cruzado
    # --------------------------------------------------

    builder = (
        x509.CertificateBuilder()
        .subject_name(
            new_ca_certificate.subject
        )
        .issuer_name(
            old_ca_certificate.subject
        )
        .public_key(
            new_public_key
        )
        .serial_number(
            x509.random_serial_number()
        )
        .not_valid_before(
            not_valid_before
        )
        .not_valid_after(
            not_valid_after
        )
    )

    # --------------------------------------------------
    # La nueva CA debe seguir siendo una CA.
    # --------------------------------------------------

    builder = builder.add_extension(
        x509.BasicConstraints(
            ca=True,
            path_length=0,
        ),
        critical=True,
    )

    builder = builder.add_extension(
        x509.KeyUsage(
            digital_signature=False,
            content_commitment=False,
            key_encipherment=False,
            data_encipherment=False,
            key_agreement=False,
            key_cert_sign=True,
            crl_sign=True,
            encipher_only=False,
            decipher_only=False,
        ),
        critical=True,
    )

    # --------------------------------------------------
    # Subject Key Identifier de la nueva CA
    # --------------------------------------------------

    builder = builder.add_extension(
        x509.SubjectKeyIdentifier.from_public_key(
            new_public_key
        ),
        critical=False,
    )

    # --------------------------------------------------
    # Authority Key Identifier de la CA antigua
    # --------------------------------------------------

    builder = builder.add_extension(
        x509.AuthorityKeyIdentifier.from_issuer_public_key(
            old_public_from_certificate
        ),
        critical=False,
    )

    # --------------------------------------------------
    # Firmar con la CA antigua
    # --------------------------------------------------

    return builder.sign(
        private_key=old_ca_private_key,
        algorithm=hashes.SHA256(),
    )


def rotate_ca(
    db,
    fragments: Sequence[FragmentInput],
) -> dict:
    """
    Realiza una rotación completa de la CA.

    Flujo:

        CA anterior
            ↓
        reconstrucción 3-of-4
            ↓
        clave privada temporal
            ↓
        generación CA nueva
            ↓
        cross-signing
            ↓
        nuevos shares SLIP-0039
            ↓
        persistencia de CA nueva
            ↓
        CA anterior pasa a inactive

    La clave privada completa de ninguna CA
    se persiste.
    """

    # ==================================================
    # 1. Obtener CA activa
    # ==================================================

    old_ca = (
        db.query(CertificateAuthority)
        .filter(
            CertificateAuthority.initialized.is_(True),
            CertificateAuthority.is_active.is_(True),
        )
        .order_by(
            CertificateAuthority.generation.desc()
        )
        .with_for_update()
        .first()
    )

    if old_ca is None:
        raise ValueError(
            "No existe una CA activa para rotar."
        )

    # ==================================================
    # 2. Validar número de fragmentos
    # ==================================================

    if len(fragments) < 3:
        raise ValueError(
            "La rotación requiere al menos "
            "3 fragmentos de la CA actual."
        )

    if len(fragments) > 4:
        raise ValueError(
            "No se pueden proporcionar más de "
            "4 fragmentos."
        )

# ==================================================
    # 3. Validar contraseñas y fragmentos duplicados
    # ==================================================

    fragment_ids: set[int] = set()

    for fragment in fragments:

        if not fragment.password:
            raise ValueError(
                "La contraseña de un custodio "
                "no puede estar vacía."
            )

        try:
            fragment_id, _ = decrypt_fragment(
                encrypted_data=fragment.encrypted_content,
                password=fragment.password,
            )

        except ValueError as exc:
            raise ValueError(
                "No fue posible descifrar uno de "
                "los fragmentos proporcionados."
            ) from exc

        if fragment_id in fragment_ids:
            raise ValueError(
                f"El fragmento {fragment_id} "
                "fue proporcionado más de una vez."
            )

        fragment_ids.add(fragment_id)
    # ==================================================
    # 3. Reconstruir clave privada de CA anterior
    # ==================================================

    private_scalar = reconstruct_ca_secret(
        fragments=list(fragments),
        expected_hash=old_ca.private_key_hash,
    )

    old_ca_private_key = None
    new_ca_private_key = None
    new_private_scalar = None

    try:
        # ==============================================
        # 4. Reconstruir objeto de clave P-256
        # ==============================================

        old_ca_private_key = (
            _private_scalar_to_key(
                private_scalar
            )
        )

        # ==============================================
        # 5. Cargar certificado anterior
        # ==============================================

        old_ca_certificate = (
            x509.load_pem_x509_certificate(
                old_ca.root_certificate.encode(
                    "utf-8"
                )
            )
        )

        # ==============================================
        # 6. Verificar que la clave corresponde
        # ==============================================

        old_public_from_private = (
            old_ca_private_key.public_key()
        )

        old_public_from_certificate = (
            old_ca_certificate.public_key()
        )

        if (
            old_public_from_private.public_numbers()
            != old_public_from_certificate.public_numbers()
        ):
            raise ValueError(
                "La clave reconstruida no corresponde "
                "a la CA almacenada."
            )

        # ==============================================
        # 7. Generar nueva clave P-256
        # ==============================================

        new_ca_private_key = (
            generate_ca_private_key()
        )

        new_public_key_pem = serialize_public_key(
            new_ca_private_key
        )

        new_private_value = (
            new_ca_private_key
            .private_numbers()
            .private_value
        )

        new_private_scalar = (
            new_private_value.to_bytes(
                32,
                byteorder="big",
            )
        )

        # ==============================================
        # 8. Generar nuevo root autofirmado
        # ==============================================

        new_root_certificate = (
            generate_root_certificate(
                new_ca_private_key
            )
        )

        # ==============================================
        # 9. Crear cross-certificate
        # ==============================================

        cross_certificate = (
            _build_cross_signed_certificate(
                old_ca_certificate=old_ca_certificate,
                new_ca_certificate=(
                    new_root_certificate
                ),
                old_ca_private_key=(
                    old_ca_private_key
                ),
            )
        )

        # ==============================================
        # 10. Serializar nueva CA
        # ==============================================

        new_root_pem = serialize_certificate(
            new_root_certificate
        )

        cross_certificate_pem = (
            serialize_certificate(
                cross_certificate
            )
        )

        fingerprint = certificate_fingerprint(
            new_root_certificate
        )

        serial_number = str(
            new_root_certificate.serial_number
        )

        private_key_hash = hashlib.sha256(
            new_private_scalar
        ).hexdigest()

        # ==============================================
        # 11. Generar nuevos fragmentos
        # ==============================================

        shares = split_secret(
            new_private_scalar
        )

        if len(shares) != 4:
            raise RuntimeError(
                "SLIP-0039 no generó exactamente "
                "4 fragmentos."
            )

        # ==============================================
        # 12. Crear nueva CA
        # ==============================================

        new_ca = CertificateAuthority(
            initialized=True,
            is_active=True,
            generation=(
                old_ca.generation + 1
            ),
            parent_ca_id=old_ca.id,
            root_certificate=(
                new_root_pem.decode("utf-8")
            ),
            cross_certificate=(
                cross_certificate_pem.decode(
                    "utf-8"
                )
            ),
            public_key=new_public_key_pem,
            serial_number=serial_number,
            fingerprint=fingerprint,
            algorithm="ECDSA P-256 / SHA-256",
            issued_at=(
                new_root_certificate
                .not_valid_before_utc
            ),
            expires_at=(
                new_root_certificate
                .not_valid_after_utc
            ),
            private_key_hash=private_key_hash,
        )

        db.add(new_ca)

        # Necesitamos el ID de la nueva CA
        # antes de crear los fragmentos.
        db.flush()

        # ==============================================
        # 13. Crear nuevos fragmentos
        # ==============================================

        from app.core.config import settings

        passwords = [
            settings.authority1_password,
            settings.authority2_password,
            settings.authority3_password,
            settings.authority4_password,
        ]

        if len(passwords) != 4:
            raise RuntimeError(
                "Deben existir exactamente cuatro "
                "contraseñas de custodios."
            )

        for fragment_id, (
            share,
            password,
            owner,
        ) in enumerate(
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
                encrypted_content=(
                    encrypted.decode("utf-8")
                ),
                ca_id=new_ca.id,
            )

            db.add(fragment)

        # ==============================================
        # 14. Desactivar CA anterior
        # ==============================================

        old_ca.is_active = False

        # ==============================================
        # 15. Confirmar transacción
        # ==============================================

        db.commit()

        db.refresh(new_ca)

        return {
            "message": (
                "La Autoridad Certificadora "
                "fue rotada correctamente."
            ),
            "previousCA": {
                "id": str(old_ca.id),
                "generation": old_ca.generation,
                "serialNumber": (
                    old_ca.serial_number
                ),
                "active": False,
            },
            "newCA": {
                "id": str(new_ca.id),
                "generation": new_ca.generation,
                "serialNumber": (
                    new_ca.serial_number
                ),
                "fingerprint": (
                    new_ca.fingerprint
                ),
                "algorithm": new_ca.algorithm,
                "issuedAt": (
                    new_ca.issued_at
                ),
                "expiresAt": (
                    new_ca.expires_at
                ),
                "crossCertificate": (
                    cross_certificate_pem.decode(
                        "utf-8"
                    )
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

    except Exception:
        db.rollback()
        raise

    finally:
        # ==============================================
        # 16. Eliminar referencias criptográficas
        # ==============================================

        old_ca_private_key = None
        new_ca_private_key = None
        private_scalar = None
        new_private_scalar = None