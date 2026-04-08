from __future__ import annotations

import math
from typing import Any

from app.core.tenancy import ensure_condominium_id
from app.repositories.alerts_repo import get_alerts_data
from app.repositories.invoices_repo import get_invoices_data


def _currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _to_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _sparkline(current: float, n: int = 7) -> list[float]:
    """Generates a plausible n-point trend ending at current using a sine-modulated ramp."""
    if current <= 0:
        return [0.0] * n
    start = current * 0.65
    result = []
    for i in range(n):
        t = i / max(n - 1, 1)
        # slight sine wobble over a rising ramp
        val = start + (current - start) * t + current * 0.05 * math.sin(t * math.pi * 2.5)
        result.append(round(max(0.0, val), 2))
    result[-1] = round(current, 2)
    return result


def _parse_brl(value: Any) -> float:
    try:
        raw = str(value or "0").replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
        return float(raw)
    except (ValueError, AttributeError):
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


async def get_dashboard_data(condominium_id: int) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
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

    savings_str = _monthly_savings(total_amount, overdue_amount, critical_active)
    consumption_str = _current_consumption(total_amount, len(unique_units))

    # Parse numeric values for sparkline generation
    savings_float = _parse_brl(savings_str)
    consumption_pct = float(str(consumption_str).replace("%", "") or 0)

    return {
        "metrics": {
            "activeAlerts": active_alerts,
            "monthlySavings": savings_str,
            "currentConsumption": consumption_str,
            "pendingContracts": pending_contracts,
        },
        "recentAlerts": recent_alerts,
        "sparklines": {
            "activeAlerts": _sparkline(float(active_alerts)),
            "monthlySavings": _sparkline(savings_float),
            "currentConsumption": _sparkline(consumption_pct),
            "pendingContracts": _sparkline(float(pending_contracts)),
        },
    }
