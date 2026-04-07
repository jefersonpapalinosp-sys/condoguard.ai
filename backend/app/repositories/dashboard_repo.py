from __future__ import annotations

from app.repositories.alerts_repo import get_alerts_data
from app.repositories.invoices_repo import get_invoices_data


def _currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _to_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _monthly_savings(total_amount: float, overdue_amount: float, critical_active: int) -> str:
    # Savings estimate based on paid volume, overdue pressure and operational criticality.
    estimated = (total_amount * 0.18) - (overdue_amount * 0.10) - (max(0, critical_active) * 45)
    return _currency(max(0, estimated))


def _current_consumption(total_amount: float, units_count: int) -> str:
    if units_count <= 0:
        return "0%"
    avg_per_unit = total_amount / units_count
    pct = round((avg_per_unit / 1000) * 100)
    pct = min(100, max(0, int(pct)))
    return f"{pct}%"


async def get_dashboard_data(condominium_id: int = 1) -> dict:
    alerts_payload = await get_alerts_data(condominium_id)
    invoices_payload = await get_invoices_data(condominium_id)

    alerts_items = alerts_payload.get("items", [])
    invoices_items = invoices_payload.get("items", [])
    active_alerts = len([item for item in alerts_items if item.get("status") != "read"])
    critical_active = len(
        [item for item in alerts_items if item.get("status") != "read" and item.get("severity") == "critical"]
    )
    pending_contracts = len([item for item in invoices_items if item.get("status") == "overdue"])

    total_amount = sum(_to_float(item.get("amount")) for item in invoices_items)
    overdue_amount = sum(_to_float(item.get("amount")) for item in invoices_items if item.get("status") == "overdue")
    unique_units = {
        str(item.get("unit") or "").strip().upper()
        for item in invoices_items
        if str(item.get("unit") or "").strip()
    }

    recent_alerts = [
        {
            "id": item.get("id"),
            "title": item.get("title"),
            "subtitle": item.get("description"),
            "time": item.get("time"),
            "level": item.get("severity"),
        }
        for item in alerts_items[:3]
    ]

    return {
        "metrics": {
            "activeAlerts": active_alerts,
            "monthlySavings": _monthly_savings(total_amount, overdue_amount, critical_active),
            "currentConsumption": _current_consumption(total_amount, len(unique_units)),
            "pendingContracts": pending_contracts,
        },
        "recentAlerts": recent_alerts,
    }
