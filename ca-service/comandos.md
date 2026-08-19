// Levantar servicio
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

//Reset de la CA solo se ejecuta con el servicio levantado
curl -X POST http://127.0.0.1:8000/api/dev/reset-bootstrap

// Ver las tablas 
docker exec -it signpdf-postgres psql -U signpdf -d signpdf


                 CLIENTE / SERVICIO
                         │
                         │ CSR
                         │
                         ▼
              ┌─────────────────────┐
              │ POST /api/ca/sign   │
              └──────────┬──────────┘
                         │
                         ▼
                 CSR pendiente
                         │
                         ▼
              ┌─────────────────────┐
              │ CA Service          │
              │                     │
              │ PostgreSQL          │
              │      │              │
              │      ▼              │
              │ CertificateAuthority│
              └──────────┬──────────┘
                         │
                3 o 4 shares
                + contraseñas
                         │
                         ▼
                 decrypt shares
                         │
                         ▼
                   SLIP-0039
                     3 / 4
                         │
                         ▼
                  private scalar
                         │
                         ▼
                 verificar hash
                         │
                         ▼
                  P-256 private
                         │
                         ▼
                    firmar CSR
                         │
                         ▼
                    X.509 cert
                         │
                         ▼
                     respuesta


                    APP DEL SOLICITANTE
                           │
                           │ 1. genera clave P-256
                           │ 2. genera CSR
                           ▼
                    POST /api/csr
                           │
                           ▼
                       PostgreSQL
                           │
                     status = PENDING
                           │
                           ▼
                 FRONTEND ADMIN CA
                           │
                    GET /api/csr/pending
                           │
                           ▼
                    [ CSR pendiente ]
                           │
                    Administrador
                           │
                 ┌─────────┴─────────┐
                 │                   │
              3 shares            4 shares
                 │                   │
                 └─────────┬─────────┘
                           ▼
              POST /api/ca/certificates/sign
                           │
                           ▼
                  reconstruir clave CA
                           │
                           ▼
                    firmar CSR
                           │
                           ▼
                    certificado X.509
                      │             │
                      │             └──► PostgreSQL
                      │
                      └──► respuesta / consulta
                           por la APP solicitante