#  SignPDF — CA y firma de PDF con ECDSA + ML-DSA-65

SignPDF integra una **Autoridad Certificadora (CA)** y un **cliente web** para generar llaves, solicitar certificados X.509, firmar documentos PDF y verificar las firmas.

La solución soporta dos rutas criptográficas independientes:

- **ECDSA P-256 / SHA-256**
- **ML-DSA-65 (FIPS 204)**

El principio de seguridad principal es el mismo para ambos algoritmos:

> **La llave privada del usuario se genera, se descifra y se utiliza únicamente dentro de su navegador. Nunca se envía a FastAPI, a la CA ni a la base de datos.**

---

#  Arquitectura

```text
                         NGINX :80
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       /client/       /client-api/          /api/
          │                 │                 │
          ▼                 ▼                 ▼
 sign-pdf-client      sign-pdf-api        ca-service
 React + TypeScript      FastAPI            FastAPI
          │                 │                 │
          │                 │                 ▼
          │                 │             PostgreSQL
          │                 ▼
          │              SQLite
          │
          └── Web Crypto / @noble/post-quantum
                 │
                 ├── ECDSA P-256
                 └── ML-DSA-65
```

Interfaces:

- **CA administrativa:** `http://localhost`
- **Cliente SignPDF:** `http://localhost/client/`

---

#  ML-DSA-65 implementado

## Autoridad Certificadora

La misma aplicación de CA administra dos raíces independientes:

```text
SignPDF CA
│
├── Root ECDSA P-256
│   ├── llave privada ECDSA
│   ├── certificado raíz ECDSA
│   └── SLIP-39 3-de-4
│
└── Root ML-DSA-65
    ├── seed privado ML-DSA-65
    ├── certificado raíz ML-DSA-65
    └── SLIP-39 3-de-4
```

La CA detecta el algoritmo directamente de la llave pública contenida en la CSR.

```text
CSR ECDSA P-256  ──► Root ECDSA
CSR ML-DSA-65    ──► Root ML-DSA-65
```

Los fragmentos de ambas raíces **no son intercambiables**.

### Contraseña de cada fragmento

La contraseña del archivo `.sss` **no queda fijada en el `.env`**. Durante el bootstrap, cada share se conserva temporalmente cifrado en el servidor usando la credencial de su custodio para evitar persistirlo en claro.

Al descargar un fragmento, la interfaz solicita dos datos distintos:

1. **Contraseña del custodio:** autentica y autoriza la descarga.
2. **Nueva contraseña del fragmento:** se elige en ese momento, se confirma y se usa con Argon2id + AES-256-GCM para volver a cifrar el share antes de entregarlo como `.sss`.

```text
Bootstrap
   │
   ├─ share protegido temporalmente en la CA
   │
Descarga
   │
   ├─ contraseña del custodio -> autoriza
   └─ contraseña NUEVA del fragmento
              │
              v
        Argon2id + AES-256-GCM
              │
              v
        fragment_N.sss
```

La contraseña elegida para el fragmento será la que deberá introducirse posteriormente al emitir certificados o reconstruir temporalmente la llave de la CA. La CA elimina su copia temporal del fragmento después de descargarlo.

## Cliente ML-DSA

El cliente web ahora permite:

1. generar una llave ML-DSA-65 en el navegador;
2. exportar la llave pública como **SPKI PEM**;
3. exportar la llave privada como **PKCS#8 cifrado**;
4. importar de nuevo la llave privada usando su contraseña;
5. crear una **CSR PKCS#10 ML-DSA-65** localmente;
6. enviar únicamente la CSR a la CA;
7. firmar atributos CMS de un PDF localmente con ML-DSA-65;
8. descargar el PDF con la firma CMS/PAdES incrustada por pyHanko;
9. verificar posteriormente la firma del PDF y el certificado del firmante.

La implementación ML-DSA del navegador utiliza:

```text
@noble/post-quantum 0.6.1
└── ml_dsa65
```

La llave privada ML-DSA se almacena en formato seed de 32 bytes dentro de PKCS#8, de acuerdo con el formato definido para ML-DSA.

