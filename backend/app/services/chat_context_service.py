from __future__ import annotations

from app.core.config import settings
from app.repositories.alerts_repo import get_alerts_data
from app.repositories.invoices_repo import get_invoices_data
from app.repositories.management_repo import get_management_units_data


def _sources() -> list[str]:
    if settings.db_dialect == "oracle":
        return ["mart.vw_financial_invoices", "mart.vw_alerts_operational", "mart.vw_management_units"]
    return ["seed:invoices.json", "seed:alerts.json", "seed:management_units.json"]


async def build_chat_context(condominium_id: int = 1) -> dict:
    invoices, alerts, management = await get_invoices_data(condominium_id), await get_alerts_data(condominium_id), await get_management_units_data(condominium_id)

    pending = len([i for i in invoices["items"] if i.get("status") == "pending"])
    overdue = len([i for i in invoices["items"] if i.get("status") == "overdue"])
    paid = len([i for i in invoices["items"] if i.get("status") == "paid"])
    critical = len([a for a in alerts["items"] if a.get("severity") == "critical" and a.get("status") != "read"])
    open_alerts = len([a for a in alerts["items"] if a.get("status") != "read"])
    maintenance = len([u for u in management["units"] if u.get("status") == "maintenance"])
    occupied = len([u for u in management["units"] if u.get("status") == "occupied"])

    from datetime import datetime, timezone

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
