# Sign-PDF
Secure application for digitally signing PDF documents.



## API Endpoints

Base URL:
`http://127.0.0.1:8000/api`

POST /auth/login
GET  /auth/profile

GET  /ca/status
POST /ca/bootstrap

POST /ca/fragments/{id}/download

GET  /ca/certificate
GET  /ca/public-key


### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Authenticate CA administrator |
| GET | `/auth/profile` | Authenticated | Get authenticated user profile |

### CA Administration

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/ca/status` | CA Admin | Get CA initialization status |
| POST | `/ca/bootstrap` | CA Admin | Initialize the Certification Authority |
| POST | `/ca/fragments/{id}/download` | CA Admin + Custodian Password | Download an encrypted Shamir fragment |
| GET | `/ca/certificate` | Public | Retrieve the CA root X.509 certificate |
| GET | `/ca/public-key` | Public | Retrieve the CA P-256 public key |

### Development

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/dev/reset-bootstrap` | Development only | Reset CA bootstrap state |

