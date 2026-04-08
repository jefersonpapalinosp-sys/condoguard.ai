from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.db.oracle_client import run_oracle_execute, run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.state_store import read_json_state, write_json_state

SABESP_STATE_FILE = Path(__file__).resolve().parents[4] / "backend" / "data" / "sabesp_integration_state.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _default_tenant_state() -> dict[str, Any]:
    return {"runs": [], "importedConsumptions": []}


def _safe_tenant_state(state: dict[str, Any], condominium_id: int) -> dict[str, Any]:
    key = str(condominium_id)
    tenant = state.get(key)
    if not isinstance(tenant, dict):
        tenant = _default_tenant_state()
        state[key] = tenant
    if not isinstance(tenant.get("runs"), list):
        tenant["runs"] = []
    if not isinstance(tenant.get("importedConsumptions"), list):
        tenant["importedConsumptions"] = []
    return tenant


async def _resolve_unit_oracle(condominium_id: int, unit_code: str) -> dict[str, Any] | None:
    normalized = str(unit_code or "").strip().upper()
    block = None
    number = None
    match = re.fullmatch(r"([A-Z]+)-(\d+)", normalized)
    if match:
        block, number = match.group(1), match.group(2)

    rows = await run_oracle_query(
        """
        select unidade_id, bloco, numero_unidade
        from app.unidades
        where condominio_id = :condominiumId
          and (
            (:block is not null and upper(bloco) = :block and numero_unidade = :number)
            or numero_unidade = :fallbackNumber
          )
        fetch first 1 rows only
        """,
        {
            "condominiumId": condominium_id,
            "block": block,
            "number": number,
            "fallbackNumber": number or normalized.replace("-", ""),
        },
    )
    if not rows:
        return None
    return rows[0]


async def _try_import_consumption_oracle(condominium_id: int, item: dict[str, Any]) -> dict[str, Any]:
    if settings.db_dialect != "oracle":
        return {
            "mode": "snapshot",
            "result": "imported",
            "message": "Importado em snapshot assistido (dialect nao oracle).",
            "recordId": None,
        }

    try:
        unit_row = await _resolve_unit_oracle(condominium_id, str(item.get("unit") or ""))
        if not unit_row:
            return {
                "mode": "snapshot",
                "result": "imported",
                "message": f"Unidade {item.get('unit')} nao mapeada no Oracle; importado em snapshot assistido.",
                "recordId": None,
            }

        unidade_id = int(unit_row.get("UNIDADE_ID") or 0)
        if unidade_id <= 0:
            return {
                "mode": "snapshot",
                "result": "imported",
                "message": "Unidade sem identificador Oracle valido; importado em snapshot assistido.",
                "recordId": None,
            }

        await run_oracle_execute(
            """
            insert into app.consumo_agua_mensal (
              condominio_id,
              unidade_id,
              referencia,
              data_leitura,
              vencimento,
              consumo_m3,
              valor_total,
              status,
              origem_dado
            ) values (
              :condominiumId,
              :unidadeId,
              :reference,
              to_date(:readingDate, 'YYYY-MM-DD'),
              to_date(:dueDate, 'YYYY-MM-DD'),
              :consumptionM3,
              :amount,
              :status,
              'integration_sabesp'
            )
            """,
            {
                "condominiumId": condominium_id,
                "unidadeId": unidade_id,
                "reference": item.get("reference"),
                "readingDate": item.get("readingDate"),
                "dueDate": item.get("dueDate"),
                "consumptionM3": float(item.get("consumptionM3") or 0),
                "amount": float(item.get("amount") or 0),
                "status": item.get("status"),
            },
        )

        return {
            "mode": "oracle",
            "result": "imported",
            "message": "Importado em Oracle com origem integration_sabesp.",
            "recordId": None,
        }
    except Exception as exc:
        message = str(exc or "oracle_error")
        if "ORA-00001" in message:
            return {
                "mode": "oracle",
                "result": "skipped",
                "message": "Duplicado por chave de negocio no Oracle.",
                "recordId": None,
            }
        record_api_fallback_metric("integrations_sabesp", "oracle_fallback_snapshot")
        return {
            "mode": "snapshot",
            "result": "imported",
            "message": "Oracle indisponivel para persistencia da integracao; importado em snapshot assistido.",
            "recordId": None,
        }


