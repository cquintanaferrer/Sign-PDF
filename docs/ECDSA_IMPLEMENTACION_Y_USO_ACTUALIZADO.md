# SignPDF — ECDSA P-256: implementación, uso, pruebas e integración

## 1. Resumen rápido para el equipo

Este documento concentra la información necesaria para trabajar con el módulo ECDSA agregado a SignPDF. 

### Qué se hizo

Se implementó y probó el bloque criptográfico ECDSA del usuario:

```text
Cliente / navegador
├── generar llaves ECDSA P-256
├── exportar/importar private key PKCS#8
├── exportar/importar public key SPKI
├── crear y firmar CSR PKCS#10
├── firmar datos/archivos con ECDSA + SHA-256
└── verificar firmas

CA / Python
├── leer llaves públicas P-256
├── convertir firma raw r||s <-> DER
├── verificar firmas producidas por el navegador
└── leer y validar CSR producidas por el navegador
```

También se agregó una **demo web funcional** que permite probar visualmente la generación de llaves, CSR, carga de archivo, SHA-256, firma y verificación desde Firefox.

### Qué falta

Todavía faltan las piezas de integración del sistema completo:

```text
Endpoints HTTP reales para CSR y documentos        PENDIENTE
Emisión/entrega del certificate.crt del usuario    PENDIENTE INTEGRACIÓN
Protección de la private key con contraseña        PENDIENTE
Comprobar private key <-> certificate.crt           PENDIENTE
PyHanko prepare/finalize                            PENDIENTE
CMS/PAdES                                           PENDIENTE
PDF firmado final end-to-end                        PENDIENTE
ML-DSA-65                                           PENDIENTE
```

**Importante:** que falten endpoints HTTP no significa que falte la criptografía del cliente. Las funciones `generateKeyPair()`, `createEcdsaP256Csr()`, `sign()` y `verify()` ya están implementadas y se ejecutan localmente en el navegador. Lo que falta es conectarlas al backend real.

---

## 2. Lo que le importa para frontend del usuario

Edgar y Reinier deben trabajar principalmente con:

```text
user-frontend/src/crypto/
```

No necesitan volver a implementar ECDSA dentro de React.

### 2.1 Funciones que ya pueden usar

```ts
generateKeyPair()
exportPrivateKey()
exportPublicKey()
importPrivateKey()
importPublicKey()
createEcdsaP256Csr()
sign()
verify()
```

La implementación principal está en:

```text
user-frontend/src/crypto/ecdsa/EcdsaProvider.ts
user-frontend/src/crypto/ecdsa/csr.ts
```

### 2.2 Flujo que debe hacer la página real del cliente

La interfaz final puede usar el módulo así:

```text
Usuario se registra / inicia sesión
        ↓
Generar llaves localmente
        ↓
private_key.pem + public_key.pem
        ↓
Crear CSR localmente
        ↓
Enviar CSR al backend        ← endpoint aún pendiente
        ↓
Esperar certificate.crt      ← integración pendiente
        ↓
Seleccionar PDF + private key + certificate.crt
        ↓
Backend prepara bytes_to_sign con PyHanko
        ↓
Cliente ejecuta sign(bytes_to_sign, privateKey)
        ↓
Enviar signature al backend
        ↓
Backend finaliza CMS/PAdES
        ↓
Descargar PDF firmado
```

La **private key nunca debe enviarse al backend ni a la CA**.

### 2.3 Ejemplo de generación de llaves

```ts
import {
  EcdsaProvider,
  createEcdsaP256Csr,
} from "./crypto/ecdsa";

const provider = new EcdsaProvider();
const keys = await provider.generateKeyPair();
```

Exportación:

```ts
const privatePem = await provider.exportPrivateKey(keys.privateKey);
const publicPem = await provider.exportPublicKey(keys.publicKey);
```

Los archivos resultantes son:

```text
private_key.pem     PKCS#8
public_key.pem      SPKI
```

### 2.4 Crear CSR

```ts
const csrPem = await createEcdsaP256Csr(
  keys.privateKey,
  keys.publicKey,
  {
    commonName: nombre,
    email: correo,
  }
);
```

Resultado:

```text
-----BEGIN CERTIFICATE REQUEST-----
...
-----END CERTIFICATE REQUEST-----
```

La CSR contiene identidad, llave pública y una firma que demuestra posesión de la llave privada. **No contiene la llave privada**.

### 2.5 Firma local

Para datos normales o para una prueba:

```ts
const signature = await provider.sign(data, privateKey);
```

