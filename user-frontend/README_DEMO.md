# Demo web ECDSA P-256 — SignPDF

Esta página usa directamente el módulo existente en `src/crypto/`; no reimplementa ECDSA.

## Qué prueba

1. Generación de un par ECDSA P-256 mediante Web Crypto.
2. Exportación de la privada en PKCS#8 PEM y la pública en SPKI PEM.
3. Reimportación de ambas llaves para comprobar el round-trip.
4. Creación local de una CSR PKCS#10 firmada con ECDSA/SHA-256.
5. Simulación de `POST /api/csr/request` con una respuesta `202 / PENDING`; no hay HTTP real.
6. Carga de cualquier archivo y cálculo visible de SHA-256.
7. Firma de los bytes originales del archivo con `EcdsaProvider.sign()`.
8. Verificación con `EcdsaProvider.verify()` y la llave pública reimportada.
9. Prueba negativa alterando un byte del archivo: la firma debe fallar.

## Importante sobre SHA-256

La página muestra `SHA-256(documento)` para fines de diagnóstico. `EcdsaProvider.sign()` recibe los bytes originales y Web Crypto ejecuta ECDSA con SHA-256 internamente. No se pasa manualmente el hash a `sign()`, porque eso produciría un doble hash.

## Cómo ejecutar

Desde `user-frontend/`:

```bash
npm install
npm run dev
```

Abrir la URL que muestre Vite, normalmente:

```text
http://127.0.0.1:5173
```

## Qué NO hace todavía

- No llama endpoints reales.
- No recibe un `certificate.crt` de la CA.
- No produce CMS/PAdES.
- No modifica/inserta la firma dentro del PDF.
- No protege la llave privada con contraseña todavía.

Esta demo prueba únicamente el bloque criptográfico local que ya está implementado.