> `@noble/post-quantum` se utiliza para el prototipo académico del cliente web. La propia librería advierte que no cuenta con una auditoría independiente completa y que JavaScript no ofrece las mismas garantías frente a canales laterales que una implementación criptográfica endurecida.

---

#  Generación y descarga de llaves

Desde **Cliente → Mis llaves** se puede elegir:

```text
ECDSA P-256
ML-DSA-65
```

Las llaves se generan localmente. La pantalla conserva un indicador por algoritmo para mostrar si ya se generó un par ECDSA y/o ML-DSA. Por seguridad solo se guarda esa metadata; el material privado no se persiste en el navegador después de abandonar la pantalla.

## Llave pública

Se descarga como:

```text
ECDSA   → ecdsa_public_key.pem
ML-DSA  → mldsa65_public_key.pem
```

Formato:

```text
-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

## Llave privada protegida

Antes de descargar la llave privada, el usuario debe definir una contraseña de al menos 8 caracteres.

La protección se realiza **en el navegador** mediante:

```text
PKCS#8
  ↓
PBES2
  ↓
PBKDF2-HMAC-SHA256
  ↓
AES-256-CBC
  ↓
ENCRYPTED PRIVATE KEY PEM
```

Archivos:

```text
ECDSA   → ecdsa_private_key_encrypted.pem
ML-DSA  → mldsa65_private_key_encrypted.pem
```

La contraseña:

- no se envía al backend;
- no se almacena en SQLite;
- no se envía a la CA;
- debe volver a introducirse al crear la CSR o firmar un PDF.

---

#  Solicitud de certificados ECDSA y ML-DSA

Desde **Cliente → Certificado** el usuario selecciona:

```text
llave privada protegida
+
llave pública
+
contraseña
```

El navegador detecta el algoritmo de las llaves y crea la CSR localmente.

```text
NAVEGADOR
   │
   ├── descifra private key localmente
   ├── comprueba algoritmo
   ├── construye CertificationRequestInfo
   └── firma PKCS#10
           │
           ▼
        CSR PEM
           │
           │ POST /api/csr
           ▼
          CA
```

**No se envían ni la llave privada ni su contraseña.**

El Subject de la CSR utiliza el nombre y correo del usuario autenticado.

La CA responde inicialmente con:

```json
{
  "id": "<request-id>",
  "status": "PENDING",
  "algorithm": "ECDSA P-256 / SHA-256 o ML-DSA-65"
}
```

Después de que el administrador emite el certificado con 3 de los 4 fragmentos de la raíz correspondiente, el cliente consulta automáticamente la CA al entrar en **Certificados**. Mientras exista una CSR pendiente, vuelve a consultar periódicamente sin exigir que el usuario pulse un botón. La pantalla muestra todas las solicitudes/certificados asociados al correo autenticado (ECDSA y ML-DSA) y permite volver a descargar cada certificado emitido.

La consulta se hace mediante el backend autenticado del cliente, que a su vez consulta un endpoint interno de la CA dentro de la red Docker.

---

#  Nuevo flujo de firma PDF — la llave privada permanece en el cliente

El flujo anterior enviaba la llave privada al backend para que pyHanko ejecutara ECDSA. Ese mecanismo fue sustituido.

ECDSA y ML-DSA utilizan ahora el **mismo flujo de firma interrumpida**:

```text
NAVEGADOR                         BACKEND / pyHanko
    │                                    │
    │ PDF + certificado                  │
    ├───────────────────────────────────►│
    │        POST /prepare-pdf           │
    │                                    │
    │                        prepara ByteRange
    │                        calcula digest PDF
    │                        crea SignedAttributes CMS
    │                                    │
    │     bytes exactos a firmar         │
    │◄───────────────────────────────────┤
    │                                    │
    │ descifra llave localmente           │
    │                                    │
    ├─ ECDSA.sign(SignedAttributes)       │
    │             o                      │
    └─ ML-DSA.sign(SignedAttributes)      │
    │                                    │
    │ solo signature + operation_id       │
    ├───────────────────────────────────►│
    │       POST /finalize-pdf            │
    │                                    │
    │                        construye CMS/PAdES
    │                        incrusta certificado
    │                        incrusta firma
    │                        completa /ByteRange
    │                                    │
    │          PDF firmado               │
    │◄───────────────────────────────────┤
