# Instalación inicial de SignPDF

Esta guía describe cómo levantar **SignPDF por primera vez después de descargar el repositorio desde Git**.

El proyecto se ejecuta completamente con Docker Compose e incluye:

- PostgreSQL.
- Backend de la Autoridad Certificadora.
- Frontend de la Autoridad Certificadora.
- Backend del cliente.
- Frontend del cliente.
- Nginx como punto de entrada.
- Soporte para **ECDSA P-256 / SHA-256** y **ML-DSA-65**.

---

## 1. Requisitos previos

Se necesita tener instalado:

- Git.
- Docker.
- Docker Compose.

Verificar:

```bash
git --version
docker --version
docker compose version
```

Docker debe estar iniciado antes de continuar.

---

## 2. Descargar el repositorio

Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO> Sign-PDF
```

Entrar a la carpeta:

```bash
cd Sign-PDF
```

Si el repositorio ya fue clonado, simplemente:

```bash
cd ~/Documents/Sign-PDF
```

---

## 3. Crear el archivo `.env`

El archivo `.env` no se guarda en Git porque contiene credenciales y secretos de desarrollo.

Desde la raíz de `Sign-PDF`:

```bash
nano .env
```

Agregar:

```env
POSTGRES_DB=signpdf
POSTGRES_USER=signpdf
POSTGRES_PASSWORD=<DEFINIR_PASSWORD_POSTGRES>

JWT_SECRET=<GENERAR_SECRETO_ALEATORIO>

CA_ADMIN_PASSWORD=<DEFINIR_PASSWORD_ADMIN>

AUTHORITY1_PASSWORD=<DEFINIR_PASSWORD_AUTHORITY1>
AUTHORITY2_PASSWORD=<DEFINIR_PASSWORD_AUTHORITY2>
AUTHORITY3_PASSWORD=<DEFINIR_PASSWORD_AUTHORITY3>
AUTHORITY4_PASSWORD=<DEFINIR_PASSWORD_AUTHORITY4>
```

Las variables `AUTHORITY1_PASSWORD` a `AUTHORITY4_PASSWORD` son las contraseñas de acceso de las cuentas custodias. **No son las contraseñas finales de los fragmentos `.sss`.** Cada custodio elegirá una contraseña nueva para su fragmento al descargarlo desde la interfaz de la CA.

Para generar un valor aleatorio para `JWT_SECRET` puede utilizarse:

```bash
openssl rand -hex 32
```

Guardar en `nano` con:

```text
Ctrl + O
Enter
Ctrl + X
```

Comprobar que Docker Compose reconoce las variables:

```bash
docker compose config >/dev/null && echo "docker-compose OK"
```

Debe aparecer:

```text
docker-compose OK
```

No deben aparecer advertencias indicando que faltan variables como `POSTGRES_PASSWORD`, `JWT_SECRET` o `CA_ADMIN_PASSWORD`.

---

## 4. Construir las imágenes

La primera construcción puede tardar varios minutos porque Docker debe descargar e instalar todas las dependencias de Python y Node.js, incluyendo `pyHanko`, `cryptography` y las dependencias del cliente.

Ejecutar:

```bash
docker compose build
```

También se puede construir y levantar directamente con:

```bash
docker compose up -d --build
```

Para la primera instalación **no es necesario usar `--no-cache`**.

---

## 5. Levantar los servicios

Si solamente se ejecutó `docker compose build`, iniciar ahora los contenedores:

```bash
docker compose up -d
```

Comprobar el estado:

```bash
docker compose ps
```

Deben aparecer los servicios del proyecto, incluyendo:

```text
signpdf-postgres
signpdf-ca
signpdf-ca-frontend
signpdf-client-api
signpdf-client
signpdf-nginx
```

Los contenedores deben aparecer en estado `Up` o `running`.

---

## 6. Inicializar la base de datos de la CA

Aplicar las migraciones:

```bash
docker compose exec ca-service alembic upgrade head
```

Crear los usuarios administrativos y autoridades:

```bash
docker compose exec ca-service python -m scripts.initialize_users
```

En una instalación nueva debe aparecer algo similar a:

```text
Creado: admin
Creado: autority1
Creado: autority2
Creado: autority3
Creado: autority4
```

Las credenciales del administrador serán las definidas en `.env`:

```text
Usuario: admin
Contraseña: valor de CA_ADMIN_PASSWORD
```

---

## 7. Abrir las interfaces

### Autoridad Certificadora

```text
http://localhost
```

### Cliente

```text
http://localhost/client/
```

Todo el proyecto entra a través de Nginx por el puerto `80`.

No es necesario abrir directamente los puertos internos de FastAPI, Vite o los demás contenedores.

---

## 8. Crear las raíces de la CA por primera vez

En una instalación completamente nueva todavía no existen raíces criptográficas.

Entrar en:

```text
http://localhost
```

Iniciar sesión con:

```text
Usuario: admin
Contraseña: admin123
```

Ir al apartado de **Raíces CA**.

### Crear raíz ECDSA

Seleccionar:

```text
ECDSA P-256 / SHA-256
```

Realizar el bootstrap y descargar los fragmentos SLIP-39. Al descargar cada fragmento, la interfaz pedirá primero la contraseña de acceso del custodio y después una **nueva contraseña para proteger ese `.sss`**. Esa nueva contraseña debe conservarse junto con el fragmento.

La configuración utilizada es:

```text
4 fragmentos
umbral 3-de-4
```

Guardar los fragmentos en un lugar seguro.

### Crear raíz ML-DSA

Seleccionar:

```text
ML-DSA-65
```

Realizar el bootstrap y descargar sus propios fragmentos SLIP-39. Para cada archivo se elige su contraseña de fragmento en el momento de la descarga.

Los fragmentos de ECDSA y ML-DSA son independientes y **no deben mezclarse**. Tampoco debe confundirse la contraseña de acceso del custodio con la contraseña elegida para su `.sss`.

### Flujo de contraseña de los fragmentos

```text
Contraseña AUTHORITYn_PASSWORD
        │
        └── autentica al custodio para descargar

