from __future__ import annotations

from datetime import datetime, timezone
from random import randint
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_execute, run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json

_store: dict[int, list[dict[str, Any]]] = {}
CADASTRO_TYPES = {"unidade", "morador", "fornecedor", "servico"}
CADASTRO_STATUSES = {"active", "pending", "inactive"}


def _normalize(item: dict[str, Any]) -> dict[str, Any]:
    tipo = str(item.get("tipo") or "servico").strip().lower()
    status = str(item.get("status") or "pending").strip().lower()
    return {
        "id": str(item.get("id") or f"cad-{int(datetime.now(timezone.utc).timestamp())}"),
        "condominiumId": int(item.get("condominiumId") or 0) or None,
        "tipo": tipo if tipo in CADASTRO_TYPES else "servico",
        "titulo": str(item.get("titulo") or ""),
        "descricao": str(item.get("descricao") or ""),
        "status": status if status in CADASTRO_STATUSES else "pending",
        "updatedAt": _to_iso_timestamp(item.get("updatedAt")),
    }


def _to_iso_timestamp(value: Any) -> str:
    if isinstance(value, datetime):
        dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    if value is None:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    raw = str(value).strip()
    if not raw:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _map_oracle_row(row: dict[str, Any]) -> dict[str, Any]:
    return _normalize(
        {
            "id": row.get("CADASTRO_ID"),
            "condominiumId": row.get("CONDOMINIO_ID"),
            "tipo": row.get("TIPO"),
            "titulo": row.get("TITULO"),
            "descricao": row.get("DESCRICAO"),
            "status": row.get("STATUS"),
            "updatedAt": row.get("UPDATED_AT"),
        }
    )


async def _list_cadastros_oracle(condominium_id: int) -> list[dict[str, Any]]:
    rows = await run_oracle_query(
        """
        select cadastro_id, condominio_id, tipo, titulo, descricao, status, updated_at
        from cadastros_gerais
        where condominio_id = :condominiumId
        order by updated_at desc
        fetch first 500 rows only
        """,
        {"condominiumId": condominium_id},
    )
    return [_map_oracle_row(row) for row in (rows or [])]


async def _get_cadastro_oracle(condominium_id: int, cadastro_id: str) -> dict[str, Any] | None:
    rows = await run_oracle_query(
        """
        select cadastro_id, condominio_id, tipo, titulo, descricao, status, updated_at
        from cadastros_gerais
        where condominio_id = :condominiumId
          and cadastro_id = :cadastroId
        fetch first 1 rows only
        """,
        {"condominiumId": condominium_id, "cadastroId": cadastro_id},
    )
    if not rows:
        return None
    return _map_oracle_row(rows[0])


def _tenant_store(condominium_id: int) -> list[dict[str, Any]]:
    if condominium_id not in _store:
        seed = read_seed_json("cadastros.json")
        seeded = [_normalize(item) for item in seed.get("items", [])]
        _store[condominium_id] = [item for item in seeded if item.get("condominiumId") == condominium_id]
    return _store[condominium_id]


async def list_cadastros(condominium_id: int = 1) -> dict[str, Any]:
    if settings.db_dialect == "oracle":
        try:
            return {"items": await _list_cadastros_oracle(condominium_id)}
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("cadastros", "oracle_fallback_seed")

    items = sorted(_tenant_store(condominium_id), key=lambda x: x.get("updatedAt", ""), reverse=True)
    return {"items": items}


