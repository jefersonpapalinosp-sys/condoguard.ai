from __future__ import annotations

from typing import Any

from .parser import parse_enel_invoice_item
from .repository import execute_enel_assisted_run


async def run_enel_assisted_import(
    condominium_id: int,
    actor_sub: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    source = str(payload.get("source") or "manual_assisted")
    notes = str(payload.get("notes") or "").strip() or None
    raw_items = payload.get("items") or []

    entries: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_items):
        item = dict(raw) if isinstance(raw, dict) else {}
        try:
            parsed = parse_enel_invoice_item(item, condominium_id)
            entries.append({"index": index, "parsed": parsed, "raw": item})
        except Exception as exc:
            entries.append({"index": index, "error": str(exc), "raw": item})

    return await execute_enel_assisted_run(
        condominium_id=condominium_id,
        actor_sub=actor_sub,
        source=source,
        notes=notes,
        entries=entries,
    )

