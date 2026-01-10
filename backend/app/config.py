import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseModel):
    PROJECT_NAME: str = "Tarel API"
    API_PREFIX: str = "/api"
    FRONTEND_ORIGINS: str = os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    )
    BACKEND_CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in FRONTEND_ORIGINS.split(",")
        if origin.strip()
    ]
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:882010@localhost:5432/Tarel",
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "devsecret")
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "sk_test_xxx")
    REPORT_EMAIL: str = os.getenv("REPORT_EMAIL", "admin@tarel.local")
    MEDIA_ROOT: str = os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))
    MEDIA_URL: str = os.getenv("MEDIA_URL", "/media")
    GETADDRESS_API_KEY: Optional[str] = os.getenv("GETADDRESS_API_KEY")
    GETADDRESS_BASE_URL: str = os.getenv("GETADDRESS_BASE_URL", "https://api.getAddress.io")


settings = Settings()
