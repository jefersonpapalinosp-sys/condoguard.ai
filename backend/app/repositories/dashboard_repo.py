from __future__ import annotations

from app.repositories.alerts_repo import get_alerts_data
from app.repositories.invoices_repo import get_invoices_data


async def get_dashboard_data(condominium_id: int = 1) -> dict:
    alerts_payload = await get_alerts_data(condominium_id)
    invoices_payload = await get_invoices_data(condominium_id)

    active_alerts = len([item for item in alerts_payload.get("items", []) if item.get("status") != "read"])
    pending_contracts = len([item for item in invoices_payload.get("items", []) if item.get("status") == "overdue"])

    recent_alerts = [
        {
            "id": item.get("id"),
            "title": item.get("title"),
            "subtitle": item.get("description"),
            "time": item.get("time"),
            "level": item.get("severity"),
        }
        for item in alerts_payload.get("items", [])[:3]
    ]

    return {
        "metrics": {
            "activeAlerts": active_alerts,
            "monthlySavings": "R$ 1.250",
            "currentConsumption": "85%",
            "pendingContracts": pending_contracts,
        },
        "recentAlerts": recent_alerts,
    }

