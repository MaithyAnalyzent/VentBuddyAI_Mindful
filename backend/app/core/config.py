"""Environment-backed settings for VentBuddy AI."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def _get(name: str, default: str | None = None, required: bool = False) -> str:
    value = os.environ.get(name, default)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value or ""


@dataclass(frozen=True)
class Settings:
    app_name: str = "VentBuddy AI"
    mongodb_uri: str = _get("MONGODB_URI", "mongodb://localhost:27017")
    db_name: str = _get("DB_NAME", "ventbuddy_ai")
    openai_api_key: str = _get("OPENAI_API_KEY")
    jwt_secret: str = _get("JWT_SECRET", required=True)
    cors_origins: str = _get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    frontend_url: str = _get("FRONTEND_URL", "http://localhost:5173")
    admin_email: str = _get("ADMIN_EMAIL", "admin@ventbuddy.ai")
    admin_password: str = _get("ADMIN_PASSWORD", "ChangeMeBeforeProduction")
    telegram_bot_token: str = _get("TELEGRAM_BOT_TOKEN", "")
    telegram_bot_name: str = _get("TELEGRAM_BOT_NAME", "VentBuddy AI")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
