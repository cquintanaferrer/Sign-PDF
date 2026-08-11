from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SignPDF CA Service"
    app_version: str = "1.0.0"

    host: str = "127.0.0.1"
    port: int = 8000

    frontend_url: str = "http://localhost:5173"

    database_url: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 30

    ca_admin_password: str

    authority1_password: str
    authority2_password: str
    authority3_password: str
    authority4_password: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()