Para el PDF final, `data` no debe ser simplemente el archivo completo. El backend/PyHanko devolverá los `bytes_to_sign` exactos y el cliente hará:

```ts
const signature = await provider.sign(bytesToSign, privateKey);
```

En ECDSA, simplificando, ocurre esto:

Documento
   ↓
SHA-256
   ↓
Hash del documento
   ↓
ECDSA + llave privada
   ↓
(r, s)

La firma ECDSA propiamente dicha es el par:

(r, s)

### 2.6 Verificación local

```ts
const valid = await provider.verify(data, signature, publicKey);
```

Devuelve:

```text
true
false
```

### 2.7 Endpoints que necesitará la página real

Estos endpoints representan el contrato previsto para el frontend del usuario. **No todos están implementados todavía**:

```http
POST /api/users/register
POST /api/users/login
GET  /api/users/me

POST /api/csr/request
GET  /api/csr/my-status

POST /api/documents/sign/prepare
POST /api/documents/sign/finalize
GET  /api/documents/{id}
POST /api/documents/verify

GET  /api/ca/certificate
```

El módulo criptográfico ya está listo; los endpoints son la capa de comunicación que falta.

### 2.8 Qué debe reemplazarse de la demo

La demo actual simula:

```text
POST /api/csr/request
        ↓
202 / PENDING
```

Cuando exista el endpoint real,  sustituyen el mock por un `fetch()` real que diga Christian, pero **no cambian `createEcdsaP256Csr()`**.

Igualmente, la demo actual firma directamente los bytes del archivo para comprobar ECDSA. En producción, el flujo PDF debe reemplazar esos bytes por `bytes_to_sign` recibidos de `POST /api/documents/sign/prepare`.

---

## 3. Lo que le importa a Christian — CA y Python

Christian debe trabajar principalmente con:

```text
ca-service/app/crypto/csr.py
ca-service/app/crypto/client_ecdsa.py
```

No necesita utilizar `EcdsaProvider.ts` dentro de la CA.

### 3.1 Validar CSR

Cuando la CA reciba una CSR creada por el navegador:

```python
from app.crypto.csr import validate_csr

result = validate_csr(csr_pem)
```

El resultado permite consultar:

```python
result.common_name
result.email
result.algorithm
result.curve
result.signature_valid
result.csr
result.public_key
```

Valores esperados para este módulo:

```text
algorithm = ECDSA_P256
curve = P-256
signature_valid = True
```

La función comprueba que:

```text
la entrada sea una CSR PKCS#10 válida
tenga una llave EC
la curva sea P-256 / secp256r1
la firma use SHA-256
la firma de la CSR sea válida
```

Esto demuestra que quien creó la CSR posee la llave privada correspondiente a la llave pública incluida.

La validación de la CSR **no demuestra por sí sola que el nombre o correo sean verdaderos**. Esa parte corresponde a la política de emisión de la CA.

### 3.2 Verificar firmas producidas por el navegador

`client_ecdsa.py` permite a Python trabajar con la firma generada por Web Crypto.

Funciones principales:

```python
load_private_key()
load_public_key()
raw_signature_to_der()
der_signature_to_raw()
sign()
verify()
```

El uso más importante para la integración es:

```text
firma creada en navegador
        ↓
raw r||s de 64 bytes
        ↓
client_ecdsa.py
        ↓
conversión a DER
        ↓
cryptography.verify()
```

### 3.3 Integración con emisión de certificado

El flujo esperado es:

```text
CSR del usuario
    ↓
validate_csr()
    ↓
obtener public key + identidad
    ↓
CA reconstruye su llave según su flujo SLIP-39 3-de-4
    ↓
emite certificate.crt del usuario
```

El módulo ECDSA agregado no cambia el bootstrap, cifrado, SLIP-39 ni las llaves propias de la CA.

### 3.4 Fixtures que Christian puede usar

```text
examples/fixtures/sample_browser_csr.pem
examples/fixtures/sample_browser_public_key.pem
```

Son vectores de prueba públicos generados para comprobar interoperabilidad cliente ↔ Python.

No son credenciales reales y no contienen una llave privada.

---

## 4. Las pruebas importantes de lo que se acaba de implementar

Para evaluar **solo el módulo nuevo ECDSA/CSR**, las tres pruebas principales son:

```text
1. test_client_ecdsa.py          Python / interoperabilidad ECDSA
2. test_client_csr.py            Python / validación de CSR
3. demo web en Firefox           Web Crypto real en navegador
```

