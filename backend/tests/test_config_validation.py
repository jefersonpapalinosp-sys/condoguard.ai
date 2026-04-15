from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _build_settings(monkeypatch: pytest.MonkeyPatch, **overrides: str) -> Settings:
    base = {
        "APP_ENV": "dev",
        "NODE_ENV": "dev",
        "DB_DIALECT": "mock",
        "ALLOW_ORACLE_SEED_FALLBACK": "true",
        "AUTH_PROVIDER": "local_jwt",
        "AUTH_PASSWORD_LOGIN_ENABLED": "true",
        "ENABLE_DEMO_AUTH": "false",
        "JWT_SECRET": "test-only-secret-at-least-32-chars-long",
        "CORS_ALLOWED_ORIGINS": "http://localhost:3000,http://127.0.0.1:3000",
        "OIDC_ISSUER": "",
        "OIDC_AUDIENCE": "",
        "OIDC_JWKS_URL": "",
        "OIDC_ROLE_CLAIM": "roles",
        "OIDC_TENANT_CLAIM": "condominium_id",
        "OIDC_ALLOWED_ALGS": "RS256",
    }
    base.update(overrides)

    for key, value in base.items():
        monkeypatch.setenv(key, value)

    return Settings(_env_file=None)


def test_settings_require_oidc_fields_when_provider_is_enabled(monkeypatch: pytest.MonkeyPatch):
    with pytest.raises(ValidationError, match="AUTH_PROVIDER=oidc_jwks exige configuracao valida"):
        _build_settings(
            monkeypatch,
            AUTH_PROVIDER="oidc_jwks",
            OIDC_ISSUER="",
            OIDC_AUDIENCE="",
            OIDC_JWKS_URL="",
        )


def test_settings_reject_password_login_with_oidc_in_hml(monkeypatch: pytest.MonkeyPatch):
    with pytest.raises(ValidationError, match="AUTH_PASSWORD_LOGIN_ENABLED nao pode ser True"):
        _build_settings(
            monkeypatch,
            APP_ENV="hml",
            NODE_ENV="hml",
            DB_DIALECT="oracle",
            ALLOW_ORACLE_SEED_FALLBACK="false",
            AUTH_PROVIDER="oidc_jwks",
            AUTH_PASSWORD_LOGIN_ENABLED="true",
            OIDC_ISSUER="https://issuer.example",
            OIDC_AUDIENCE="atlasgrid-api",
            OIDC_JWKS_URL="https://issuer.example/.well-known/jwks.json",
        )


def test_settings_parse_oidc_allowed_algorithms(monkeypatch: pytest.MonkeyPatch):
    settings = _build_settings(
        monkeypatch,
        AUTH_PROVIDER="oidc_jwks",
        AUTH_PASSWORD_LOGIN_ENABLED="false",
        OIDC_ISSUER="https://issuer.example",
        OIDC_AUDIENCE="atlasgrid-api",
        OIDC_JWKS_URL="https://issuer.example/.well-known/jwks.json",
        OIDC_ALLOWED_ALGS="RS256, RS512, RS256",
    )

    assert settings.oidc_allowed_algorithms == ["RS256", "RS512"]
    assert settings.oidc_configured is True


def test_settings_reject_invalid_oidc_algorithm_list(monkeypatch: pytest.MonkeyPatch):
    with pytest.raises(ValidationError, match="OIDC_ALLOWED_ALGS"):
        _build_settings(
            monkeypatch,
            AUTH_PROVIDER="oidc_jwks",
            AUTH_PASSWORD_LOGIN_ENABLED="false",
            OIDC_ISSUER="https://issuer.example",
            OIDC_AUDIENCE="atlasgrid-api",
            OIDC_JWKS_URL="https://issuer.example/.well-known/jwks.json",
            OIDC_ALLOWED_ALGS="HS256",
        )


def test_settings_expose_oidc_missing_fields_and_readiness_issues(monkeypatch: pytest.MonkeyPatch):
    settings = _build_settings(
        monkeypatch,
        APP_ENV="prod",
        NODE_ENV="prod",
        DB_DIALECT="oracle",
        ALLOW_ORACLE_SEED_FALLBACK="false",
        AUTH_PROVIDER="local_jwt",
        AUTH_PASSWORD_LOGIN_ENABLED="true",
        OIDC_ISSUER="",
        OIDC_AUDIENCE="",
        OIDC_JWKS_URL="",
    )

    assert settings.oidc_ready is False
    assert settings.oidc_missing_fields[:3] == ["OIDC_ISSUER", "OIDC_AUDIENCE", "OIDC_JWKS_URL"]
    assert "AUTH_PROVIDER deve ser oidc_jwks." in settings.oidc_readiness_issues
