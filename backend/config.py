from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# vitalAir/.env — single global env file
ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    llm_provider: str = "auto"  # auto | openai | gemini
    iqair_api_key: str = ""
    waqi_api_key: str = ""
    google_maps_api_key: str = ""
    serper_api_key: str = ""
    mongodb_uri: str = "mongodb://localhost:27017/vitalair"
    cors_origins: str = "http://localhost:3000"
    use_mock_agents: bool = False
    jwt_secret: str = ""
    jwt_secret_key: str = ""
    vitalair_jwt_secret: str = ""
    nextauth_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = ""
    celery_result_backend: str = ""
    chroma_persist_dir: str = "./chroma_store"
    use_celery: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def has_live_llm(self) -> bool:
        return self.has_openai or self.has_gemini

    @property
    def should_mock_crew(self) -> bool:
        return self.use_mock_agents or not self.has_live_llm

    @property
    def effective_waqi_key(self) -> str:
        return (self.waqi_api_key or self.iqair_api_key).strip()

    @property
    def effective_jwt_secret(self) -> str:
        return (
            self.jwt_secret_key
            or self.vitalair_jwt_secret
            or self.nextauth_secret
            or self.jwt_secret
            or "vitalair-dev-secret-change-me"
        ).strip()

    @property
    def effective_celery_broker(self) -> str:
        return self.celery_broker_url or self.redis_url

    @property
    def effective_celery_backend(self) -> str:
        if self.celery_result_backend:
            return self.celery_result_backend
        base = self.redis_url.rstrip("/")
        if base.endswith("/0"):
            return f"{base[:-1]}1"
        return f"{base}/1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
