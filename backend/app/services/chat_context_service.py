"""
context_loader node — fetches real-time operational context from the DB (or mock).
"""
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


def _pick_invoice(i: dict) -> dict:
    return {
        "id": i.get("id", ""),
        "unit": i.get("unit", "?"),
        "resident": i.get("resident") or "N/A",
        "amount": float(i.get("amount") or 0),
        "dueDate": i.get("dueDate", "?"),
        "reference": i.get("reference") or "",
        "status": i.get("status", ""),
    }


def _pick_alert(a: dict) -> dict:
    return {
        "id": a.get("id", ""),
        "title": a.get("title", "Alerta sem titulo"),
        "description": (a.get("description") or "")[:150],
        "severity": a.get("severity", "info"),
        "time": a.get("time", ""),
        "status": a.get("status", "active"),
    }


def _pick_unit(u: dict) -> dict:
    return {
        "id": u.get("id", ""),
        "unitCode": u.get("unitCode") or u.get("unit", "?"),
        "floor": u.get("floor", "?"),
        "resident": u.get("resident") or u.get("residentName") or "N/A",
        "status": u.get("status", ""),
    }


async def build_chat_context(condominium_id: int) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
    invoices, alerts, management = await asyncio.gather(
        _safe(get_invoices_data(condominium_id), _EMPTY_INVOICES, "invoices"),
        _safe(get_alerts_data(condominium_id), _EMPTY_ALERTS, "alerts"),
        _safe(get_management_units_data(condominium_id), _EMPTY_MANAGEMENT, "management"),
    )

    all_invoices = invoices.get("items") or []
    all_alerts = alerts.get("items") or []
    all_units = management.get("units") or []

    overdue_list = [i for i in all_invoices if i.get("status") == "overdue"]
    pending_list = [i for i in all_invoices if i.get("status") == "pending"]
    paid_list = [i for i in all_invoices if i.get("status") == "paid"]
    critical_list = [a for a in all_alerts if a.get("severity") == "critical" and a.get("status") != "read"]
    warning_list = [a for a in all_alerts if a.get("severity") == "warning" and a.get("status") != "read"]
    open_alerts_list = [a for a in all_alerts if a.get("status") != "read"]
    maintenance_list = [u for u in all_units if u.get("status") == "maintenance"]
    occupied_list = [u for u in all_units if u.get("status") == "occupied"]

    return {
        "condominiumId": condominium_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataSource": settings.db_dialect,
        "metrics": {
            "pendingInvoices": len(pending_list),
            "overdueInvoices": len(overdue_list),
            "paidInvoices": len(paid_list),
            "criticalAlerts": len(critical_list),
            "warningAlerts": len(warning_list),
            "openAlerts": len(open_alerts_list),
            "maintenanceUnits": len(maintenance_list),
            "occupiedUnits": len(occupied_list),
            "totalUnits": len(all_units),
        },
        # Actual item lists — top 5 per category for LLM context
        "detail": {
            "overdueInvoices": [_pick_invoice(i) for i in overdue_list[:5]],
            "pendingInvoices": [_pick_invoice(i) for i in pending_list[:5]],
            "criticalAlerts": [_pick_alert(a) for a in critical_list[:5]],
            "warningAlerts": [_pick_alert(a) for a in warning_list[:5]],
            "maintenanceUnits": [_pick_unit(u) for u in maintenance_list[:5]],
        },
        "sources": _sources(),
    }
