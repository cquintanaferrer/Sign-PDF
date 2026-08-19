# 🔒 Guía de Integración: Consumo del Servicio de CA

Esta guía describe cómo cualquier aplicación o cliente externo puede interactuar con la **API del Servicio de Autoridad Certificadora (CA)** para solicitar y descargar certificados X.509.

---

## 💡 Aspectos Clave de la Arquitectura

1. **Flujo Asíncrono:** La emisión de un certificado no siempre es instantánea (puede requerir aprobación de un administrador).
2. **Seguridad Primaria:** La aplicación cliente **NUNCA** debe enviar su clave privada (`.key`). Solo debe enviar la solicitud de firma de certificado (`.csr`).
3. **Flujo en 2 Pasos:**
   1. **Enviar la CSR** `POST /api/csr` $\rightarrow$ Obtener un `request_id`.
   2. **Consultar/Descargar** `GET /api/csr/{request_id}` $\rightarrow$ Verificar el estado y obtener el archivo `.pem`.


# Solicitud de certificados a la CA

Una aplicación externa puede solicitar un certificado digital a la Autoridad Certificadora (CA) mediante una CSR (Certificate Signing Request).

El flujo es:

```text
Aplicación cliente
       │
       │ Genera clave privada P-256
       │ Genera CSR
       ▼
POST /api/csr
       │
       ▼
   CSR PENDING
       │
       │ Administrador de la CA
       │ proporciona 3/4 fragmentos
       ▼
Firma del certificado
       │
       ▼
   CSR ISSUED
       │
       ▼
GET /api/csr/{request_id}
       │
       ▼
Aplicación cliente recibe
su certificado X.509
```

---

## Paso 1: Generar la clave privada y la CSR

La aplicación cliente debe generar **localmente** su par de claves y su CSR.

La clave privada **nunca debe enviarse a la CA**.

La CA únicamente recibe la CSR, que contiene la clave pública del solicitante.

### Generar una clave privada ECDSA P-256

```bash
openssl ecparam \
  -name prime256v1 \
  -genkey \
  -noout \
  -out mi_servicio.key
```

La clave privada debe almacenarse de forma segura.

### Generar la CSR

```bash
openssl req \
  -new \
  -key mi_servicio.key \
  -out mi_servicio.csr \
  -subj "/CN=mi-servicio.local/O=MiEmpresa"
```

Se puede comprobar la CSR con:

```bash
openssl req \
  -in mi_servicio.csr \
  -text \
  -noout
```

La CSR debe utilizar **ECDSA P-256**.

---

# Paso 2: Enviar la CSR a la CA

La aplicación cliente envía el archivo `.csr` mediante `multipart/form-data`.

### Endpoint

```http
POST /api/csr
```

### Content-Type

```text
multipart/form-data
```

### Parámetros

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `csr` | Archivo | Sí | CSR en formato PEM |

### Ejemplo con cURL

```bash
curl -X POST \
  "http://<IP_O_DOMINIO_CA>:8000/api/csr" \
  -F "csr=@mi_servicio.csr;type=application/pkcs10"
```

### Respuesta

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
  "status": "PENDING",
  "requester_username": "CN=mi-servicio.local,O=MiEmpresa",
  "algorithm": "ECDSA P-256 / SHA-256",
  "created_at": "2026-08-13T12:00:00"
}
```

> **IMPORTANTE:** La aplicación debe almacenar el campo `id`. Este UUID identifica la solicitud y será utilizado posteriormente para consultar el estado y obtener el certificado.

---

# Paso 3: La CA procesa la solicitud

La CSR queda almacenada en PostgreSQL con estado:

```text
PENDING
```

El administrador de la CA puede visualizar las solicitudes pendientes desde el frontend administrativo.

Para emitir el certificado, el administrador debe proporcionar al menos:

```text
3 de 4 fragmentos
```

junto con las contraseñas correspondientes de los custodios.

La CA realiza:

```text
Fragmentos cifrados
       ↓
Descifrado con las contraseñas
       ↓
Reconstrucción mediante SLIP-0039
       ↓
Verificación SHA-256 de la clave reconstruida
       ↓
Firma de la CSR
       ↓
Certificado X.509
```

La clave privada de la CA se reconstruye únicamente de forma temporal durante la operación de firma.

---

# Paso 4: Consultar el estado de la solicitud

La aplicación cliente puede consultar periódicamente el estado de su solicitud utilizando el `request_id`.

### Endpoint

```http
GET /api/csr/{request_id}
```

### Ejemplo

```bash
curl -X GET \
  "http://<IP_O_DOMINIO_CA>:8000/api/csr/a1b2c3d4-e5f6-7890-abcd-1234567890ab"
```

---

## Solicitud pendiente

Mientras el administrador todavía no haya emitido el certificado:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
  "status": "PENDING",
  "requester_username": "CN=mi-servicio.local,O=MiEmpresa",
  "algorithm": "ECDSA P-256 / SHA-256",
  "created_at": "2026-08-13T12:00:00",
  "processed_at": null
}
```

La aplicación puede continuar realizando polling hasta que el estado cambie a:

```text
ISSUED
```

---

# Paso 5: Certificado emitido

Cuando el administrador haya firmado la solicitud, el estado será:

```text
ISSUED
```

