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
    frontend_url: str = ""
    faiss_index_dir: str = "./faiss_indexes"

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
    def effective_frontend_url(self) -> str:
        url = (
            self.frontend_url.strip()
            or (self.cors_origin_list[0] if self.cors_origin_list else "")
            or "http://localhost:3000"
        )
        return url.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
