from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.state_store import read_json_state, write_json_state
from app.integrations.enel.repository import list_imported_invoices_snapshot
from app.utils.seed_loader import read_seed_json

STATUS_FILE = Path(__file__).resolve().parents[3] / "backend" / "data" / "invoices_status_state.json"


def _to_iso_date(value: Any) -> str:
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        try:
            dt = datetime.strptime(str(value), "%Y-%m-%d")
        except ValueError:
            return ""
    return dt.date().isoformat()


def _apply_status_state(items: list[dict[str, Any]], condominium_id: int, state: dict[str, Any]) -> list[dict[str, Any]]:
    tenant = state.get(str(condominium_id), {})
    data = []
    for item in items:
        patch = tenant.get(str(item["id"]), {})
        merged = dict(item)
        if patch:
            merged["status"] = patch.get("status", merged["status"])
            merged["paidAt"] = patch.get("paidAt")
            merged["paidBy"] = patch.get("paidBy")
        data.append(merged)
    return data


def _merge_integration_imports(base_items: list[dict[str, Any]], imported_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not imported_items:
        return base_items

    merged = {str(item.get("id")): dict(item) for item in base_items if item.get("id") is not None}
    for imported in imported_items:
        invoice_id = str(imported.get("id") or "")
        if not invoice_id:
            continue
        if invoice_id in merged:
            continue
        merged[invoice_id] = {
            "id": invoice_id,
            "condominiumId": int(imported.get("condominiumId") or 0) or None,
            "unit": str(imported.get("unit") or "-"),
            "resident": str(imported.get("resident") or "-"),
            "reference": str(imported.get("reference") or ""),
            "dueDate": _to_iso_date(imported.get("dueDate")),
            "amount": float(imported.get("amount") or 0),
            "status": str(imported.get("status") or "pending").lower(),
        }
    return list(merged.values())


async def get_invoices_data(condominium_id: int = 1) -> dict[str, Any]:
    status_state = await read_json_state(STATUS_FILE)
    integration_items = await list_imported_invoices_snapshot(condominium_id)

    if settings.db_dialect == "oracle":
        try:
            rows = await run_oracle_query(
                """
                select fatura_id, condominio_id, unidade, morador, referencia, vencimento, amount, status
                from mart.vw_financial_invoices
                where condominio_id = :condominiumId
                fetch first 200 rows only
                """,
                {"condominiumId": condominium_id},
            )
            if rows is not None:
                base_items = [
                    {
                        "id": str(row.get("FATURA_ID")),
                        "condominiumId": int(row.get("CONDOMINIO_ID") or 0) or None,
                        "unit": row.get("UNIDADE"),
                        "resident": row.get("MORADOR"),
                        "reference": row.get("REFERENCIA"),
                        "dueDate": _to_iso_date(row.get("VENCIMENTO")),
                        "amount": float(row.get("AMOUNT") or 0),
                        "status": str(row.get("STATUS") or "pending").lower(),
                    }
                    for row in rows
                ]
                merged = _merge_integration_imports(base_items, integration_items)
                return {"items": _apply_status_state(merged, condominium_id, status_state)}
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("invoices", "oracle_fallback_seed")

    seed = read_seed_json("invoices.json")
    base_items = [{**item, "condominiumId": 1} for item in seed.get("items", [])]
    filtered = [i for i in base_items if i.get("condominiumId") == condominium_id]
    merged = _merge_integration_imports(filtered, integration_items)
    return {"items": _apply_status_state(merged, condominium_id, status_state)}


async def mark_invoice_as_paid(condominium_id: int, invoice_id: str, actor_sub: str | None = None) -> dict[str, Any] | None:
    payload = await get_invoices_data(condominium_id)
    exists = any(str(item["id"]) == str(invoice_id) for item in payload["items"])
    if not exists:
        return None

    state = await read_json_state(STATUS_FILE)
    tenant = state.setdefault(str(condominium_id), {})
    tenant[str(invoice_id)] = {
        "status": "paid",
        "paidAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "paidBy": actor_sub,
    }
    await write_json_state(STATUS_FILE, state)

    refreshed = await get_invoices_data(condominium_id)
    return next((item for item in refreshed["items"] if str(item["id"]) == str(invoice_id)), None)
