from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.core.errors import ApiRequestError
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric

try:
    from passlib.context import CryptContext as _CryptContext
    _pwd_context = _CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(value: str) -> str:
        return _pwd_context.hash(value)

    def _verify_password(password: str, password_hash: str | None) -> bool:
        if not password_hash:
            return False
        normalized_hash = str(password_hash).strip()
        if not normalized_hash:
            return False
        # Support legacy SHA256 hashes (hex, 64 chars) during migration
        if len(normalized_hash) == 64 and all(c in "0123456789abcdef" for c in normalized_hash.lower()):
            import hashlib
            return hashlib.sha256(password.encode()).hexdigest() == normalized_hash.lower()
        try:
            return _pwd_context.verify(password, normalized_hash)
        except Exception:
            return False

except ImportError:
    import hashlib as _hashlib

    def _hash_password(value: str) -> str:  # type: ignore[misc]
        return _hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _verify_password(password: str, password_hash: str | None) -> bool:  # type: ignore[misc]
        return _hash_password(password) == str(password_hash or "").lower()

DEMO_USERS = {
    "admin@condoguard.ai": {"password": "password123", "role": "admin", "condominiumId": 1},
    "sindico@condoguard.ai": {"password": "password123", "role": "sindico", "condominiumId": 1},
    "morador@condoguard.ai": {"password": "password123", "role": "morador", "condominiumId": 1},
}

_AUTH_QUERY_BY_SCHEMA = """
    select email, password_hash, role, condominium_id, active
    from app.usuarios
    where lower(email) = :email
"""

_AUTH_QUERY_BY_DEFAULT_SCHEMA = """
    select email, password_hash, role, condominium_id, active
    from usuarios
    where lower(email) = :email
"""


def _is_missing_table_error(exc: Exception) -> bool:
    raw = str(exc).upper()
    return "ORA-00942" in raw or "TABLE OR VIEW DOES NOT EXIST" in raw


async def find_account_for_login(email: str, password: str) -> dict[str, Any] | None:
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return None

    if settings.db_dialect == "oracle":
        try:
            rows = []
            try:
                rows = await run_oracle_query(_AUTH_QUERY_BY_SCHEMA, {"email": normalized_email}) or []
            except Exception as schema_exc:
                if not _is_missing_table_error(schema_exc):
                    raise
                rows = await run_oracle_query(_AUTH_QUERY_BY_DEFAULT_SCHEMA, {"email": normalized_email}) or []

            if rows:
                row = rows[0]
                if int(row.get("ACTIVE") or 0) != 1:
                    return None
                return {
                    "email": str(row.get("EMAIL") or "").lower(),
                    "role": str(row.get("ROLE") or "").lower(),
                    "condominiumId": int(row.get("CONDOMINIUM_ID") or 0) or None,
                    "passwordMatches": _verify_password(password, row.get("PASSWORD_HASH")),
                }
        except Exception:
            if not settings.enable_demo_auth:
                raise ApiRequestError(
                    503,
                    "AUTH_PROVIDER_UNAVAILABLE",
                    "Servico de autenticacao indisponivel no momento.",
                )
            record_api_fallback_metric("auth", "oracle_fallback_demo_auth")

    if not settings.enable_demo_auth:
        return None

    demo = DEMO_USERS.get(normalized_email)
    if not demo:
        return None
    return {
        "email": normalized_email,
        "role": demo["role"],
        "condominiumId": demo["condominiumId"],
        "passwordMatches": demo["password"] == password,
    }