La compilación TypeScript es una comprobación adicional importante.

Las pruebas anteriores de AES-256-GCM, Argon2id y SLIP-39 pertenecen al código de Christian y **no cuentan como pruebas de este módulo nuevo**.

### 4.1 Prueba 1 — `test_client_ecdsa.py`

Ubicación:

```text
ca-service/tests/test_client_ecdsa.py
```

Desde `ca-service/`:

```bash
source .venv/bin/activate
python -m unittest discover -s tests -p "test_client_*.py" -v
```

Esta prueba comprueba:

```text
ECDSA P-256
    ↓
generación / carga de llaves
    ↓
sign()
    ↓
verify()
    ↓
firma válida
```

También comprueba la prueba negativa:

```text
datos originales + firma     → válida
datos alterados + misma firma → inválida
```

Además valida el intercambio de formatos:

```text
raw r||s
   ↓
DER
   ↓
raw r||s
```

El valor final debe ser idéntico al original.

### 4.2 Prueba 2 — `test_client_csr.py`

Ubicación:

```text
ca-service/tests/test_client_csr.py
```

Se ejecuta con el mismo comando:

```bash
python -m unittest discover -s tests -p "test_client_*.py" -v
```

Utiliza:

```text
examples/fixtures/sample_browser_csr.pem
```

para comprobar que Python puede recibir una CSR producida como si hubiera salido del navegador.

Verifica:

```text
PKCS#10 válida                 OK
firma de CSR válida            OK
algoritmo ECDSA                OK
curva P-256                    OK
SHA-256                        OK
public key extraíble           OK
```

Esta prueba es importante para Christian porque demuestra que la CSR creada del lado cliente es compatible con `cryptography` del lado de la CA.

### 4.3 Prueba 3 — demo web funcional

Esta es la prueba funcional más completa del lado cliente porque ejecuta Web Crypto realmente dentro del navegador.

Desde:

```bash
cd ~/Documents/Sign-PDF/user-frontend
```

si aún no se instalaron las dependencias:

```bash
npm install
```

levantar Vite:

```bash
npm run dev
```

Abrir en Navegador:

```text
http://127.0.0.1:5173/
```

La demo prueba:

```text
Generar llaves ECDSA P-256       ✅
Exportar private key             ✅
Exportar public key              ✅
Reimportar las llaves            ✅
Crear CSR PKCS#10                ✅
Simular envío de CSR             ✅ mock 202/PENDING
Cargar cualquier archivo         ✅
Calcular SHA-256 visible          ✅
Firmar archivo                    ✅
Verificar firma                   ✅
Detectar archivo alterado         ✅
```

La demo ejecuta realmente:

```ts
generateKeyPair()
exportPrivateKey()
exportPublicKey()
importPrivateKey()
importPublicKey()
createEcdsaP256Csr()
sign()
verify()
```

### Importante sobre el SHA-256 mostrado en la demo

La página calcula y muestra:

```text
SHA-256(documento)
```

como dato de diagnóstico.

Pero `sign()` recibe los **bytes originales del archivo**:

```ts
provider.sign(fileBytes, privateKey)
```

porque Web Crypto ya ejecuta internamente:

```text
archivo
  ↓
SHA-256
  ↓
ECDSA P-256
```

No se debe calcular SHA-256 manualmente y después pasar ese hash a `sign()`, porque Web Crypto volvería a aplicar SHA-256 y se produciría un doble hash.

---

## 5. Qué se considera terminado en este checkpoint

```text
ECDSA P-256 / SHA-256               ✅
Generación de llaves del usuario    ✅
Exportación PKCS#8                   ✅
Exportación SPKI                     ✅
Importación de llaves                ✅
sign()                               ✅
verify()                             ✅
Detección de datos alterados         ✅
Firma raw r||s de 64 bytes           ✅
Conversión raw <-> DER               ✅
Creación CSR PKCS#10                 ✅
Firma de CSR                         ✅
Validación CSR en Python             ✅
Interoperabilidad navegador/Python   ✅
Compilación TypeScript               ✅
Demo web funcional                   ✅ disponible para prueba
```

---

## 6. Qué falta después de este checkpoint

### 6.1 Endpoint real para enviar la CSR

La CSR ya puede crearse y validarse, pero todavía falta conectar:

```text
createEcdsaP256Csr()
        ↓
POST /api/csr/request
        ↓
backend / CA
```

### 6.2 Emisión y entrega del certificado del usuario

Después de aceptar la CSR debe generarse:

```text
certificate.crt
```

