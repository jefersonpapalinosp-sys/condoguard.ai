"""
Comunicados repository — tenant-scoped announcement board.

Supports in-memory state layered on top of seed data.
Oracle extension follows the same pattern as contracts_management_repo.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.tenancy import ensure_condominium_id
from app.utils.seed_loader import read_seed_json

# ─── In-memory state (layered on seed) ───────────────────────────────────────

_state: dict[int, list[dict[str, Any]]] = {}  # condominiumId → items


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_all(condominium_id: int) -> list[dict[str, Any]]:
    """Return merged seed + in-memory items for this tenant."""
    if condominium_id not in _state:
        seed = read_seed_json("comunicados.json")
        items = [i for i in seed.get("items", []) if int(i.get("condominiumId", 1)) == condominium_id]
        _state[condominium_id] = items
    return _state[condominium_id]


VALID_CATEGORIES = {"aviso", "urgente", "assembleia", "manutencao", "financeiro"}
VALID_TARGET_ROLES = {"all", "morador", "sindico"}
VALID_STATUSES = {"ativo", "arquivado"}


def _validate(payload: dict[str, Any]) -> str | None:
    """Return error message or None."""
    if not str(payload.get("title") or "").strip():
        return "title é obrigatório"
    if not str(payload.get("body") or "").strip():
        return "body é obrigatório"
    if payload.get("category") and payload["category"] not in VALID_CATEGORIES:
        return f"category inválido: use {VALID_CATEGORIES}"
    if payload.get("targetRole") and payload["targetRole"] not in VALID_TARGET_ROLES:
        return f"targetRole inválido: use {VALID_TARGET_ROLES}"
    return None


# ─── Public API ───────────────────────────────────────────────────────────────

async def list_comunicados(
    condominium_id: int,
    category: str | None = None,
    status: str | None = None,
    target_role: str | None = None,
) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    items = list(_get_all(condominium_id))

    # Filter
    if category:
        items = [i for i in items if i.get("category") == category]
    if status:
        items = [i for i in items if i.get("status") == status]
    if target_role and target_role != "all":
        items = [i for i in items if i.get("targetRole") in ("all", target_role)]

    # Sort newest first
    items = sorted(items, key=lambda x: str(x.get("createdAt") or ""), reverse=True)

    return {
        "items": items,
        "total": len(items),
    }


async def create_comunicado(
    condominium_id: int,
    payload: dict[str, Any],
    author_name: str = "Sindico",
) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    err = _validate(payload)
    if err:
        raise ValueError(err)

    item: dict[str, Any] = {
        "id": f"com-{uuid4().hex[:8]}",
        "condominiumId": condominium_id,
        "title": str(payload["title"]).strip(),
        "body": str(payload["body"]).strip(),
        "category": payload.get("category", "aviso"),
        "targetRole": payload.get("targetRole", "all"),
        "status": "ativo",
        "createdAt": _now_iso(),
        "authorName": author_name,
    }
    _get_all(condominium_id).append(item)
    return item


async def update_comunicado(
    condominium_id: int,
    comunicado_id: str,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    condominium_id = ensure_condominium_id(condominium_id)
    items = _get_all(condominium_id)
    item = next((i for i in items if i["id"] == comunicado_id), None)
    if not item:
        return None

    allowed_fields = {"title", "body", "category", "targetRole", "status"}
    for field in allowed_fields:
        if field in payload:
            item[field] = payload[field]
    item["updatedAt"] = _now_iso()
    return item


async def delete_comunicado(condominium_id: int, comunicado_id: str) -> bool:
    condominium_id = ensure_condominium_id(condominium_id)
    items = _get_all(condominium_id)
    before = len(items)
    _state[condominium_id] = [i for i in items if i["id"] != comunicado_id]
    return len(_state[condominium_id]) < before


def reset_comunicados_store() -> None:
    """Clear in-memory state — used in tests."""
    _state.clear()