```

La firma sigue estando **dentro del PDF**, no como un archivo separado.

También se conserva una representación visual en la primera página con:

- usuario;
- algoritmo;
- fecha de firma.

## Algoritmos usados

### ECDSA

```text
Curva: P-256 / secp256r1
Digest CMS: SHA-256
Firma CMS: ECDSA DER (r,s)
```

### ML-DSA-65

```text
Algoritmo: ML-DSA-65
Digest CMS: SHA-512
Firma de SignedAttributes: ML-DSA modo puro
Firma raw: 3309 bytes
```

---

#  Verificación de un PDF firmado

Desde **Cliente → Validar PDF** únicamente se selecciona el PDF firmado.

No es necesario pedir al usuario:

```text
public_key.pem
certificate.crt
```

porque la firma CMS incrustada en el PDF contiene el certificado del firmante y este contiene su llave pública.

La verificación realiza dos comprobaciones independientes.

## 1. Firma e integridad del PDF

pyHanko comprueba:

```text
/ByteRange
+
digest del documento
+
CMS SignedAttributes
+
firma ECDSA o ML-DSA
+
llave pública del certificado
```

Esto determina si:

- el PDF permanece íntegro;
- la firma matemática es correcta;
- el documento fue modificado después de firmarse.

## 2. Confianza del certificado

El certificado extraído del PDF se envía a:

```http
POST /api/ca/certificates/verify
```

La CA comprueba:

- firma del certificado;
- raíz que lo emitió;
- existencia en PostgreSQL;
- vigencia;
- revocación;
- algoritmo de la CA.

El PDF se considera válido únicamente cuando:

```text
firma PDF válida
AND
PDF íntegro
AND
certificado válido en SignPDF CA
```

Este flujo es el mismo para **ECDSA y ML-DSA**. Para PDFs que utilizan secciones de referencias cruzadas híbridas (*hybrid xrefs*), pyHanko se abre en modo no estricto (`strict=False`), que es el modo recomendado por pyHanko para aceptar ese tipo de documento.

---



#  Verificación directa de certificados

Además de **Validar PDF**, el cliente conserva una pantalla independiente **Validar certificado**.

Permite cargar directamente un archivo:

```text
.crt
.pem
.cer
```

La pantalla envía únicamente el certificado X.509 a:

```http
POST /api/ca/certificates/verify
```

y muestra si:

- la firma X.509 del certificado es válida;
- fue emitido por SignPDF CA;
- existe en la base de datos de la CA;
- está vigente;
- no está revocado;
- corresponde a ECDSA P-256 o ML-DSA-65.

Esta verificación no necesita un PDF.

---

#  Certificados de usuario

Los nuevos certificados emitidos por la CA incluyen explícitamente, si la CSR no los proporciona:

```text
BasicConstraints:
  CA = FALSE

KeyUsage:
  digitalSignature = TRUE
  contentCommitment = TRUE
