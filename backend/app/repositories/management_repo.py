from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.core.tenancy import ensure_condominium_id
from app.db.oracle_client import run_oracle_execute, run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json

_units_store: dict[int, list[dict[str, Any]]] = {}

UNIT_STATUSES = {"occupied", "vacant", "maintenance"}


def _tenant_units_store(condominium_id: int) -> list[dict[str, Any]]:
    if condominium_id not in _units_store:
        seed = read_seed_json("management_units.json")
        seeded = [{**item, "condominiumId": condominium_id} for item in seed.get("units", [])]
        _units_store[condominium_id] = [item for item in seeded if item.get("condominiumId") == condominium_id]
    return _units_store[condominium_id]


async def get_management_units_data(condominium_id: int) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
    if settings.db_dialect == "oracle":
        try:
            rows = await run_oracle_query(
                """
                select condominio_id, unidade_id, bloco, numero_unidade, morador, status, updated_at
                from mart.vw_management_units
                where condominio_id = :condominiumId
                fetch first 300 rows only
                """,
                {"condominiumId": condominium_id},
            )
            if rows is not None:
                return {
                    "units": [
                        {
                            "id": f"u-{row.get('UNIDADE_ID')}",
                            "condominiumId": int(row.get("CONDOMINIO_ID") or 0) or None,
                            "block": row.get("BLOCO"),
                            "unit": row.get("NUMERO_UNIDADE"),
                            "resident": row.get("MORADOR"),
                            "status": str(row.get("STATUS") or "vacant").lower(),
                            "lastUpdate": "Agora",
                        }
                        for row in rows
                    ]
                }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("management", "oracle_fallback_seed")

    return {"units": list(_tenant_units_store(condominium_id))}


async def update_unit_status(condominium_id: int, unit_id: str, status: str) -> dict[str, Any] | None:
    condominium_id = ensure_condominium_id(condominium_id)
    safe_status = str(status or "").strip().lower()
    if safe_status not in UNIT_STATUSES:
        safe_status = "vacant"

    if settings.db_dialect == "oracle":
        # unit_id format from Oracle path is "u-{UNIDADE_ID}"
        raw_id = unit_id.removeprefix("u-")
        try:
            affected = await run_oracle_execute(
                """
                update app.unidades
                set status = :status,
                    updated_at = systimestamp
                where condominio_id = :condominiumId
                  and unidade_id = :unitId
                """,
                {"status": safe_status, "condominiumId": condominium_id, "unitId": raw_id},
            )
            if not affected:
                return None
            rows = await run_oracle_query(
                """
                select condominio_id, unidade_id, bloco, numero_unidade, morador, status, updated_at
                from mart.vw_management_units
                where condominio_id = :condominiumId and unidade_id = :unitId
                fetch first 1 rows only
                """,
                {"condominiumId": condominium_id, "unitId": raw_id},
            )
            if not rows:
                return None
            row = rows[0]
            return {
                "id": f"u-{row.get('UNIDADE_ID')}",
                "condominiumId": condominium_id,
                "block": row.get("BLOCO"),
                "unit": row.get("NUMERO_UNIDADE"),
                "resident": row.get("MORADOR"),
                "status": str(row.get("STATUS") or "vacant").lower(),
                "lastUpdate": "Agora",
            }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("management", "oracle_fallback_seed")

    units = _tenant_units_store(condominium_id)
    now = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    for idx, item in enumerate(units):
        if item["id"] == unit_id:
            updated = {**item, "status": safe_status, "lastUpdate": now}
            units[idx] = updated
            _units_store[condominium_id] = units
            return updated
    return None


def reset_management_store() -> None:
    _units_store.clear()
