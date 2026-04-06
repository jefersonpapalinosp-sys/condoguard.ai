from __future__ import annotations

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json


async def get_management_units_data(condominium_id: int = 1) -> dict:
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

    seed = read_seed_json("management_units.json")
    units = [{**item, "condominiumId": 1} for item in seed.get("units", [])]
    return {"units": [item for item in units if item.get("condominiumId") == condominium_id]}