```

Esto deja claro que son certificados finales destinados a firma y no certificados de una CA subordinada.

---

#  Ejecución con Docker

## 1. Variables de entorno

Conserva el `.env` utilizado por la CA con los valores del proyecto, por ejemplo:

```env
POSTGRES_DB=signpdf
POSTGRES_USER=signpdf
POSTGRES_PASSWORD=...
JWT_SECRET=...
CA_ADMIN_PASSWORD=...
AUTHORITY1_PASSWORD=...
AUTHORITY2_PASSWORD=...
AUTHORITY3_PASSWORD=...
AUTHORITY4_PASSWORD=...
```

`AUTHORITY1_PASSWORD` a `AUTHORITY4_PASSWORD` son credenciales de acceso de los custodios. **No son la contraseña final de los archivos `.sss`**: cada contraseña de fragmento se define por separado en la interfaz al descargarlo.

No subas `.env` al repositorio.

## 2. Construir

Desde la raíz:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

La primera compilación descargará las dependencias nuevas, incluyendo:

```text
@noble/post-quantum==0.6.1
cryptography==50.0.0
pyHanko==0.36.2
```

## 3. Preparar la base de la CA si es una instalación nueva

```bash
docker compose exec ca-service alembic upgrade head
docker compose exec ca-service python -m scripts.initialize_users
```

## 4. Verificar servicios

```bash
docker compose ps
```

Luego abre:

```text
CA:      http://localhost
Cliente: http://localhost/client/
```

---

# 🧪 Prueba funcional recomendada

Para cada algoritmo realiza el mismo recorrido.

## ECDSA

1. Crear raíz ECDSA desde la UI de CA si aún no existe.
2. Descargar y custodiar sus 4 fragmentos, definiendo una contraseña independiente para cada `.sss`.
3. Entrar al cliente.
4. Generar llaves ECDSA.
5. Definir contraseña y descargar la privada cifrada.
6. Descargar la pública.
7. Crear una CSR desde **Certificado** usando ambas llaves y la contraseña.
8. En la CA emitirla con 3 fragmentos ECDSA.
9. Descargar el certificado desde el cliente.
10. Firmar un PDF con privada cifrada + contraseña + certificado.
11. Descargar el PDF firmado.
12. Abrir **Validar PDF** y comprobar que integridad, firma y certificado sean válidos.

## ML-DSA-65

Repite exactamente el procedimiento anterior seleccionando ML-DSA-65 y usando los fragmentos de la raíz ML-DSA.

Una CSR ECDSA debe utilizar fragmentos ECDSA y una CSR ML-DSA debe utilizar fragmentos ML-DSA.

---

#  Dependencias relevantes

## Frontend cliente

```text
React 19
TypeScript
Web Crypto API
@noble/post-quantum 0.6.1
```

## Backend cliente

```text
FastAPI
cryptography 50.0.0
pyHanko 0.36.2
SQLite
```

## CA

```text
FastAPI
cryptography 50.0.0
PostgreSQL
SLIP-39 3-de-4
Argon2id + AES-256-GCM para fragmentos
```

---

#  Otros cambios incluidos

Después de la incorporación de ML-DSA y del nuevo flujo de firma se realizaron estas correcciones adicionales:

1. **Persistencia de SQLite del cliente.** `sign_pdf.db` se almacena en el volumen Docker `signpdf_client_data` y no desaparece al recrear el contenedor.
2. **Versiones reproducibles del backend de firma.** Se fijaron `cryptography==50.0.0` y `pyHanko==0.36.2`.
3. **Eliminación del flujo simulado de certificados.** Se retiraron los endpoints que inventaban IDs y certificados aleatoriamente; el cliente utiliza la CA real.
4. **Eliminación del wizard frontend antiguo** que simulaba generación/emisión de certificados.
5. **Perfil real del usuario.** El cliente puede consultar `/client-api/auth/me` para usar nombre y correo reales en la CSR.
6. **Corrección de Docker para la CA.** `docker-compose.yml` referencia los Dockerfiles con el nombre real en minúsculas (`dockerfile`).
7. **Eliminación de ZIP duplicados internos.** `sign-pdf-api.zip` y `sign-pdf-client.zip` no forman parte del proyecto final; las carpetas activas son `sign-pdf-api/` y `sign-pdf-client/`.
8. **Verificación PDF completa.** La pantalla de Validar PDF comprueba firma CMS, integridad/ByteRange y confianza del certificado.
9. **Compatibilidad con PDFs de referencias cruzadas híbridas.** Firma y validación usan `strict=False` en pyHanko para aceptar PDFs híbridos sin desactivar las verificaciones criptográficas.
10. **Estado persistente de llaves por algoritmo.** Mis llaves marca ECDSA y ML-DSA como generadas mediante metadata local, sin guardar la privada.
11. **Certificados con actualización automática.** La pestaña Certificados lista todas las CSR/certificados del usuario y actualiza automáticamente los pendientes.
12. **Validación directa de certificados.** Se añadió una pestaña separada para validar archivos X.509 sin necesidad de un PDF.
13. **Verificación asíncrona compatible con FastAPI.** La validación PDF usa `async_validate_pdf_signature()` para evitar ejecutar `asyncio.run()` dentro del event loop activo.

---