async def create_cadastro(condominium_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    normalized_payload = _normalize(
        {
            "condominiumId": condominium_id,
            "tipo": payload.get("tipo"),
            "titulo": payload.get("titulo"),
            "descricao": payload.get("descricao"),
            "status": payload.get("status"),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
    )

    if settings.db_dialect == "oracle":
        cadastro_id = f"cad-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{randint(0, 9999):04d}"
        try:
            affected = await run_oracle_execute(
                """
                insert into cadastros_gerais (cadastro_id, condominio_id, tipo, titulo, descricao, status, created_at, updated_at)
                values (:cadastroId, :condominiumId, :tipo, :titulo, :descricao, :status, systimestamp, systimestamp)
                """,
                {
                    "cadastroId": cadastro_id,
                    "condominiumId": condominium_id,
                    "tipo": normalized_payload["tipo"],
                    "titulo": normalized_payload["titulo"],
                    "descricao": normalized_payload["descricao"],
                    "status": normalized_payload["status"],
                },
            )
            if not affected:
                raise RuntimeError("Insert de cadastro nao afetou linhas.")

            created = await _get_cadastro_oracle(condominium_id, cadastro_id)
            if created is None:
                raise RuntimeError("Cadastro criado nao foi encontrado apos insert.")
            return created
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("cadastros", "oracle_fallback_seed")

    items = _tenant_store(condominium_id)
    created = _normalize(
        {
            "id": f"cad-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{randint(0, 9999):04d}",
            "condominiumId": condominium_id,
            "tipo": normalized_payload["tipo"],
            "titulo": normalized_payload["titulo"],
            "descricao": normalized_payload["descricao"],
            "status": normalized_payload["status"],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    items.insert(0, created)
    _store[condominium_id] = items
    return created


async def update_cadastro_status(condominium_id: int, cadastro_id: str, status: str) -> dict[str, Any] | None:
    safe_status = str(status or "").strip().lower()
    if safe_status not in CADASTRO_STATUSES:
        safe_status = "pending"

    if settings.db_dialect == "oracle":
        try:
            affected = await run_oracle_execute(
                """
                update cadastros_gerais
                set status = :status,
                    updated_at = systimestamp
                where condominio_id = :condominiumId
                  and cadastro_id = :cadastroId
                """,
                {"status": safe_status, "condominiumId": condominium_id, "cadastroId": cadastro_id},
            )
            if not affected:
                return None
            return await _get_cadastro_oracle(condominium_id, cadastro_id)
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("cadastros", "oracle_fallback_seed")

    items = _tenant_store(condominium_id)
    for idx, item in enumerate(items):
        if item["id"] == cadastro_id:
            updated = _normalize({**item, "status": safe_status, "updatedAt": datetime.now(timezone.utc).isoformat()})
            items[idx] = updated
            _store[condominium_id] = items
            return updated
    return None


async def update_cadastro(condominium_id: int, cadastro_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if settings.db_dialect == "oracle":
        try:
            affected = await run_oracle_execute(
                """
                update cadastros_gerais
                set tipo       = coalesce(:tipo, tipo),
                    titulo     = coalesce(:titulo, titulo),
                    descricao  = coalesce(:descricao, descricao),
                    status     = coalesce(:status, status),
                    updated_at = systimestamp
                where condominio_id = :condominiumId
                  and cadastro_id   = :cadastroId
                """,
                {
                    "tipo": payload.get("tipo"),
                    "titulo": payload.get("titulo"),
                    "descricao": payload.get("descricao"),
                    "status": payload.get("status"),
                    "condominiumId": condominium_id,
                    "cadastroId": cadastro_id,
                },
            )
            if not affected:
                return None
            return await _get_cadastro_oracle(condominium_id, cadastro_id)
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("cadastros", "oracle_fallback_seed")

    items = _tenant_store(condominium_id)
    for idx, item in enumerate(items):
        if item["id"] == cadastro_id:
            merged = {
                **item,
                "tipo": payload.get("tipo") or item["tipo"],
                "titulo": payload.get("titulo") or item["titulo"],
                "descricao": payload.get("descricao") or item["descricao"],
                "status": payload.get("status") or item["status"],
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
            updated = _normalize(merged)
            items[idx] = updated
            _store[condominium_id] = items
            return updated
    return None


def reset_cadastros_store() -> None:
    _store.clear()