La respuesta incluirá el certificado X.509 y sus metadatos:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
  "status": "ISSUED",
  "requester_username": "CN=mi-servicio.local,O=MiEmpresa",
  "algorithm": "ECDSA P-256 / SHA-256",
  "created_at": "2026-08-13T12:00:00",
  "processed_at": "2026-08-13T12:15:00",
  "certificate": "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----\n",
  "serial_number": "4815162342",
  "subject": "CN=mi-servicio.local,O=MiEmpresa",
  "issuer": "CN=Internal Root CA",
  "issued_at": "2026-08-13T12:15:00+00:00",
  "expires_at": "2036-08-11T12:15:00+00:00"
}
```

---

# Paso 6: Almacenar el certificado

Cuando la respuesta tenga:

```json
"status": "ISSUED"
```

la aplicación cliente debe guardar el contenido de:

```json
"certificate"
```

como un archivo PEM.

Por ejemplo:

```text
mi_servicio.crt
```

El archivo tendrá la estructura:

```text
-----BEGIN CERTIFICATE-----
MIIB...
...
-----END CERTIFICATE-----
```

---

# Verificar el certificado

La aplicación cliente puede inspeccionar el certificado con:

```bash
openssl x509 \
  -in mi_servicio.crt \
  -text \
  -noout
```

También puede comprobar que la clave pública contenida en el certificado corresponde a la clave privada utilizada para generar la CSR:

```bash
openssl pkey \
  -in mi_servicio.key \
  -pubout \
  -outform DER \
  | sha256sum
```

y:

```bash
openssl x509 \
  -in mi_servicio.crt \
  -pubkey \
  -noout \
  | openssl pkey \
      -pubin \
      -outform DER \
  | sha256sum
```

Los dos valores SHA-256 deben ser iguales.

---

# Códigos de error

| Código HTTP | Causa probable | Solución |
|---|---|---|
| `400 Bad Request` | La CSR no es válida o no utiliza el formato esperado | Validar la CSR con OpenSSL |
| `404 Not Found` | El `request_id` no existe | Comprobar el UUID utilizado |
| `422 Unprocessable Entity` | Falta el campo `csr` | Verificar el nombre del campo `multipart/form-data` |
| `500 Internal Server Error` | Error interno de la CA | Revisar los logs del servicio |

### Validar una CSR

```bash
openssl req \
  -in mi_servicio.csr \
  -text \
  -noout
```

---

# Resumen de endpoints para aplicaciones cliente

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/csr` | Solicitar un certificado enviando una CSR |
| `GET` | `/api/csr/{request_id}` | Consultar el estado y obtener el certificado emitido |

> **Nota:** Los endpoints administrativos de la CA, como la visualización de CSR pendientes y la firma de certificados, no forman parte de la API destinada a las aplicaciones solicitantes.

Código de prueba usado:

import sys
from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent

API_URL = "http://127.0.0.1:8000"

REQUEST_ID = sys.argv[1] if len(sys.argv) > 1 else None


def submit_csr() -> str:
    csr_path = BASE_DIR / "test_request.csr"

    if not csr_path.exists():
        raise FileNotFoundError(
            f"No existe la CSR: {csr_path}"
        )

    with open(csr_path, "rb") as file:
        response = requests.post(
            f"{API_URL}/api/csr",
            files={
                "csr": (
                    "test_request.csr",
                    file,
                    "application/pkcs10",
                )
            },
            timeout=10,
        )

    response.raise_for_status()

    data = response.json()

    print("CSR enviada correctamente")
    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")

    return data["id"]


def get_certificate(request_id: str):
    response = requests.get(
        f"{API_URL}/api/csr/{request_id}",
        timeout=10,
    )

    response.raise_for_status()

    data = response.json()

    print()
    print("=" * 60)
    print("ESTADO DE LA SOLICITUD")
    print("=" * 60)

    print(f"Request ID: {data['id']}")
    print(f"Estado: {data['status']}")
    print(f"Solicitante: {data['requester_username']}")

    if data["status"] != "ISSUED":
        print()
        print("El certificado todavía no ha sido emitido.")
        return

    certificate = data.get("certificate")

    if not certificate:
        print()
        print(
            "La solicitud está marcada como ISSUED, "
            "pero no contiene el certificado."
        )
        return

    certificate_path = (
        BASE_DIR / "received_certificate.pem"
    )

    certificate_path.write_text(
        certificate,
        encoding="utf-8",
    )

    print()
    print("=" * 60)
    print("CERTIFICADO DISPONIBLE")
    print("=" * 60)

    print(f"Serial: {data['serial_number']}")
    print(f"Subject: {data['subject']}")
    print(f"Issuer: {data['issuer']}")
    print(f"Algoritmo: {data['algorithm']}")
    print(f"Emitido: {data['issued_at']}")
    print(f"Expira: {data['expires_at']}")

    print()
    print(f"Certificado guardado en:")
    print(certificate_path)


def main():
    if REQUEST_ID:
        get_certificate(REQUEST_ID)
        return

    request_id = submit_csr()

    print()
    print(
        "La CSR está pendiente de aprobación."
    )
    print(
        "Guarda este Request ID para consultar "
        "el certificado después:"
    )
    print(request_id)


if __name__ == "__main__":
    main()