def _build_snapshot_consumption(condominium_id: int, item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"sabesp-snapshot-{uuid4().hex[:12]}",
        "condominiumId": condominium_id,
        "unit": item.get("unit"),
        "resident": item.get("resident") or "-",
        "reference": item.get("reference"),
        "readingDate": item.get("readingDate"),
        "dueDate": item.get("dueDate"),
        "consumptionM3": float(item.get("consumptionM3") or 0),
        "amount": float(item.get("amount") or 0),
        "status": str(item.get("status") or "pending"),
        "source": "integration_sabesp",
        "externalReference": item.get("externalReference"),
        "businessKey": item.get("businessKey"),
        "externalHash": item.get("documentHash"),
        "createdAt": _now_iso(),
    }


async def execute_sabesp_assisted_run(
    condominium_id: int,
    actor_sub: str | None,
    source: str,
    notes: str | None,
    entries: list[dict[str, Any]],
) -> dict[str, Any]:
    state = await read_json_state(SABESP_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)

    imported_consumptions = tenant.get("importedConsumptions", [])
    dedupe_keys = {str(item.get("businessKey") or "") for item in imported_consumptions if item.get("businessKey")}
    dedupe_hashes = {str(item.get("externalHash") or "") for item in imported_consumptions if item.get("externalHash")}

    run_id = f"sabesp-run-{uuid4().hex[:12]}"
    started_at = _now_iso()
    started_perf = datetime.now(timezone.utc)

    run_items: list[dict[str, Any]] = []
    imported_count = 0
    skipped_count = 0
    failed_count = 0

    for entry in sorted(entries, key=lambda item: int(item.get("index") or 0)):
        index = int(entry.get("index") or 0)
        raw = entry.get("raw")

        if entry.get("error"):
            failed_count += 1
            run_items.append(
                {
                    "index": index,
                    "result": "failed",
                    "reason": str(entry.get("error")),
                    "recordId": None,
                    "businessKey": None,
                    "externalHash": None,
                    "externalReference": None,
                    "raw": raw,
                }
            )
            continue

        parsed = entry.get("parsed")
        if not isinstance(parsed, dict):
            failed_count += 1
            run_items.append(
                {
                    "index": index,
                    "result": "failed",
                    "reason": "Item sem payload parseado.",
                    "recordId": None,
                    "businessKey": None,
                    "externalHash": None,
                    "externalReference": None,
                    "raw": raw,
                }
            )
            continue

        business_key = str(parsed.get("businessKey") or "")
        external_hash = str(parsed.get("documentHash") or "")
        external_reference = str(parsed.get("externalReference") or "")

        if business_key in dedupe_keys or external_hash in dedupe_hashes:
            skipped_count += 1
            run_items.append(
                {
                    "index": index,
                    "result": "skipped",
                    "reason": "Item duplicado por businessKey/documentHash.",
                    "recordId": None,
                    "businessKey": business_key,
                    "externalHash": external_hash,
                    "externalReference": external_reference,
                    "raw": raw,
                }
            )
            continue

        import_result = await _try_import_consumption_oracle(condominium_id, parsed)
        result = str(import_result.get("result") or "failed")
        reason = str(import_result.get("message") or "")
        record_id = import_result.get("recordId")

        if result == "imported":
            imported_count += 1
            dedupe_keys.add(business_key)
            dedupe_hashes.add(external_hash)
            if import_result.get("mode") == "snapshot":
                imported_consumptions.insert(0, _build_snapshot_consumption(condominium_id, parsed))
        elif result == "skipped":
            skipped_count += 1
        else:
            failed_count += 1

        run_items.append(
            {
                "index": index,
                "result": result,
                "reason": reason,
                "recordId": record_id,
                "businessKey": business_key,
                "externalHash": external_hash,
                "externalReference": external_reference,
                "raw": raw,
            }
        )

    finished_at = _now_iso()
    duration_ms = int((datetime.now(timezone.utc) - started_perf).total_seconds() * 1000)

    summary = {
        "total": len(entries),
        "imported": imported_count,
        "skipped": skipped_count,
        "failed": failed_count,
    }
    if imported_count == 0 and failed_count > 0 and skipped_count == 0:
        status = "failed"
    elif failed_count > 0:
        status = "completed_with_errors"
    else:
        status = "completed"

    errors = [str(item.get("reason") or "") for item in run_items if item.get("result") == "failed"][:3]
    run_record = {
        "runId": run_id,
        "provider": "sabesp",
        "source": str(source or "manual_assisted"),
        "status": status,
        "startedAt": started_at,
        "finishedAt": finished_at,
        "durationMs": duration_ms,
        "requestedBy": actor_sub or "system",
        "notes": str(notes or "").strip(),
        "summary": summary,
        "errorSummary": "; ".join(error for error in errors if error),
        "items": run_items,
    }

    tenant["runs"].insert(0, run_record)
    tenant["runs"] = tenant["runs"][:200]
    tenant["importedConsumptions"] = imported_consumptions[:1000]
    state[str(condominium_id)] = tenant
    await write_json_state(SABESP_STATE_FILE, state)
    return run_record


