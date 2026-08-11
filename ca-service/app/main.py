from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.database import get_db
from app.api.ca import router as ca_router


app = FastAPI(
    title=settings.app_name,
    description="Servicio de Autoridad Certificadora",
    version=settings.app_version,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(ca_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "ca-service",
        "version": settings.app_version,
    }


@app.get("/api/health/database")
def database_health(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1"))
    result.scalar()

    return {
        "status": "ok",
        "database": "postgresql",
    }