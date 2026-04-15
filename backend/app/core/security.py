from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, Request
from jose import JWTError, jwt

from app.core.config import settings
from app.core.errors import ApiRequestError
from app.utils.logging import log_security_event

AUTH_ROLES = [
    "admin",
    "sindico",
    "morador",
    "gestor",
    "coordenador",
    "engenheiro",
    "mestre_obras",
    "cliente_final",
    "prestador",
    "financeiro",
    "prestador_mkt",
]

FINANCIAL_ROLES = {"admin", "sindico", "gestor", "financeiro"}

# Hierarquia de níveis de documento
DOC_LEVEL_HIERARCHY = {
    "publico": 0,
    "interno": 1,
    "confidencial": 2,
    "restrito": 3,
}

def _decode_bearer(auth_header: str | None) -> str | None:
    raw = str(auth_header or "")
    if not raw.startswith("Bearer "):
        return None
    token = raw[7:].strip()
    return token or None


def _coerce_optional_int(value: Any) -> int | None:
    if value in (None, "", 0, "0"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def create_access_token(user: dict[str, Any]) -> tuple[str, int]:
    """Cria JWT aceitando tanto o payload legado quanto o novo formato de usuario."""
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.jwt_expiration_seconds)
    sub = str(user.get("sub") or user.get("email") or user.get("id") or user.get("usuario_id") or "")
    email = str(user.get("email") or (sub if "@" in sub else ""))
    role = str(user.get("role") or "").lower()
    condominium_id = _coerce_optional_int(
        user.get("condominium_id")
        or user.get("condominiumId")
        or user.get("tenant_id")
        or user.get("tenantId")
    )
    tenant_id = str(user.get("tenant_id") or user.get("tenantId") or condominium_id or "")
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "condominium_id": condominium_id,
        "condominiumId": condominium_id,
        "scope": str(user.get("scope") or user.get("escopo_dados") or "project"),
        "project_ids": user.get("project_ids") or [],
        "doc_level": str(user.get("doc_level") or "interno"),
        "nome": str(user.get("nome") or ""),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, int(expires_at.timestamp() * 1000)


async def verify_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        condominium_id = _coerce_optional_int(
            payload.get("condominium_id")
            or payload.get("condominiumId")
            or payload.get("tenant_id")
            or payload.get("tenantId")
        )
        sub = str(payload.get("sub") or "")
        email = str(payload.get("email") or (sub if "@" in sub else ""))
        return {
            "sub": sub,
            "email": email,
            "role": str(payload.get("role") or "").lower(),
            "tenant_id": str(payload.get("tenant_id") or payload.get("tenantId") or condominium_id or ""),
            "condominiumId": condominium_id,
            "condominium_id": condominium_id,
            "scope": str(payload.get("scope") or "project"),
            "project_ids": payload.get("project_ids") or [],
            "doc_level": str(payload.get("doc_level") or "interno"),
            "nome": str(payload.get("nome") or ""),
        }
    except JWTError:
        raise ApiRequestError(401, "INVALID_TOKEN", "Token invalido.")


async def require_auth(request: Request) -> dict[str, Any]:
    token = _decode_bearer(request.headers.get("authorization"))
    if not token:
        log_security_event("auth_missing_token", request)
        raise ApiRequestError(401, "AUTH_REQUIRED", "Token de autenticacao ausente.")

    payload = await verify_access_token(token)
    role = payload.get("role", "")
    if role not in AUTH_ROLES:
        log_security_event("auth_invalid_token_role", request, {"role": role})
        raise ApiRequestError(401, "INVALID_TOKEN_ROLE", "Role de token invalida.")

    request.state.auth = payload
    return payload


def require_roles(allowed_roles: list[str]):
    """Exige que o usuário tenha um dos roles listados."""
    async def dependency(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
        role = auth.get("role")
        if role not in allowed_roles:
            log_security_event("auth_forbidden_role", request, {"role": role, "allowedRoles": allowed_roles})
            raise ApiRequestError(403, "FORBIDDEN", "Sem permissao para este recurso.", {"allowedRoles": allowed_roles})
        return auth
    return dependency


def require_financial_access():
    """Bloqueia acesso a dados financeiros para roles sem permissão."""
    async def dependency(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
        if auth.get("role") not in FINANCIAL_ROLES:
            log_security_event("auth_forbidden_financial", request, {"role": auth.get("role")})
            raise ApiRequestError(403, "FORBIDDEN_FINANCIAL", "Acesso a dados financeiros nao permitido.")
        return auth
    return dependency


def require_doc_level(minimum_level: str):
    """Exige que o doc_level do usuário seja >= nível mínimo."""
    min_rank = DOC_LEVEL_HIERARCHY.get(minimum_level, 0)

    async def dependency(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
        user_rank = DOC_LEVEL_HIERARCHY.get(auth.get("doc_level", "publico"), 0)
        if user_rank < min_rank:
            log_security_event("auth_forbidden_doc_level", request, {
                "userLevel": auth.get("doc_level"),
                "requiredLevel": minimum_level,
            })
            raise ApiRequestError(403, "FORBIDDEN_DOC_LEVEL", "Nivel de acesso ao documento insuficiente.")
        return auth
    return dependency


def require_data_scope(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
    """
    Injeta filtros de escopo no request.state para uso nos repositórios:
      - global:  sem filtro
      - tenant:  request.state.filter_tenant_id
      - project: request.state.filter_project_ids
      - own:     request.state.filter_user_id
    """
    scope = auth.get("scope", "project")
    if scope == "own":
        request.state.filter_user_id = auth.get("sub")
    elif scope == "project":
        request.state.filter_project_ids = auth.get("project_ids", [])
    elif scope == "tenant":
        request.state.filter_tenant_id = auth.get("tenant_id") or auth.get("condominiumId")
    # "global" não aplica filtro
    return auth


async def require_tenant_scope(request: Request, auth: dict[str, Any] = Depends(require_auth)) -> dict[str, Any]:
    """Compatibilidade entre o contrato legado (`condominiumId`) e o novo (`tenant_id`)."""
    condominium_id = _coerce_optional_int(auth.get("condominiumId") or auth.get("tenant_id"))
    if not condominium_id:
        log_security_event("auth_invalid_tenant_scope", request, {"tenant_id": auth.get("tenant_id")})
        raise ApiRequestError(403, "MISSING_TENANT", "tenant_id ausente no token.")
    auth["condominiumId"] = condominium_id
    auth["condominium_id"] = condominium_id
    auth["tenant_id"] = str(auth.get("tenant_id") or condominium_id)
    request.state.filter_tenant_id = condominium_id
    return auth
