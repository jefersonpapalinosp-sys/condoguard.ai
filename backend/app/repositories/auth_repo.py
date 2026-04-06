from __future__ import annotations

import hashlib
from typing import Any

from app.core.config import settings
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric

DEMO_USERS = {
    "admin@condoguard.ai": {"password": "password123", "role": "admin", "condominiumId": 1},
    "sindico@condoguard.ai": {"password": "password123", "role": "sindico", "condominiumId": 1},
    "morador@condoguard.ai": {"password": "password123", "role": "morador", "condominiumId": 1},
}


def _hash_password(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _verify_password(password: str, password_hash: str | None) -> bool:
    return _hash_password(password) == str(password_hash or "").lower()


async def find_account_for_login(email: str, password: str) -> dict[str, Any] | None:
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return None

    if settings.db_dialect == "oracle":
        try:
            rows = await run_oracle_query(
                """
                select email, password_hash, role, condominium_id, active
                from app.usuarios
                where lower(email) = :email
                fetch first 1 rows only
                """,
                {"email": normalized_email},
            )
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
                raise
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
