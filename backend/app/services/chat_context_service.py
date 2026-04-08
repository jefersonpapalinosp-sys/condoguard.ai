from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.core.config import settings
from app.core.tenancy import ensure_condominium_id
from app.repositories.alerts_repo import get_alerts_data
from app.repositories.invoices_repo import get_invoices_data
from app.repositories.management_repo import get_management_units_data

_log = logging.getLogger(__name__)

_EMPTY_INVOICES: dict = {"items": []}
_EMPTY_ALERTS: dict = {"items": []}
_EMPTY_MANAGEMENT: dict = {"units": []}


def _sources() -> list[str]:
    if settings.db_dialect == "oracle":
        return ["mart.vw_financial_invoices", "mart.vw_alerts_operational", "mart.vw_management_units"]
    return ["seed:invoices.json", "seed:alerts.json", "seed:management_units.json"]


async def _safe(coro, fallback: dict, label: str) -> dict:
    try:
        return await coro
    except Exception as exc:
        _log.error("chat_context: falha ao carregar %s: %s", label, exc)
        return fallback


async def build_chat_context(condominium_id: int) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
    invoices, alerts, management = await asyncio.gather(
        _safe(get_invoices_data(condominium_id), _EMPTY_INVOICES, "invoices"),
        _safe(get_alerts_data(condominium_id), _EMPTY_ALERTS, "alerts"),
        _safe(get_management_units_data(condominium_id), _EMPTY_MANAGEMENT, "management"),
    )

    pending = len([i for i in invoices["items"] if i.get("status") == "pending"])
    overdue = len([i for i in invoices["items"] if i.get("status") == "overdue"])
    paid = len([i for i in invoices["items"] if i.get("status") == "paid"])
    critical = len([a for a in alerts["items"] if a.get("severity") == "critical" and a.get("status") != "read"])
    open_alerts = len([a for a in alerts["items"] if a.get("status") != "read"])
    maintenance = len([u for u in management["units"] if u.get("status") == "maintenance"])
    occupied = len([u for u in management["units"] if u.get("status") == "occupied"])

    return {
        "condominiumId": condominium_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataSource": settings.db_dialect,
        "metrics": {
            "pendingInvoices": pending,
            "overdueInvoices": overdue,
            "paidInvoices": paid,
            "criticalAlerts": critical,
            "openAlerts": open_alerts,
            "maintenanceUnits": maintenance,
            "occupiedUnits": occupied,
            "totalUnits": len(management["units"]),
        },
        "sources": _sources(),
    }