Este certificado debe contener la public key del usuario y estar firmado por la CA.

### 6.3 Protección de la llave privada con contraseña

Actualmente la privada se exporta como:

```text
-----BEGIN PRIVATE KEY-----
```

PKCS#8 sin cifrar.

Todavía debe definirse el formato final de protección, por ejemplo:

```text
PKCS#8 cifrado
PKCS#12 / PFX
otro contenedor local protegido
```

La contraseña debe utilizarse localmente y no enviarse al backend.

### 6.4 Comprobar private key ↔ certificate.crt

Antes de firmar, deberá comprobarse:

```text
private key
   ↓ deriva
public key A

certificate.crt
   ↓ contiene
public key B

A == B  → permitir firma
A != B  → rechazar
```

### 6.5 PyHanko / CMS / PAdES

La demo actual firma bytes de un archivo y demuestra que ECDSA funciona, pero **todavía no genera un PDF PAdES**.

El flujo final debe ser:

```text
PDF
  ↓
PyHanko prepare
  ↓
/ByteRange + atributos CMS
  ↓
bytes_to_sign
  ↓
cliente sign()
  ↓
signature
  ↓
PyHanko finalize
  ↓
CMS SignedData
  ↓
/Contents
  ↓
PDF PAdES firmado
```

### 6.6 ML-DSA-65

No está implementado en este checkpoint.

---

# Parte detallada / referencia técnica

## 7. Estado y estructura actual relacionada con ECDSA

El repositorio contiene estas áreas relevantes:

```text
Sign-PDF/
├── ca-frontend/          # Panel administrativo de la CA
├── ca-service/           # Servicio FastAPI de la CA
├── user-frontend/        # Frontend/módulo del usuario
├── docs/
└── examples/
```

La CA existente mantiene su propia criptografía, certificado raíz, cifrado de fragmentos y SLIP-39.

La decisión actual para los fragmentos de la CA es:

```text
SLIP-39 3-de-4
```

El módulo ECDSA del usuario no sustituye ni modifica esa implementación.

---

## 8. Contrato criptográfico fijo

- `algorithm`: `ECDSA_P256`
- curva: P-256 / secp256r1
- hash: SHA-256
- llave privada exportable: PKCS#8 PEM
- encabezado: `-----BEGIN PRIVATE KEY-----`
- llave pública exportable: SubjectPublicKeyInfo / SPKI PEM
- encabezado: `-----BEGIN PUBLIC KEY-----`
- firma de intercambio: 64 bytes raw `r || s`
- `r`: 32 bytes
- `s`: 32 bytes
- en JSON: Base64 de los 64 bytes raw
- CSR: PKCS#10 PEM
- encabezado: `-----BEGIN CERTIFICATE REQUEST-----`

### 8.1 Formato de firma

Web Crypto utiliza para esta implementación:

```text
r || s

32 bytes + 32 bytes = 64 bytes
```

Python `cryptography` normalmente opera con la representación ASN.1 DER.

Por eso existen conversiones explícitas:

```text
raw r||s  <->  DER
```

El contrato de intercambio del proyecto para `ECDSA_P256` es raw de 64 bytes y Base64 cuando viaje por JSON.

---

## 9. Separación de responsabilidades

### 9.1 Navegador del usuario

Responsable de:

1. generar el par de llaves;
2. utilizar la llave privada;
3. exportar/importar llaves cuando la UI lo requiera;
4. crear la CSR;
5. firmar localmente;
6. verificar localmente cuando sea útil.

La private key **no debe enviarse a `ca-service`, backend, PostgreSQL ni Firebase**.

### 9.2 `ca-service`

Para la parte del usuario debe poder:

1. leer la CSR;
2. validar la prueba de posesión;
3. comprobar P-256;
4. comprobar SHA-256;
5. extraer identidad y public key;
6. emitir posteriormente el certificado X.509 con la llave de la CA.

### 9.3 Backend de documentos

Posteriormente será responsable de:

1. recibir PDF + certificado + algoritmo;
2. preparar PDF con PyHanko;
3. devolver `bytes_to_sign` + `operation_id`;
4. recibir signature;
5. verificarla;
6. formar CMS/PAdES;
7. insertar la firma;
8. devolver PDF firmado.

---


## 10. Qué hace cada archivo del cliente

### 10.1 `types.ts`

Define el contrato común del proveedor de firma:

```ts
generateKeyPair()
exportPrivateKey()
exportPublicKey()
importPrivateKey()
importPublicKey()
sign()
verify()
```

También fija:

