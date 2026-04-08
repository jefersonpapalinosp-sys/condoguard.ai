from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import require_roles, require_tenant_scope
from app.db.oracle_client import run_oracle_query
from app.integrations.enel.repository import ENEL_STATE_FILE
from app.integrations.sabesp.repository import SABESP_STATE_FILE
from app.repositories.state_store import read_json_state

integration_health_router = APIRouter(prefix="/api/integrations")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _run_summary_from_state(state_file, provider: str, condominium_id: int) -> dict[str, Any]:
    """Build a health summary from the JSON state file (mock fallback)."""
    import asyncio  # noqa: PLC0415

    async def _read():
        return await read_json_state(state_file)

    try:
        loop = asyncio.get_event_loop()
        state = loop.run_until_complete(_read()) if not loop.is_running() else {}
    except Exception:
        state = {}

    tenant = state.get(str(condominium_id)) or {}
    runs = tenant.get("runs") or []
    if not runs:
        return {
            "provider": provider,
            "totalRuns": 0,
            "lastRunAt": None,
            "lastRunStatus": None,
            "lastError": None,
            "source": "state_file",
        }
    last = runs[0]
    return {
        "provider": provider,
        "totalRuns": len(runs),
        "lastRunAt": last.get("finishedAt") or last.get("startedAt"),
        "lastRunStatus": last.get("status"),
        "lastError": last.get("errorSummary") or None,
        "source": "state_file",
    }


async def _run_summary_from_oracle(provider: str, condominium_id: int) -> dict[str, Any] | None:
    """Query Oracle integracoes_execucoes for latest run summary."""
    try:
        rows = await run_oracle_query(
            """
            select run_id, status, finished_at, started_at, error_summary,
                   total_items, imported_items, failed_items
            from app.integracoes_execucoes
            where condominio_id = :condominiumId and provider = :provider
            order by started_at desc
            fetch first 1 rows only
            """,
            {"condominiumId": condominium_id, "provider": provider},
        )
        count_rows = await run_oracle_query(
            """
            select count(1) as TOTAL
            from app.integracoes_execucoes
            where condominio_id = :condominiumId and provider = :provider
            """,
            {"condominiumId": condominium_id, "provider": provider},
        )
        total = int((count_rows or [{}])[0].get("TOTAL") or 0)
        if not rows:
            return {"provider": provider, "totalRuns": total, "lastRunAt": None, "lastRunStatus": None, "lastError": None, "source": "oracle"}
        row = rows[0]
        return {
            "provider": provider,
            "totalRuns": total,
            "lastRunAt": str(row.get("FINISHED_AT") or row.get("STARTED_AT") or ""),
            "lastRunStatus": str(row.get("STATUS") or ""),
            "lastError": str(row.get("ERROR_SUMMARY") or "") or None,
            "source": "oracle",
        }
    except Exception:
        return None


@integration_health_router.get("/health")
async def integration_health(
    auth: dict[str, Any] = Depends(require_tenant_scope),
    _role: dict[str, Any] = Depends(require_roles(["admin", "sindico"])),
) -> dict[str, Any]:
    condominium_id: int = auth["condominiumId"]
    providers = ["enel", "sabesp"]
    state_files = {"enel": ENEL_STATE_FILE, "sabesp": SABESP_STATE_FILE}

    summaries: dict[str, Any] = {}
    for provider in providers:
        if settings.db_dialect == "oracle":
            oracle_summary = await _run_summary_from_oracle(provider, condominium_id)
            if oracle_summary is not None:
                summaries[provider] = oracle_summary
                continue
        # Fallback: read JSON state asynchronously
        try:
            state = await read_json_state(state_files[provider])
            tenant = state.get(str(condominium_id)) or {}
            runs = tenant.get("runs") or []
            if not runs:
                summaries[provider] = {
                    "provider": provider,
                    "totalRuns": 0,
                    "lastRunAt": None,
                    "lastRunStatus": None,
                    "lastError": None,
                    "source": "state_file",
                }
            else:
                last = runs[0]
                summaries[provider] = {
                    "provider": provider,
                    "totalRuns": len(runs),
                    "lastRunAt": last.get("finishedAt") or last.get("startedAt"),
                    "lastRunStatus": last.get("status"),
                    "lastError": last.get("errorSummary") or None,
                    "source": "state_file",
                }
        except Exception:
            summaries[provider] = {
                "provider": provider,
                "totalRuns": 0,
                "lastRunAt": None,
                "lastRunStatus": None,
                "lastError": "unavailable",
                "source": "error",
            }

    overall_ok = all(
        s.get("lastRunStatus") in (None, "completed", "completed_with_errors")
        for s in summaries.values()
    )
    return {
        "ok": overall_ok,
        "generatedAt": _now_iso(),
        "integrations": summaries,
    }
