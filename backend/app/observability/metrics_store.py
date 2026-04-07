from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Any

MAX_LATENCY_SAMPLES = 2000
MAX_ROUTE_ENTRIES = 200


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class RouteMetric:
    requests: int = 0
    errors: int = 0
    latency_sum_ms: float = 0
    max_latency_ms: float = 0


@dataclass
class MetricsState:
    started_at: str = field(default_factory=_now_iso)
    total_requests: int = 0
    total_errors: int = 0
    latencies: list[float] = field(default_factory=list)
    status_classes: Counter = field(default_factory=lambda: Counter({"2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, "other": 0}))
    routes: dict[str, RouteMetric] = field(default_factory=dict)
    error_codes: Counter = field(default_factory=Counter)
    fallback_by_module: dict[str, dict[str, Any]] = field(default_factory=dict)


state = MetricsState()


def reset_observability_metrics() -> None:
    global state
    state = MetricsState()


def _classify_status(status: int) -> str:
    if 200 <= status < 300:
        return "2xx"
    if 300 <= status < 400:
        return "3xx"
    if 400 <= status < 500:
        return "4xx"
    if 500 <= status < 600:
        return "5xx"
    return "other"


def record_api_request_metric(method: str, path: str, status: int, latency_ms: float) -> None:
    state.total_requests += 1
    state.status_classes[_classify_status(status)] += 1
    if status >= 400:
        state.total_errors += 1

    state.latencies.append(float(latency_ms))
    if len(state.latencies) > MAX_LATENCY_SAMPLES:
        state.latencies.pop(0)

    key = f"{(method or 'GET').upper()} {path or '/'}"
    if key not in state.routes and len(state.routes) >= MAX_ROUTE_ENTRIES:
        return

    route = state.routes.setdefault(key, RouteMetric())
    route.requests += 1
    route.latency_sum_ms += float(latency_ms)
    route.max_latency_ms = max(route.max_latency_ms, float(latency_ms))
    if status >= 400:
        route.errors += 1


def record_api_error_code_metric(code: str) -> None:
    state.error_codes[code or "UNKNOWN_ERROR"] += 1


def record_api_fallback_metric(module_name: str, reason: str = "unknown") -> None:
    module_key = (module_name or "unknown").strip().lower() or "unknown"
    reason_key = (reason or "unknown").strip().lower() or "unknown"
    item = state.fallback_by_module.setdefault(module_key, {"count": 0, "reasons": Counter()})
    item["count"] += 1
    item["reasons"][reason_key] += 1


def _pct(values: list[float], p: int) -> float:
    if not values:
        return 0
    sorted_values = sorted(values)
    idx = min(len(sorted_values) - 1, int((p / 100) * len(sorted_values)))
    return float(sorted_values[idx])


def get_observability_metrics_snapshot(route_limit: int = 10, code_limit: int = 10) -> dict[str, Any]:
    avg = round(mean(state.latencies), 2) if state.latencies else 0
    p95 = round(_pct(state.latencies, 95), 2)
    max_latency = max(state.latencies) if state.latencies else 0
    error_rate = round((state.total_errors / state.total_requests) * 100, 2) if state.total_requests else 0

    top_routes = [
        {
            "route": key,
            "requests": route.requests,
            "errors": route.errors,
            "avgLatencyMs": round(route.latency_sum_ms / route.requests, 2) if route.requests else 0,
            "maxLatencyMs": route.max_latency_ms,
        }
        for key, route in state.routes.items()
    ]
    top_routes.sort(key=lambda x: x["requests"], reverse=True)

    error_codes = [{"code": code, "count": count} for code, count in state.error_codes.items()]
    error_codes.sort(key=lambda x: x["count"], reverse=True)

    modules = []
    for module, data in state.fallback_by_module.items():
        reasons = [{"reason": reason, "count": count} for reason, count in data["reasons"].items()]
        reasons.sort(key=lambda x: x["count"], reverse=True)
        modules.append({"module": module, "count": data["count"], "reasons": reasons})
    modules.sort(key=lambda x: x["count"], reverse=True)

    return {
        "generatedAt": _now_iso(),
        "startedAt": state.started_at,
        "counters": {
            "totalRequests": state.total_requests,
            "totalErrors": state.total_errors,
            "errorRatePct": error_rate,
        },
        "latency": {
            "avgMs": avg,
            "p95Ms": p95,
            "maxMs": max_latency,
            "samples": len(state.latencies),
        },
        "statusClasses": dict(state.status_classes),
        "topRoutes": top_routes[: max(1, route_limit)],
        "errorCodes": error_codes[: max(1, code_limit)],
        "fallbacks": {"total": sum(m["count"] for m in modules), "modules": modules},
    }