```ts
SIGNATURE_ALGORITHM = "ECDSA_P256"
```

### 10.2 `encoding.ts`

Convierte entre:

```text
ArrayBuffer / Uint8Array
Base64
DER
PEM
```

No implementa criptografía manual.

### 10.3 `EcdsaProvider.ts`

Implementación principal con:

```ts
crypto.subtle
```

Configuración:

```text
ECDSA
P-256
SHA-256
```

Generar:

```ts
const provider = new EcdsaProvider();
const keys = await provider.generateKeyPair();
```

Exportar privada:

```ts
const privatePem = await provider.exportPrivateKey(keys.privateKey);
```

Exportar pública:

```ts
const publicPem = await provider.exportPublicKey(keys.publicKey);
```

Importar privada:

```ts
const privateKey = await provider.importPrivateKey(privatePem);
```

Importar pública:

```ts
const publicKey = await provider.importPublicKey(publicPem);
```

Firmar:

```ts
const signature = await provider.sign(data, privateKey);
```

Verificar:

```ts
const valid = await provider.verify(data, signature, publicKey);
```

### 10.4 `ecdsaSignature.ts`

Convierte:

```text
raw r||s
DER ASN.1
```

### 10.5 `der.ts`

Utilidades mínimas de codificación DER necesarias para la CSR:

```text
SEQUENCE
SET
INTEGER
OID
UTF8String
IA5String
BIT STRING
```

No implementa ECDSA, SHA-256 ni aleatoriedad.

### 10.6 `csr.ts`

Construye una CSR PKCS#10 en el cliente.

Ejemplo:

```ts
const csrPem = await createEcdsaP256Csr(
  keys.privateKey,
  keys.publicKey,
  {
    commonName: "Nombre del usuario",
    email: "usuario@example.com",
  }
);
```

Incluye:

```text
Common Name
emailAddress
Public Key SPKI P-256
firma ECDSA con SHA-256
```

La private key firma `CertificationRequestInfo`, pero no se incorpora a la CSR.

---
## 11. Endpoints y contratos HTTP

### 11.1 Distinción importante

Hay dos cosas diferentes:

```text
FUNCIONES LOCALES DEL CLIENTE        ✅ IMPLEMENTADAS

ENDPOINTS HTTP DE INTEGRACIÓN        ⏳ PENDIENTES / PARCIALES
```

Por ejemplo:

```ts
createEcdsaP256Csr()
```

ya existe.

Lo que falta es el canal:

```http
POST /api/csr/request
```

para enviarla al backend real.

### 11.2 CSR

Contrato conceptual:

```json
{
  "algorithm": "ECDSA_P256",
  "csr": "-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----"
}
```

Nunca debe incluir la private key.

Estado pendiente:

```json
{
  "status": "PENDING",
  "certificate": null
}
```

Estado emitido:

```json
{
  "status": "SIGNED",
  "algorithm": "ECDSA_P256",
  "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
}
```

### 11.3 Firma PDF futura

`POST /api/documents/sign/prepare` recibirá conceptualmente:

```text
PDF
certificate.crt
algorithm = ECDSA_P256
```

Respuesta:

```json
{
  "operation_id": "...",
  "bytes_to_sign": "BASE64..."
}
```

Cliente:

```ts
const signature = await provider.sign(bytesToSign, privateKey);
```

`POST /api/documents/sign/finalize`:

```json
{
  "operation_id": "...",
  "signature": "BASE64_DE_RAW_R_S"
}
```

La firma, una vez decodificada, debe tener 64 bytes raw `r || s`.

---

## 12. Firma de archivo actual vs PDF PAdES final

La demo actual demuestra criptográficamente:

```text
archivo
  ↓
SHA-256 interno de Web Crypto
  ↓
ECDSA P-256
  ↓
firma
  ↓
verify
```

Esto permite demostrar que el módulo firma archivos reales sin necesitar todavía un certificado.

Pero eso no significa que el PDF ya quede modificado con una firma estándar.

El PDF PAdES necesita posteriormente:

```text
/ByteRange
/Sig
/Contents
atributos CMS
certificate.crt
CMS SignedData
```

Por eso:

```text
firma criptográfica de archivo             ✅ ahora
PDF PAdES final con certificado             ⏳ después
```

---



El checkpoint actual cubre la criptografía ECDSA del cliente, CSR, interoperabilidad con Python y la demo funcional. El siguiente trabajo de integración consiste en conectar esos componentes a los endpoints reales, emisión de certificado y flujo PyHanko/PAdES.
