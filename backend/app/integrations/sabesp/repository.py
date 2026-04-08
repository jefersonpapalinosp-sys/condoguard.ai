from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.core.tenancy import ensure_condominium_id
from app.db.oracle_client import run_oracle_execute, run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.state_store import read_json_state, write_json_state

SABESP_STATE_FILE = Path(__file__).resolve().parents[4] / "backend" / "data" / "sabesp_integration_state.json"
_PROVIDER = "sabesp"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Oracle persistence helpers (Sprint 13 — S13-04)
# ---------------------------------------------------------------------------

async def _persist_run_oracle(condominium_id: int, run_record: dict[str, Any]) -> None:
    """Best-effort: persist SABESP run to app.integracoes_execucoes + app.integracoes_itens."""
    try:
        summary = run_record.get("summary") or {}
        await run_oracle_execute(
            """
            merge into app.integracoes_execucoes t
            using dual on (t.run_id = :runId)
            when not matched then insert (
              run_id, condominio_id, provider, source, status, requested_by,
              started_at, finished_at, duration_ms,
              total_items, imported_items, skipped_items, failed_items,
              error_summary, notes
            ) values (
              :runId, :condominiumId, :provider, :source, :status, :requestedBy,
              cast(:startedAt as timestamp with time zone),
              cast(:finishedAt as timestamp with time zone),
              :durationMs,
              :total, :imported, :skipped, :failed,
              :errorSummary, :notes
            )
            """,
            {
                "runId": run_record["runId"],
                "condominiumId": condominium_id,
                "provider": _PROVIDER,
                "source": str(run_record.get("source") or "manual_assisted")[:40],
                "status": str(run_record.get("status") or "completed")[:30],
                "requestedBy": str(run_record.get("requestedBy") or "system")[:255],
                "startedAt": str(run_record.get("startedAt") or "").replace("Z", "+00:00"),
                "finishedAt": str(run_record.get("finishedAt") or "").replace("Z", "+00:00"),
                "durationMs": run_record.get("durationMs"),
                "total": int(summary.get("total") or 0),
                "imported": int(summary.get("imported") or 0),
                "skipped": int(summary.get("skipped") or 0),
                "failed": int(summary.get("failed") or 0),
                "errorSummary": (str(run_record.get("errorSummary") or "")[:500] or None),
                "notes": (str(run_record.get("notes") or "")[:500] or None),
            },
        )
        for item in run_record.get("items") or []:
            raw = item.get("raw") or {}
            await run_oracle_execute(
                """
                merge into app.integracoes_itens t
                using dual on (t.run_id = :runId and t.item_index = :idx)
                when not matched then insert (
                  run_id, condominio_id, item_index, result, reason,
                  external_reference, unit_code, resident_name, reference_code,
                  due_date, amount, invoice_status, business_key, external_hash
                ) values (
                  :runId, :condominiumId, :idx, :result, :reason,
                  :externalRef, :unit, :resident, :reference,
                  to_date(:dueDate, 'YYYY-MM-DD'), :amount, :invoiceStatus,
                  :businessKey, :externalHash
                )
                """,
                {
                    "runId": run_record["runId"],
                    "condominiumId": condominium_id,
                    "idx": int(item.get("index") or 0),
                    "result": str(item.get("result") or "failed")[:20],
                    "reason": (str(item.get("reason") or "")[:500] or None),
                    "externalRef": (str(item.get("externalReference") or "")[:120] or None),
                    "unit": (str(raw.get("unit") or "")[:30] or None),
                    "resident": (str(raw.get("resident") or "")[:255] or None),
                    "reference": (str(raw.get("reference") or "")[:20] or None),
                    "dueDate": (str(raw.get("dueDate") or "")[:10] or None),
                    "amount": (float(raw.get("amount") or 0) or None),
                    "invoiceStatus": "pending",
                    "businessKey": (str(item.get("businessKey") or "")[:240] or None),
                    "externalHash": (str(item.get("externalHash") or "")[:128] or None),
                },
            )
    except Exception:
        record_api_fallback_metric("integrations_sabesp", "oracle_run_persist_failed")


