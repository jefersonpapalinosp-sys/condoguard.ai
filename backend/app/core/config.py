from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_UNSAFE_SECRETS = {"dev-only-change-me", "change-me", "secret", "changeme", ""}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env.local", ".env"), env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(default="dev", alias="APP_ENV")
    node_env: str = Field(default="dev", alias="NODE_ENV")
    port: int = Field(default=4000, alias="PORT")

    db_dialect: Literal["oracle", "mock"] = Field(default="mock", alias="DB_DIALECT")
    allow_oracle_seed_fallback: bool = Field(default=False, alias="ALLOW_ORACLE_SEED_FALLBACK")

    auth_provider: str = Field(default="local_jwt", alias="AUTH_PROVIDER")
    auth_password_login_enabled: bool = Field(default=True, alias="AUTH_PASSWORD_LOGIN_ENABLED")
    enable_demo_auth: bool = Field(default=False, alias="ENABLE_DEMO_AUTH")

    jwt_secret: str = Field(default="dev-only-change-me", alias="JWT_SECRET")

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        env = (self.app_env or self.node_env or "dev").lower()
        if env != "dev" and self.jwt_secret in _UNSAFE_SECRETS:
            raise ValueError(
                "JWT_SECRET nao pode usar o valor padrao em ambientes nao-dev. "
                "Defina JWT_SECRET com um segredo aleatorio de pelo menos 32 caracteres."
            )
        if env != "dev" and self.enable_demo_auth:
            raise ValueError(
                "ENABLE_DEMO_AUTH nao pode ser True em ambientes nao-dev. "
                "Defina ENABLE_DEMO_AUTH=false no ambiente de producao/homologacao."
            )
        return self
    jwt_expires_seconds: int = Field(default=3600, alias="JWT_EXPIRES_SECONDS")
    jwt_expires_in: str = Field(default="1h", alias="JWT_EXPIRES_IN")

    cors_allowed_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", alias="CORS_ALLOWED_ORIGINS")

    rate_limit_window_ms: int = Field(default=60000, alias="RATE_LIMIT_WINDOW_MS")
    rate_limit_max: int = Field(default=120, alias="RATE_LIMIT_MAX")
    login_rate_limit_max: int = Field(default=20, alias="RATE_LIMIT_LOGIN_MAX")

    security_audit_log_enabled: bool = Field(default=True, alias="SECURITY_AUDIT_LOG_ENABLED")
    security_audit_persist_enabled: bool = Field(default=False, alias="SECURITY_AUDIT_PERSIST_ENABLED")
    security_audit_log_path: str = Field(default="logs/security-audit.log", alias="SECURITY_AUDIT_LOG_PATH")

    oidc_issuer: str = Field(default="", alias="OIDC_ISSUER")
    oidc_audience: str = Field(default="", alias="OIDC_AUDIENCE")
    oidc_jwks_url: str = Field(default="", alias="OIDC_JWKS_URL")
    oidc_role_claim: str = Field(default="roles", alias="OIDC_ROLE_CLAIM")
    oidc_tenant_claim: str = Field(default="condominium_id", alias="OIDC_TENANT_CLAIM")

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.0-flash", alias="GEMINI_MODEL")

    langchain_tracing_v2: bool = Field(default=False, alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: str = Field(default="", alias="LANGCHAIN_API_KEY")
    embedding_provider: Literal["google", "local"] = Field(default="local", alias="EMBEDDING_PROVIDER")
    chroma_persist_dir: str = Field(default="./data/chroma_db", alias="CHROMA_PERSIST_DIR")
    rag_top_k: int = Field(default=3, alias="RAG_TOP_K")
    rag_enabled: bool = Field(default=True, alias="RAG_ENABLED")
    knowledge_base_dir: str = Field(default="backend/data/knowledge_base", alias="KNOWLEDGE_BASE_DIR")

    oracle_user: str = Field(default="", alias="ORACLE_USER")
    oracle_password: str = Field(default="", alias="ORACLE_PASSWORD")
    oracle_connect_string: str = Field(default="", alias="ORACLE_CONNECT_STRING")
    oracle_pool_min: int = Field(default=1, alias="ORACLE_POOL_MIN")
    oracle_pool_max: int = Field(default=8, alias="ORACLE_POOL_MAX")

    obs_alert_p95_latency_ms: int = Field(default=1200, alias="OBS_ALERT_P95_LATENCY_MS")
    obs_alert_error_rate_pct: int = Field(default=5, alias="OBS_ALERT_ERROR_RATE_PCT")
    obs_alert_fallback_count: int = Field(default=3, alias="OBS_ALERT_FALLBACK_COUNT")
    obs_alert_channel: str = Field(default="log", alias="OBS_ALERT_CHANNEL")
    obs_alert_webhook_url: str = Field(default="", alias="OBS_ALERT_WEBHOOK_URL")
    obs_alert_webhook_timeout_ms: int = Field(default=5000, alias="OBS_ALERT_WEBHOOK_TIMEOUT_MS")

    @property
    def effective_env(self) -> str:
        return (self.app_env or self.node_env or "dev").lower()

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_allowed_origins.split(",") if item.strip()]

    @property
    def oidc_configured(self) -> bool:
        return bool(self.oidc_issuer and self.oidc_audience and self.oidc_jwks_url)

    @property
    def audit_log_abspath(self) -> Path:
        p = Path(self.security_audit_log_path)
        return p if p.is_absolute() else (Path.cwd() / p)

    @property
    def jwt_expiration_seconds(self) -> int:
        explicit = int(self.jwt_expires_seconds or 0)
        if explicit > 0:
            return explicit

        raw = str(self.jwt_expires_in or "").strip().lower()
        match = re.fullmatch(r"(\d+)\s*([smhd])?", raw)
        if not match:
            return 3600

        value = int(match.group(1))
        unit = match.group(2) or "s"
        multipliers = {"s": 1, "m": 60, "h": 3600, "d": 86400}
        return max(1, value * multipliers[unit])


settings = Settings()
