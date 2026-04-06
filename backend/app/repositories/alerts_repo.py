from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.state_store import read_json_state, write_json_state
from app.utils.seed_loader import read_seed_json

READS_FILE = Path(__file__).resolve().parents[3] / "backend" / "data" / "alerts_reads_state.json"


def _format_relative(value: Any) -> str:
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return "recentemente"
    diff = datetime.now(timezone.utc) - dt.astimezone(timezone.utc)
    hours = max(0, int(diff.total_seconds() // 3600))
    if hours < 1:
        return "agora"
    if hours < 24:
        return f"{hours} h atras"
    return f"{hours // 24} d atras"


def _map_severity(value: Any) -> str:
    raw = str(value or "").lower()
    if raw in {"alta", "critica"}:
        return "critical"
    if raw == "media":
        return "warning"
    return "info"


def _normalize_text(value: Any, fallback: str) -> str:
    if value is None:
        return fallback
    raw = str(value).strip()
    if not raw or raw == "[object Object]":
        return fallback
    return raw[:240]


def _apply_read_state(items: list[dict[str, Any]], condominium_id: int, state: dict[str, Any]) -> list[dict[str, Any]]:
    tenant = state.get(str(condominium_id), {})
    out = []
    for item in items:
        patch = tenant.get(str(item["id"]), {})
        read = bool(patch.get("read"))
        out.append(
            {
                **item,
                "status": "read" if read else "active",
                "read": read,
                "readAt": patch.get("readAt"),
                "readBy": patch.get("readBy"),
            }
        )
    return out


async def get_alerts_data(condominium_id: int = 1) -> dict[str, Any]:
    reads_state = await read_json_state(READS_FILE)

    if settings.db_dialect == "oracle":
        try:
            rows = await run_oracle_query(
                """
                select alert_id, condominio_id, data_detectada, tipo_anomalia, descricao_anomalia, gravidade
                from mart.vw_alerts_operational
                where condominio_id = :condominiumId
                order by data_detectada desc
                fetch first 50 rows only
                """,
                {"condominiumId": condominium_id},
            )
            if rows is not None:
                base_items = [
                    {
                        "id": str(row.get("ALERT_ID")),
                        "condominiumId": int(row.get("CONDOMINIO_ID") or 0) or None,
                        "severity": _map_severity(row.get("GRAVIDADE")),
                        "title": _normalize_text(row.get("TIPO_ANOMALIA"), "anomalia detectada").replace("_", " "),
                        "description": _normalize_text(row.get("DESCRICAO_ANOMALIA"), "Anomalia detectada automaticamente"),
                        "time": _format_relative(row.get("DATA_DETECTADA")),
                    }
                    for row in rows
                ]
                items = _apply_read_state(base_items, condominium_id, reads_state)
                return {"activeCount": len([i for i in items if i["status"] == "active"]), "items": items}
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("alerts", "oracle_fallback_seed")

    seed = read_seed_json("alerts.json")
    base_items = [{**item, "condominiumId": 1} for item in seed.get("items", [])]
    items = _apply_read_state([i for i in base_items if i.get("condominiumId") == condominium_id], condominium_id, reads_state)
    return {"activeCount": len([i for i in items if i["status"] == "active"]), "items": items}


async def mark_alert_as_read(condominium_id: int, alert_id: str, actor_sub: str | None = None) -> dict[str, Any] | None:
    payload = await get_alerts_data(condominium_id)
    exists = any(str(item["id"]) == str(alert_id) for item in payload["items"])
    if not exists:
        return None

    state = await read_json_state(READS_FILE)
    tenant = state.setdefault(str(condominium_id), {})
    tenant[str(alert_id)] = {"read": True, "readAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "readBy": actor_sub}
    await write_json_state(READS_FILE, state)

    refreshed = await get_alerts_data(condominium_id)
    return next((item for item in refreshed["items"] if str(item["id"]) == str(alert_id)), None)
