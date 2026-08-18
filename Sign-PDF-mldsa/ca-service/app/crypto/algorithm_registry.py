from cryptography.hazmat.primitives.asymmetric import ec, mldsa


ECDSA_PROFILE = "ECDSA_P256"
MLDSA65_PROFILE = "ML_DSA_65"

ECDSA_LABEL = "ECDSA P-256 / SHA-256"
MLDSA65_LABEL = "ML-DSA-65"


_ALIASES = {
    "ECDSA": ECDSA_PROFILE,
    "ECDSA_P256": ECDSA_PROFILE,
    "ECDSA-P256": ECDSA_PROFILE,
    "P256": ECDSA_PROFILE,
    ECDSA_LABEL.upper(): ECDSA_PROFILE,
    "MLDSA": MLDSA65_PROFILE,
    "MLDSA65": MLDSA65_PROFILE,
    "ML_DSA_65": MLDSA65_PROFILE,
    "ML-DSA-65": MLDSA65_PROFILE,
    MLDSA65_LABEL.upper(): MLDSA65_PROFILE,
}


def normalize_profile(value: str | None) -> str:
    """
    Convierte los nombres que acepta la API a un identificador interno.

    Se mantiene ECDSA como valor por defecto para conservar compatibilidad
    con las llamadas existentes del frontend de la CA.
    """
    if value is None:
        return ECDSA_PROFILE

    normalized = value.strip().upper()

    try:
        return _ALIASES[normalized]
    except KeyError as exc:
        raise ValueError(
            "Algoritmo no soportado. Use ECDSA_P256 o ML_DSA_65."
        ) from exc


def algorithm_label(profile: str | None) -> str:
    profile = normalize_profile(profile)

    if profile == ECDSA_PROFILE:
        return ECDSA_LABEL

    if profile == MLDSA65_PROFILE:
        return MLDSA65_LABEL

    raise ValueError("Perfil criptográfico no soportado.")


def profile_from_algorithm_label(value: str) -> str:
    return normalize_profile(value)


def detect_public_key_profile(public_key) -> str:
    """Detecta el perfil admitido a partir de una clave pública X.509."""

    if isinstance(public_key, ec.EllipticCurvePublicKey):
        if public_key.curve.name != "secp256r1":
            raise ValueError("La clave EC debe utilizar la curva P-256.")
        return ECDSA_PROFILE

    if isinstance(public_key, mldsa.MLDSA65PublicKey):
        return MLDSA65_PROFILE

    if isinstance(
        public_key,
        (mldsa.MLDSA44PublicKey, mldsa.MLDSA87PublicKey),
    ):
        raise ValueError(
            "El proyecto admite ML-DSA-65; ML-DSA-44 y ML-DSA-87 no están habilitados."
        )

    raise ValueError(
        "La CSR debe utilizar ECDSA P-256 o ML-DSA-65."
    )