async def list_sabesp_runs(condominium_id: int, page: int = 1, page_size: int = 20, status: str | None = None) -> dict[str, Any]:
    state = await read_json_state(SABESP_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    runs = tenant.get("runs", [])

    filtered = []
    for run in runs:
        if not isinstance(run, dict):
            continue
        run_status = str(run.get("status") or "")
        if status and run_status != status:
            continue
        filtered.append(
            {
                "runId": run.get("runId"),
                "provider": run.get("provider"),
                "source": run.get("source"),
                "status": run_status,
                "startedAt": run.get("startedAt"),
                "finishedAt": run.get("finishedAt"),
                "durationMs": run.get("durationMs"),
                "requestedBy": run.get("requestedBy"),
                "summary": run.get("summary"),
                "errorSummary": run.get("errorSummary"),
            }
        )

    safe_size = min(200, max(1, int(page_size or 20)))
    safe_page = max(1, int(page or 1))
    total = len(filtered)
    total_pages = max(1, (total + safe_size - 1) // safe_size)
    current_page = min(safe_page, total_pages)
    start = (current_page - 1) * safe_size
    items = filtered[start : start + safe_size]

    return {
        "items": items,
        "meta": {
            "page": current_page,
            "pageSize": safe_size,
            "total": total,
            "totalPages": total_pages,
            "hasNext": current_page < total_pages,
            "hasPrevious": current_page > 1,
        },
        "filters": {"status": status},
    }


async def get_sabesp_run_detail(condominium_id: int, run_id: str) -> dict[str, Any] | None:
    state = await read_json_state(SABESP_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    runs = tenant.get("runs", [])
    for run in runs:
        if isinstance(run, dict) and str(run.get("runId")) == str(run_id):
            return run
    return None


async def list_imported_consumption_snapshot(condominium_id: int) -> list[dict[str, Any]]:
    state = await read_json_state(SABESP_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    consumptions = tenant.get("importedConsumptions", [])
    if not isinstance(consumptions, list):
        return []
    return [dict(item) for item in consumptions if isinstance(item, dict)]


def reset_sabesp_integration_state() -> None:
    try:
        SABESP_STATE_FILE.unlink()
    except FileNotFoundError:
        return
