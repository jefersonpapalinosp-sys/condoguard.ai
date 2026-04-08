from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import Depends, Request
from jose import JWTError, jwt

from app.core.config import settings
from app.core.errors import ApiRequestError
from app.core.tenancy import ensure_condominium_id
from app.utils.logging import log_security_event

AUTH_ROLES = ["admin", "sindico", "morador"]
_jwks_cache: dict[str, Any] = {}


def _decode_bearer(auth_header: str | None) -> str | None:
    raw = str(auth_header or "")
    if not raw.startswith("Bearer "):
        return None
    token = raw[7:].strip()
    return token or None


def create_access_token(payload: dict[str, Any]) -> tuple[str, int]:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.jwt_expiration_seconds)
    to_encode = dict(payload)
    to_encode.update({"exp": int(expires_at.timestamp())})
    token = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return token, int(expires_at.timestamp() * 1000)


async def _get_jwks(url: str) -> dict[str, Any]:
    cached = _jwks_cache.get(url)
    now_ts = datetime.now(timezone.utc).timestamp()
    if cached and now_ts - cached["ts"] < 300:
        return cached["payload"]

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        payload = response.json()
        _jwks_cache[url] = {"ts": now_ts, "payload": payload}
        return payload


async def verify_access_token(token: str) -> dict[str, Any]:
    if settings.auth_provider == "oidc_jwks":
        if not settings.oidc_configured:
            raise ApiRequestError(401, "INVALID_TOKEN", "Token invalido.")
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            alg = header.get("alg", "RS256")
            if not kid or alg not in set(settings.oidc_allowed_algorithms):
                raise ApiRequestError(401, "INVALID_TOKEN", "Token invalido.")

            jwks = await _get_jwks(settings.oidc_jwks_url)
            keys = jwks.get("keys", [])
            jwk = next((k for k in keys if k.get("kid") == kid), None)
            if not jwk:
                raise ApiRequestError(401, "INVALID_TOKEN", "Token invalido.")

            payload = jwt.decode(
                token,
                jwk,
                algorithms=settings.oidc_allowed_algorithms,
                audience=settings.oidc_audience,
                issuer=settings.oidc_issuer,
            )
        except ApiRequestError:
            raise
        except Exception as exc:  # pragma: no cover
            raise ApiRequestError(401, "INVALID_TOKEN", "Token invalido.", {"reason": str(exc)})

        role = str(payload.get("role") or payload.get(settings.oidc_role_claim) or "").lower()
        if isinstance(payload.get(settings.oidc_role_claim), list):
            role = str(payload[settings.oidc_role_claim][0] if payload[settings.oidc_role_claim] else "").lower()
        condominium_id = int(payload.get(settings.oidc_tenant_claim) or payload.get("condominium_id") or 0) or None
        return {"sub": str(payload.get("sub") or ""), "role": role, "condominiumId": condominium_id}

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        role = str(payload.get("role") or "").lower()
        condominium_id = int(payload.get("condominium_id") or payload.get("condominiumId") or 0) or None
        return {"sub": str(payload.get("sub") or ""), "role": role, "condominiumId": condominium_id}
    except JWTError:
        raise ApiRequestError(401, "INVALID_TOKEN", "Token invalido.")


async def require_auth(request: Request) -> dict[str, Any]:
    token = _decode_bearer(request.headers.get("authorization"))
    if not token:
        log_security_event("auth_missing_token", request)
        raise ApiRequestError(401, "AUTH_REQUIRED", "Token de autenticacao ausente.")

    payload = await verify_access_token(token)
    role = str(payload.get("role") or "").lower()
    if role not in AUTH_ROLES:
        log_security_event("auth_invalid_token_role", request, {"role": role})
        raise ApiRequestError(401, "INVALID_TOKEN_ROLE", "Role de token invalida.")

    request.state.auth = payload
    return payload


def require_roles(allowed_roles: list[str]):
    async def dependency(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
        role = auth.get("role")
        if role not in allowed_roles:
            log_security_event("auth_forbidden_role", request, {"role": role, "allowedRoles": allowed_roles})
            raise ApiRequestError(403, "FORBIDDEN", "Sem permissao para este recurso.", {"allowedRoles": allowed_roles})
        return auth

    return dependency


async def require_tenant_scope(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
    try:
        auth["condominiumId"] = ensure_condominium_id(auth.get("condominiumId"))
    except ApiRequestError:
        condominium_id = auth.get("condominiumId")
        log_security_event("auth_invalid_tenant_scope", request, {"condominiumId": condominium_id})
        raise
    return auth
