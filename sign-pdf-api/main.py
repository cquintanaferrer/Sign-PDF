from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import engine
from routes import auth, certificates, signatures


# Create database tables
models.Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Sign PDF API",
    version="1.0.0",
)


# Configurar CORS para permitir que React
# (normalmente en el puerto 5173 o 3000)
# pueda hacer peticiones
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"],
)

app.include_router(
    certificates.router,
    prefix="/api/certificates",
    tags=["Certificates"],
)

app.include_router(
    signatures.router,
)


@app.get("/ping")
def ping():
    return {
        "status": "ok",
        "message": "API is running",
    }