Nueva contraseña elegida en la descarga
        │
        └── cifra fragment_n.sss con Argon2id + AES-256-GCM
```

Al emitir certificados o reconstruir una raíz, debe introducirse la **contraseña elegida para el `.sss`**, no la contraseña de acceso del custodio.

---

## 9. Primer uso del cliente

Entrar en:

```text
http://localhost/client/
```

Registrar un usuario.

Si el flujo de demostración solicita el OTP, utilizar:

```text
847291
```

Después iniciar sesión.

---

## 10. Generar las llaves del usuario

Entrar en **Mis llaves**.

El cliente permite generar:

```text
ECDSA P-256
ML-DSA-65
```

Las llaves se generan localmente en el navegador.

Para cada algoritmo:

1. Seleccionar el algoritmo.
2. Presionar **Generar par de llaves**.
3. Descargar la llave pública.
4. Descargar la llave privada protegida.
5. Elegir una contraseña para proteger la llave privada.

La contraseña y la llave privada permanecen en el navegador y no se envían al backend.

Conservar:

```text
private_key_encrypted.pem
public_key.pem
```

y recordar la contraseña utilizada.

---

## 11. Solicitar un certificado

Entrar en **Certificados**.

Para crear una CSR se necesitan:

- Llave privada protegida.
- Llave pública.
- Contraseña de la llave privada.

La aplicación detecta automáticamente si las llaves corresponden a:

```text
ECDSA P-256
```

o:

```text
ML-DSA-65
```

La CSR se genera y firma localmente en el navegador.

Solo la CSR se envía a la CA.

La llave privada y su contraseña nunca se envían.

---

## 12. Emitir el certificado desde la CA

Después de solicitarlo desde el cliente, entrar en la interfaz de la CA:

```text
http://localhost
```

Abrir las solicitudes pendientes.

La CA detecta automáticamente el algoritmo de la CSR:

```text
CSR ECDSA    -> raíz ECDSA
CSR ML-DSA   -> raíz ML-DSA
```

Para emitir el certificado se deben cargar al menos **3 de los 4 fragmentos** pertenecientes a la raíz correcta.

Una vez emitido, el cliente consulta automáticamente su estado y permite descargar el certificado.

---

## 13. Firmar un PDF

En el cliente abrir **Firmar PDF**.

Se necesita:

- PDF.
- Llave privada protegida.
- Certificado del firmante.
- Contraseña de la llave privada.

El flujo es:

```text
Backend prepara PDF y CMS/PAdES
            |
            v
