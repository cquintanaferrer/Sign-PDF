import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sign_pdf.db",
)

# Si Docker usa /app/data/sign_pdf.db, aseguramos el directorio antes
# de inicializar SQLite.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:////"):
    db_path = Path("/" + SQLALCHEMY_DATABASE_URL.removeprefix("sqlite:////"))
    db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
