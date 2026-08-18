# Cambios ML-DSA-65 aplicados a SignPDF CA — 18 de agosto de 2026

## Objetivo

Se amplió la Autoridad Certificadora existente para soportar **ML-DSA-65** sin crear un segundo servicio de CA.

La misma aplicación administra ahora dos raíces criptográficas independientes:

- **ECDSA P-256 / SHA-256**
- **ML-DSA-65**

Cada raíz conserva de forma independiente su clave privada, certificado raíz y fragmentos SLIP-39. La emisión de un certificado utiliza automáticamente la raíz correspondiente al algoritmo de la CSR.

---

## Cambios en el backend de la CA

### Soporte de algoritmos

Se agregó un registro de algoritmos para distinguir:

- `ECDSA_P256`
- `ML_DSA_65`

La CA puede identificar el algoritmo a partir de la llave pública contenida en la CSR.

### Generación de raíz ML-DSA-65

Se agregó soporte para:

- generar una llave raíz ML-DSA-65;
- serializar su llave pública;
- obtener y reconstruir la llave privada a partir de su seed de 32 bytes;
- generar un certificado raíz X.509 firmado con ML-DSA-65.

### SLIP-39 para ML-DSA

La raíz ML-DSA utiliza el mismo esquema existente de custodia:

- 4 fragmentos;
- umbral 3-de-4.

El seed privado ML-DSA-65 se divide y reconstruye mediante el mecanismo SLIP-39 ya existente.

Los fragmentos ECDSA y ML-DSA se mantienen separados y no son intercambiables.

### Bootstrap por algoritmo

El bootstrap de la CA acepta el algoritmo que se desea inicializar.

Esto permite mantener simultáneamente:

- una raíz ECDSA;
- una raíz ML-DSA-65.

Los endpoints de estado, certificado raíz y llave pública pueden consultar cada raíz por separado.

### Recepción de CSR

El endpoint de CSR detecta automáticamente si la solicitud contiene una llave:

- ECDSA P-256;
- ML-DSA-65.

El algoritmo detectado se almacena en la solicitud y se utiliza posteriormente para seleccionar la raíz correspondiente durante la emisión.

### Emisión de certificados

La emisión de certificados fue generalizada para utilizar la raíz indicada por el algoritmo de la CSR.

Para ECDSA se conserva la firma X.509 con:

- ECDSA P-256;
- SHA-256.

Para ML-DSA-65 se utiliza la firma X.509 ML-DSA correspondiente.

Una CSR ECDSA utiliza exclusivamente la raíz ECDSA y una CSR ML-DSA-65 utiliza exclusivamente la raíz ML-DSA-65.

### Verificación de certificados

El servicio de verificación reconoce certificados emitidos por ambas raíces.

La respuesta de verificación incluye el algoritmo de la CA utilizada y permite comprobar:

- que el certificado fue emitido por SignPDF;
- que la firma del certificado es válida;
- que pertenece a la raíz correcta;
- su estado de vigencia y revocación.

### Dashboard

El backend del dashboard fue adaptado para proporcionar el estado de las dos raíces de forma independiente.

---

## Cambios en el frontend de la CA

### Administración de raíces

La sección **Raíces CA** permite seleccionar y administrar por separado:

- ECDSA P-256;
- ML-DSA-65.

Para cada raíz se puede:

- consultar su estado;
- realizar el bootstrap;
- consultar y descargar el certificado raíz;
- consultar y descargar la llave pública;
- descargar sus fragmentos SLIP-39.

### Dashboard

El dashboard muestra de forma independiente el estado de:

- la raíz ECDSA;
- la raíz ML-DSA-65.

### Emisión de CSR

La interfaz de emisión muestra el algoritmo asociado a cada CSR y utiliza el flujo correspondiente.

El administrador debe cargar fragmentos pertenecientes a la misma raíz seleccionada por el algoritmo de la CSR.

### Visualización

La columna de algoritmo permanece separada del Subject del certificado.

Los certificados ML-DSA se presentan con el mismo formato de Subject utilizado por los certificados ECDSA, por ejemplo:

`CN=MLDSA Test User,O=SignPDF Test,C=MX`

---

## Compatibilidad con ECDSA

La integración de ML-DSA-65 mantiene el flujo ECDSA existente.

ECDSA continúa utilizando:

- P-256;
- SHA-256;
- su propia raíz;
- sus propios fragmentos SLIP-39;
- su proceso de emisión y verificación existente.

ML-DSA-65 utiliza una raíz distinta y no sustituye ni reutiliza la clave raíz ECDSA.

---

## Base de datos

No fue necesario crear una nueva base de datos ni una segunda aplicación de CA.

Los modelos existentes ya contienen los campos necesarios para asociar solicitudes y certificados con:

- el algoritmo;
- la autoridad certificadora;
- la generación de la CA.

Por ello, ambas raíces se administran dentro del mismo servicio y PostgreSQL.

---

## Archivos principales involucrados

### Backend

- `ca-service/app/crypto/algorithm_registry.py`
- `ca-service/app/crypto/keys.py`
- `ca-service/app/services/ca_service.py`
- `ca-service/app/services/ca_bootstrap_service.py`
- `ca-service/app/services/certificate_service.py`
- `ca-service/app/services/certificate_verification_service.py`
- `ca-service/app/api/ca.py`
- `ca-service/app/api/csr.py`
- `ca-service/app/api/certificates.py`
- `ca-service/app/api/dashboard.py`

### Frontend

- `ca-frontend/src/services/ca.service.ts`
- `ca-frontend/src/services/dashboard.service.ts`
- `ca-frontend/src/hooks/useCAStatus.ts`
- `ca-frontend/src/pages/BootstrapCA.tsx`
- `ca-frontend/src/pages/Dashboard.tsx`
- `ca-frontend/src/pages/Certificates.tsx`
- `ca-frontend/src/components/bootstrap/BootstrapWizard.tsx`
- `ca-frontend/src/components/bootstrap/DownloadCard.tsx`
- `ca-frontend/src/components/dashboard/RootCertificateCard.tsx`
- `ca-frontend/src/components/csr/IssueCertificateModal.tsx`

---

## Alcance actual

La CA soporta actualmente para ML-DSA-65:

- creación de raíz;
- certificado raíz;
- fragmentación y reconstrucción de la clave raíz;
- recepción de CSR;
- detección automática del algoritmo;
- emisión de certificados X.509;
- consulta de certificados;
- verificación criptográfica.

La lógica de rotación/cross-signing existente se mantiene en su flujo ECDSA actual, aun falta implementarlo para MLDSA.
