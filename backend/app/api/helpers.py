from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from app.core.errors import ApiRequestError


def parse_positive_int(value: Any, fallback: int, field: str) -> int:
    if value is None or value == "":
        return fallback
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ApiRequestError(400, "INVALID_QUERY_PARAM", f"{field} deve ser inteiro positivo.", {"field": field, "value": str(value)})
    if parsed <= 0:
        raise ApiRequestError(400, "INVALID_QUERY_PARAM", f"{field} deve ser inteiro positivo.", {"field": field, "value": str(value)})
    return parsed


def parse_enum(value: Any, allowed: list[str], field: str) -> str | None:
    if value is None or value == "":
        return None
    normalized = str(value).lower()
    if normalized not in allowed:
        raise ApiRequestError(400, "INVALID_ENUM_VALUE", f"{field} invalido.", {"field": field, "allowed": allowed, "value": normalized})
    return normalized


def parse_iso_datetime(value: Any, field: str) -> str | None:
    if value is None or value == "":
        return None
    normalized = str(value).strip()
    try:
        dt = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError:
        raise ApiRequestError(400, "INVALID_QUERY_PARAM", f"{field} deve ser data/hora ISO valida.", {"field": field, "value": normalized})
    return dt.isoformat()


def parse_sort_order(value: Any) -> str:
    if value is None or value == "":
        return "asc"
    normalized = str(value).lower()
    if normalized not in ["asc", "desc"]:
        raise ApiRequestError(400, "INVALID_ENUM_VALUE", "sortOrder invalido.", {"field": "sortOrder", "allowed": ["asc", "desc"], "value": normalized})
    return normalized


def parse_sort_by(value: Any, allowed: list[str]) -> str:
    if value is None or value == "":
        return allowed[0]
    normalized = str(value).strip()
    if normalized not in allowed:
        raise ApiRequestError(400, "INVALID_ENUM_VALUE", "sortBy invalido.", {"field": "sortBy", "allowed": allowed, "value": normalized})
    return normalized


def _sort_cmp(left: Any, right: Any) -> int:
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return -1 if left < right else 1 if left > right else 0
    for convert in [lambda x: datetime.fromisoformat(str(x).replace("Z", "+00:00"))]:
        try:
            lv = convert(left)
            rv = convert(right)
            return -1 if lv < rv else 1 if lv > rv else 0
        except Exception:
            pass
    ls = str(left or "")
    rs = str(right or "")
    return -1 if ls < rs else 1 if ls > rs else 0


def sort_collection(items: list[dict[str, Any]], sort_by: str, sort_order: str, selectors: dict[str, Callable[[dict[str, Any]], Any]]) -> list[dict[str, Any]]:
    getter = selectors.get(sort_by)
    if not getter:
        return items

    reverse = sort_order == "desc"
    return sorted(items, key=lambda x: getter(x), reverse=reverse)


def paginate(items: list[dict[str, Any]], page: int, page_size: int) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    total = len(items)
    total_pages = max(1, (total + page_size - 1) // page_size)
    safe_page = min(page, total_pages)
    start = (safe_page - 1) * page_size
    return (
        items[start : start + page_size],
        {
            "page": safe_page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages,
            "hasNext": safe_page < total_pages,
            "hasPrevious": safe_page > 1,
        },
    )


def csv_cell(value: Any) -> str:
    raw = "" if value is None else str(value)
    return f'"{raw.replace("\"", "\"\"")}"'


def invoices_to_csv(items: list[dict[str, Any]]) -> str:
    header = ["id", "condominiumId", "unit", "resident", "reference", "dueDate", "amount", "status"]
    lines = [header] + [[item.get(col, "") for col in header] for item in items]
    return "\n".join([",".join(csv_cell(c) for c in row) for row in lines])


def build_observability_alerts(metrics: dict[str, Any], thresholds: dict[str, Any]) -> list[dict[str, Any]]:
    alerts = []
    if metrics["latency"]["p95Ms"] >= thresholds["latencyP95WarnMs"]:
        alerts.append({
            "id": "latency_p95_high",
            "severity": "warning",
            "message": f"P95 de latencia acima do limite ({metrics['latency']['p95Ms']}ms >= {thresholds['latencyP95WarnMs']}ms).",
            "value": metrics["latency"]["p95Ms"],
            "threshold": thresholds["latencyP95WarnMs"],
        })
    if metrics["counters"]["errorRatePct"] >= thresholds["errorRateWarnPct"]:
        alerts.append({
            "id": "error_rate_high",
            "severity": "critical",
            "message": f"Taxa de erro acima do limite ({metrics['counters']['errorRatePct']}% >= {thresholds['errorRateWarnPct']}%).",
            "value": metrics["counters"]["errorRatePct"],
            "threshold": thresholds["errorRateWarnPct"],
        })
    if metrics["fallbacks"]["total"] >= thresholds["fallbackWarnCount"]:
        alerts.append({
            "id": "fallback_rate_high",
            "severity": "warning",
            "message": f"Fallback de dados acima do limite ({metrics['fallbacks']['total']} >= {thresholds['fallbackWarnCount']}).",
            "value": metrics["fallbacks"]["total"],
            "threshold": thresholds["fallbackWarnCount"],
        })
    return alerts
