from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings


def persist_security_event(payload: dict[str, Any]) -> None:
    if not settings.security_audit_log_enabled or not settings.security_audit_persist_enabled:
        return

    path = settings.audit_log_abspath
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def query_security_audit_events(filters: dict[str, Any]) -> list[dict[str, Any]]:
    path = settings.audit_log_abspath
    if not path.exists():
        return []

    def parse_ts(value: str | None) -> float | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return None

    from_ts = parse_ts(filters.get("from"))
    to_ts = parse_ts(filters.get("to"))

    items: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            raw = line.strip()
            if not raw:
                continue
            try:
                entry = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if filters.get("event") and entry.get("event") != filters["event"]:
                continue
            if filters.get("actorSub") and entry.get("actorSub") != filters["actorSub"]:
                continue
            if filters.get("condominiumId") and int(entry.get("condominiumId") or 0) != int(filters["condominiumId"]):
                continue

            entry_ts = parse_ts(entry.get("ts"))
            if from_ts and (not entry_ts or entry_ts < from_ts):
                continue
            if to_ts and (not entry_ts or entry_ts > to_ts):
                continue

            items.append(entry)

    items.sort(key=lambda item: item.get("ts") or "", reverse=True)
    limit = max(1, int(filters.get("limit") or 100))
    return items[:limit]