Navegador desbloquea la llave privada
            |
            v
Firma local ECDSA o ML-DSA
            |
            v
Backend finaliza e incrusta CMS en el PDF
            |
            v
PDF firmado
```

La llave privada y la contraseña **nunca se envían al backend**.

El PDF resultante contiene internamente:

- Firma criptográfica.
- Certificado del firmante.
- Información CMS/PAdES.
- ByteRange del documento.
- Apariencia visible de la firma.

---

## 14. Verificar un PDF firmado

Entrar en:

```text
Validar PDF
```

Solo es necesario seleccionar el PDF firmado.

La aplicación obtiene del propio PDF:

- Firma.
- Certificado.
- Llave pública del certificado.

Se comprueba:

```text
Integridad del PDF
Firma criptográfica
Certificado del firmante
Vigencia
Revocación
Emisión por SignPDF CA
```

El mismo flujo se utiliza para ECDSA y ML-DSA.

---

## 15. Verificar únicamente un certificado

Si solo se desea revisar un certificado y no un PDF, utilizar:

```text
Validar certificado
```

Se puede cargar un archivo:

```text
.crt
.pem
.cer
```

La CA comprueba:

- Firma X.509.
- Algoritmo.
- Emisor.
- Vigencia.
- Revocación.
- Existencia en la base de datos.
- Correspondencia con una raíz SignPDF.

---

## 16. Detener el proyecto

Para detener y retirar los contenedores conservando las bases de datos:

```bash
docker compose down
```

Los volúmenes permanecen guardados.

Para volver a iniciar:

```bash
docker compose up -d
```

---

## 17. Importante: no borrar los volúmenes por accidente

No utilizar:

```bash
docker compose down -v
```

salvo que se quiera borrar completamente el estado del proyecto.

`-v` elimina los volúmenes y, por lo tanto, puede borrar:

```text
PostgreSQL de la CA
- usuarios administrativos
- raíces ECDSA y ML-DSA
- CSR
- certificados

SQLite del cliente
- usuarios registrados
- datos persistentes del cliente
```

---

## 18. Reiniciar todo desde cero

Solo si realmente se desea una instalación completamente limpia:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec ca-service alembic upgrade head
docker compose exec ca-service python -m scripts.initialize_users
```

Después será necesario volver a:

1. Crear la raíz ECDSA.
2. Crear la raíz ML-DSA.
3. Descargar nuevamente los fragmentos SLIP-39.
4. Registrar usuarios del cliente.
5. Generar llaves.
6. Solicitar nuevos certificados.

---

## 19. Comandos resumidos para una instalación nueva

Después de clonar el repositorio y crear `.env`:

```bash
cd ~/Documents/Sign-PDF

docker compose config >/dev/null && echo "docker-compose OK"

docker compose up -d --build

docker compose exec ca-service alembic upgrade head

docker compose exec ca-service python -m scripts.initialize_users

docker compose ps
```

Después abrir:

```text
CA:      http://localhost
Cliente: http://localhost/client/
```

Y crear por primera vez las raíces ECDSA y ML-DSA desde la interfaz de la CA.

---

## Notas

- `.env` no debe subirse al repositorio.
- Los fragmentos SLIP-39 (`*.sss`) no deben subirse a Git.
- Las llaves privadas de los usuarios no deben subirse al repositorio.
- Las llaves privadas se protegen con contraseña antes de descargarse.
- ECDSA y ML-DSA utilizan raíces independientes.
- La firma del PDF se realiza localmente en el navegador.
- El backend prepara y finaliza CMS/PAdES, pero nunca recibe la llave privada ni su contraseña.
