from __future__ import annotations

from typing import Any

from app.core.errors import ApiRequestError


def ensure_condominium_id(value: Any, message: str = "Escopo de condominio invalido no token.") -> int:
    try:
        condominium_id = int(value)
    except (TypeError, ValueError):
        raise ApiRequestError(401, "INVALID_TENANT_SCOPE", message, {"condominiumId": value})

    if condominium_id <= 0:
        raise ApiRequestError(401, "INVALID_TENANT_SCOPE", message, {"condominiumId": value})

    return condominium_id