async def _list_runs_oracle(
    condominium_id: int, page: int, page_size: int, status: str | None
) -> dict[str, Any] | None:
    try:
        count_rows = await run_oracle_query(
            """
            select count(1) as TOTAL
            from app.integracoes_execucoes
            where condominio_id = :condominiumId and provider = :provider
              and (:status is null or status = :status)
            """,
            {"condominiumId": condominium_id, "provider": _PROVIDER, "status": status},
        )
        total = int((count_rows or [{}])[0].get("TOTAL") or 0)
        safe_size = min(200, max(1, int(page_size or 20)))
        safe_page = max(1, int(page or 1))
        total_pages = max(1, (total + safe_size - 1) // safe_size)
        current_page = min(safe_page, total_pages)
        offset = (current_page - 1) * safe_size
        rows = await run_oracle_query(
            """
            select run_id, provider, source, status, started_at, finished_at,
                   duration_ms, requested_by, total_items, imported_items,
                   skipped_items, failed_items, error_summary
            from app.integracoes_execucoes
            where condominio_id = :condominiumId and provider = :provider
              and (:status is null or status = :status)
            order by started_at desc
            offset :offset rows fetch next :pageSize rows only
            """,
            {
                "condominiumId": condominium_id,
                "provider": _PROVIDER,
                "status": status,
                "offset": offset,
                "pageSize": safe_size,
            },
        )
        items = [
            {
                "runId": str(row.get("RUN_ID") or ""),
                "provider": str(row.get("PROVIDER") or _PROVIDER),
                "source": str(row.get("SOURCE") or "manual_assisted"),
                "status": str(row.get("STATUS") or "completed"),
                "startedAt": str(row.get("STARTED_AT") or ""),
                "finishedAt": str(row.get("FINISHED_AT") or ""),
                "durationMs": row.get("DURATION_MS"),
                "requestedBy": str(row.get("REQUESTED_BY") or "system"),
                "summary": {
                    "total": int(row.get("TOTAL_ITEMS") or 0),
                    "imported": int(row.get("IMPORTED_ITEMS") or 0),
                    "skipped": int(row.get("SKIPPED_ITEMS") or 0),
                    "failed": int(row.get("FAILED_ITEMS") or 0),
                },
                "errorSummary": str(row.get("ERROR_SUMMARY") or ""),
            }
            for row in (rows or [])
        ]
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
    except Exception:
        return None


async def _get_run_detail_oracle(condominium_id: int, run_id: str) -> dict[str, Any] | None:
    try:
        run_rows = await run_oracle_query(
            """
            select run_id, provider, source, status, started_at, finished_at,
                   duration_ms, requested_by, total_items, imported_items,
                   skipped_items, failed_items, error_summary, notes
            from app.integracoes_execucoes
            where condominio_id = :condominiumId and provider = :provider and run_id = :runId
            """,
            {"condominiumId": condominium_id, "provider": _PROVIDER, "runId": run_id},
        )
        if not run_rows:
            return None
        row = run_rows[0]
        item_rows = await run_oracle_query(
            """
            select item_index, result, reason, external_reference, unit_code,
                   resident_name, reference_code, due_date, amount, business_key, external_hash
            from app.integracoes_itens
            where run_id = :runId and condominio_id = :condominiumId
            order by item_index
            """,
            {"runId": run_id, "condominiumId": condominium_id},
        )
        items = [
            {
                "index": int(r.get("ITEM_INDEX") or 0),
                "result": str(r.get("RESULT") or "failed"),
                "reason": str(r.get("REASON") or ""),
                "recordId": None,
                "businessKey": str(r.get("BUSINESS_KEY") or ""),
                "externalHash": str(r.get("EXTERNAL_HASH") or ""),
                "externalReference": str(r.get("EXTERNAL_REFERENCE") or ""),
                "raw": {
                    "unit": str(r.get("UNIT_CODE") or ""),
                    "resident": str(r.get("RESIDENT_NAME") or ""),
                    "reference": str(r.get("REFERENCE_CODE") or ""),
                    "dueDate": str(r.get("DUE_DATE") or ""),
                    "amount": float(r.get("AMOUNT") or 0),
                },
            }
            for r in (item_rows or [])
        ]
        return {
            "runId": str(row.get("RUN_ID") or run_id),
            "provider": str(row.get("PROVIDER") or _PROVIDER),
            "source": str(row.get("SOURCE") or "manual_assisted"),
            "status": str(row.get("STATUS") or "completed"),
            "startedAt": str(row.get("STARTED_AT") or ""),
            "finishedAt": str(row.get("FINISHED_AT") or ""),
            "durationMs": row.get("DURATION_MS"),
            "requestedBy": str(row.get("REQUESTED_BY") or "system"),
            "notes": str(row.get("NOTES") or ""),
            "summary": {
                "total": int(row.get("TOTAL_ITEMS") or 0),
                "imported": int(row.get("IMPORTED_ITEMS") or 0),
                "skipped": int(row.get("SKIPPED_ITEMS") or 0),
                "failed": int(row.get("FAILED_ITEMS") or 0),
            },
            "errorSummary": str(row.get("ERROR_SUMMARY") or ""),
            "items": items,
        }
    except Exception:
        return None


def _default_tenant_state() -> dict[str, Any]:
    return {"runs": [], "importedConsumptions": []}


def _safe_tenant_state(state: dict[str, Any], condominium_id: int) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
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
              origem_dado,
              external_reference,
              business_key,
              external_hash,
              observacoes
            ) values (
              :condominiumId,
              :unidadeId,
              :reference,
              to_date(:readingDate, 'YYYY-MM-DD'),
              to_date(:dueDate, 'YYYY-MM-DD'),
              :consumptionM3,
              :amount,
              :status,
              'integration_sabesp',
              :externalReference,
              :businessKey,
              :externalHash,
              :notes
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
                "externalReference": item.get("externalReference"),
                "businessKey": item.get("businessKey"),
                "externalHash": item.get("documentHash"),
                "notes": item.get("notes"),
            },
        )
        record_id = await _find_consumption_oracle_record_id(
            condominium_id,
            str(item.get("businessKey") or ""),
            str(item.get("documentHash") or ""),
        )

        return {
            "mode": "oracle",
            "result": "imported",
            "message": "Importado em Oracle com origem integration_sabesp.",
            "recordId": record_id,
        }
    except Exception as exc:
        message = str(exc or "oracle_error")
        if "ORA-00001" in message:
            record_id = await _find_consumption_oracle_record_id(
                condominium_id,
                str(item.get("businessKey") or ""),
                str(item.get("documentHash") or ""),
            )
            return {
                "mode": "oracle",
                "result": "skipped",
                "message": "Duplicado por chave de negocio no Oracle.",
                "recordId": record_id,
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


async def _find_consumption_oracle_record_id(
    condominium_id: int,
    business_key: str,
    external_hash: str,
) -> str | None:
    rows = await run_oracle_query(
        """
        select consumo_agua_id
        from app.consumo_agua_mensal
        where condominio_id = :condominiumId
          and (
            (:businessKey is not null and business_key = :businessKey)
            or (:externalHash is not null and external_hash = :externalHash)
          )
        fetch first 1 rows only
        """,
        {
            "condominiumId": condominium_id,
            "businessKey": business_key or None,
            "externalHash": external_hash or None,
        },
    )
    if not rows:
        return None
    record_id = rows[0].get("CONSUMO_AGUA_ID")
    return str(record_id) if record_id is not None else None


async def execute_sabesp_assisted_run(
    condominium_id: int,
    actor_sub: str | None,
    source: str,
    notes: str | None,
    entries: list[dict[str, Any]],
) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
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

    if settings.db_dialect == "oracle":
        await _persist_run_oracle(condominium_id, run_record)

    return run_record


async def list_sabesp_runs(condominium_id: int, page: int = 1, page_size: int = 20, status: str | None = None) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    if settings.db_dialect == "oracle":
        oracle_result = await _list_runs_oracle(condominium_id, page, page_size, status)
        if oracle_result is not None:
            return oracle_result
        record_api_fallback_metric("integrations_sabesp", "oracle_list_runs_fallback")
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
    condominium_id = ensure_condominium_id(condominium_id)
    if settings.db_dialect == "oracle":
        oracle_run = await _get_run_detail_oracle(condominium_id, run_id)
        if oracle_run is not None:
            return oracle_run
        record_api_fallback_metric("integrations_sabesp", "oracle_run_detail_fallback")
    state = await read_json_state(SABESP_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    runs = tenant.get("runs", [])
    for run in runs:
        if isinstance(run, dict) and str(run.get("runId")) == str(run_id):
            return run
    return None


async def sabesp_run_exists_in_other_tenant(condominium_id: int, run_id: str) -> bool:
    condominium_id = ensure_condominium_id(condominium_id)
    state = await read_json_state(SABESP_STATE_FILE)
    target_run_id = str(run_id or "").strip()
    if not target_run_id:
        return False

    for tenant_key, tenant_state in state.items():
        if str(tenant_key) == str(condominium_id) or not isinstance(tenant_state, dict):
            continue

        runs = tenant_state.get("runs")
        if not isinstance(runs, list):
            continue

        for run in runs:
            if isinstance(run, dict) and str(run.get("runId")) == target_run_id:
                return True

    return False


def _map_oracle_consumption_to_snapshot(row: dict[str, Any]) -> dict[str, Any]:
    block = str(row.get("BLOCO") or "").strip().upper()
    number = str(row.get("NUMERO_UNIDADE") or "").strip()
    unit = f"{block}-{number}" if block and number else number or "-"
    record_id = str(row.get("CONSUMO_AGUA_ID") or uuid4().hex[:12])
    return {
        "id": f"sabesp-oracle-{record_id}",
        "condominiumId": int(row.get("CONDOMINIO_ID") or 0),
        "unit": unit,
        "resident": str(row.get("RESIDENT_NAME") or "-").strip() or "-",
        "reference": str(row.get("REFERENCIA") or "").strip(),
        "readingDate": str(row.get("READING_DATE") or "").strip(),
        "dueDate": str(row.get("DUE_DATE") or "").strip(),
        "consumptionM3": float(row.get("CONSUMO_M3") or 0),
        "amount": float(row.get("VALOR_TOTAL") or 0),
        "status": str(row.get("STATUS") or "pending"),
        "source": str(row.get("ORIGEM_DADO") or "integration_sabesp"),
        "externalReference": row.get("EXTERNAL_REFERENCE"),
        "businessKey": row.get("BUSINESS_KEY"),
        "externalHash": row.get("EXTERNAL_HASH"),
        "createdAt": str(row.get("CREATED_AT_ISO") or _now_iso()),
    }


async def _list_imported_consumption_oracle(condominium_id: int) -> list[dict[str, Any]]:
    rows = await run_oracle_query(
        """
        select
          c.consumo_agua_id,
          c.condominio_id,
          u.bloco,
          u.numero_unidade,
          c.referencia,
          to_char(c.data_leitura, 'YYYY-MM-DD') as reading_date,
          to_char(c.vencimento, 'YYYY-MM-DD') as due_date,
          c.consumo_m3,
          c.valor_total,
          c.status,
          c.origem_dado,
          c.external_reference,
          c.business_key,
          c.external_hash,
          to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' as created_at_iso,
          (
            select m.nome
            from app.moradores m
            where m.condominio_id = c.condominio_id
              and m.unidade_id = c.unidade_id
            fetch first 1 rows only
          ) as resident_name
        from app.consumo_agua_mensal c
        join app.unidades u on u.unidade_id = c.unidade_id
        where c.condominio_id = :condominiumId
          and c.origem_dado = 'integration_sabesp'
        order by c.created_at desc
        fetch first 24 rows only
        """,
        {"condominiumId": condominium_id},
    )
    return [_map_oracle_consumption_to_snapshot(row) for row in rows or []]


async def _list_imported_consumption_state(condominium_id: int) -> list[dict[str, Any]]:
    state = await read_json_state(SABESP_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    consumptions = tenant.get("importedConsumptions", [])
    if not isinstance(consumptions, list):
        return []
    return [dict(item) for item in consumptions if isinstance(item, dict)]


async def list_imported_consumption_snapshot(condominium_id: int) -> list[dict[str, Any]]:
    condominium_id = ensure_condominium_id(condominium_id)
    state_items = await _list_imported_consumption_state(condominium_id)

    if settings.db_dialect != "oracle":
        return state_items

    try:
        oracle_items = await _list_imported_consumption_oracle(condominium_id)
    except Exception:
        if not settings.allow_oracle_seed_fallback:
            raise
        record_api_fallback_metric("integrations_sabesp", "oracle_snapshot_listing_fallback")
        return state_items

    if not oracle_items:
        return state_items

    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in oracle_items + state_items:
        dedupe_key = (
            str(item.get("businessKey") or "").strip()
            or str(item.get("externalHash") or "").strip()
            or str(item.get("id") or "").strip()
        )
        if dedupe_key and dedupe_key in seen:
            continue
        if dedupe_key:
            seen.add(dedupe_key)
        merged.append(dict(item))

    return merged[:50]


def reset_sabesp_integration_state() -> None:
    try:
        SABESP_STATE_FILE.unlink()
    except FileNotFoundError:
        return
