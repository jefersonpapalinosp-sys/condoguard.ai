from __future__ import annotations

from datetime import datetime, timezone
from random import randint
from typing import Any

from app.utils.seed_loader import read_seed_json

_store: dict[int, list[dict[str, Any]]] = {}


def _normalize(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id") or f"cad-{int(datetime.now(timezone.utc).timestamp())}"),
        "condominiumId": int(item.get("condominiumId") or 0) or None,
        "tipo": str(item.get("tipo") or "servico"),
        "titulo": str(item.get("titulo") or ""),
        "descricao": str(item.get("descricao") or ""),
        "status": str(item.get("status") or "pending"),
        "updatedAt": str(item.get("updatedAt") or datetime.now(timezone.utc).isoformat()),
    }


def _tenant_store(condominium_id: int) -> list[dict[str, Any]]:
    if condominium_id not in _store:
        seed = read_seed_json("cadastros.json")
        seeded = [_normalize(item) for item in seed.get("items", [])]
        _store[condominium_id] = [item for item in seeded if item.get("condominiumId") == condominium_id]
    return _store[condominium_id]


async def list_cadastros(condominium_id: int = 1) -> dict[str, Any]:
    items = sorted(_tenant_store(condominium_id), key=lambda x: x.get("updatedAt", ""), reverse=True)
    return {"items": items}


async def create_cadastro(condominium_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    items = _tenant_store(condominium_id)
    created = _normalize(
        {
            "id": f"cad-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{randint(0, 9999):04d}",
            "condominiumId": condominium_id,
            "tipo": payload["tipo"],
            "titulo": payload["titulo"],
            "descricao": payload["descricao"],
            "status": payload["status"],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    items.insert(0, created)
    _store[condominium_id] = items
    return created


async def update_cadastro_status(condominium_id: int, cadastro_id: str, status: str) -> dict[str, Any] | None:
    items = _tenant_store(condominium_id)
    for idx, item in enumerate(items):
        if item["id"] == cadastro_id:
            updated = _normalize({**item, "status": status, "updatedAt": datetime.now(timezone.utc).isoformat()})
            items[idx] = updated
            _store[condominium_id] = items
            return updated
    return None
