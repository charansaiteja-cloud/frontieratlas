"""FrontierAtlas configuration."""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FrontierAtlas"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("FA_DEBUG", "false").lower() == "true"
    host: str = os.getenv("FA_HOST", "0.0.0.0")
    port: int = int(os.getenv("FA_PORT", "8000"))

    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5434/frontieratlas"
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    gemini_api_base: str = os.getenv("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
    groq_api_base: str = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1")
    deepseek_api_base: str = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1")

    github_token: str = os.getenv("GITHUB_TOKEN", "")

    max_concurrency: int = int(os.getenv("FA_MAX_CONCURRENCY", "10"))
    per_domain_concurrency: int = int(os.getenv("FA_PER_DOMAIN_CONCURRENCY", "2"))
    request_timeout: int = int(os.getenv("FA_REQUEST_TIMEOUT", "30"))
    max_retries: int = int(os.getenv("FA_MAX_RETRIES", "3"))

    llm_max_tokens: int = int(os.getenv("FA_LLM_MAX_TOKENS", "8192"))
    llm_temperature: float = float(os.getenv("FA_LLM_TEMPERATURE", "0.1"))
    llm_provider_timeout: int = int(os.getenv("FA_LLM_PROVIDER_TIMEOUT", "60"))

    fresh_window_hours: int = int(os.getenv("FA_FRESH_WINDOW_HOURS", "24"))

    seed_entities_path: str = os.getenv("FA_SEED_ENTITIES", "scripts/seed_entities.py")

    model_config = SettingsConfigDict(env_file=".env", env_prefix="FA_", extra="ignore")


settings = Settings()