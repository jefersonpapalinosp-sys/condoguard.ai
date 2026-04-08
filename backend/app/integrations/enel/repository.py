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

ENEL_STATE_FILE = Path(__file__).resolve().parents[4] / "backend" / "data" / "enel_integration_state.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _default_tenant_state() -> dict[str, Any]:
    return {"runs": [], "importedInvoices": []}


def _safe_tenant_state(state: dict[str, Any], condominium_id: int) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    key = str(condominium_id)
    tenant = state.get(key)
    if not isinstance(tenant, dict):
        tenant = _default_tenant_state()
        state[key] = tenant
    if not isinstance(tenant.get("runs"), list):
        tenant["runs"] = []
    if not isinstance(tenant.get("importedInvoices"), list):
        tenant["importedInvoices"] = []
    return tenant


def _reference_to_competencia(reference: str, due_date: str) -> str:
    raw = str(reference or "").strip()
    if re.fullmatch(r"\d{2}/\d{4}", raw):
        month, year = raw.split("/")
        return f"{year}-{month}-01"
    due = str(due_date or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", due):
        return f"{due[:7]}-01"
    return datetime.now(timezone.utc).date().replace(day=1).isoformat()


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


async def _resolve_resident_oracle(condominium_id: int, unidade_id: int) -> dict[str, Any] | None:
    rows = await run_oracle_query(
        """
        select morador_id, nome
        from app.moradores
        where condominio_id = :condominiumId
          and unidade_id = :unidadeId
        fetch first 1 rows only
        """,
        {"condominiumId": condominium_id, "unidadeId": unidade_id},
    )
    if not rows:
        return None
    return rows[0]


async def _try_import_invoice_oracle(condominium_id: int, item: dict[str, Any]) -> dict[str, Any]:
    if settings.db_dialect != "oracle":
        return {
            "mode": "snapshot",
            "result": "imported",
            "message": "Importado em snapshot assistido (dialect nao oracle).",
            "invoiceId": None,
        }

    try:
        unit_row = await _resolve_unit_oracle(condominium_id, str(item.get("unit") or ""))
        if not unit_row:
            return {
                "mode": "oracle",
                "result": "failed",
                "message": f"Unidade {item.get('unit')} nao encontrada no condominio.",
                "invoiceId": None,
            }

        unidade_id = int(unit_row.get("UNIDADE_ID") or 0)
        if unidade_id <= 0:
            return {
                "mode": "oracle",
                "result": "failed",
                "message": f"Unidade {item.get('unit')} sem identificador valido.",
                "invoiceId": None,
            }

        resident = await _resolve_resident_oracle(condominium_id, unidade_id)
        morador_id = int(resident.get("MORADOR_ID") or 0) if resident else None
        competencia = _reference_to_competencia(str(item.get("reference") or ""), str(item.get("dueDate") or ""))

        await run_oracle_execute(
            """
            insert into app.faturas_condominiais (
              condominio_id,
              unidade_id,
              morador_id,
              competencia,
              vencimento,
              valor_total,
              status,
              origem_dado
            ) values (
              :condominiumId,
              :unidadeId,
              :moradorId,
              to_date(:competencia, 'YYYY-MM-DD'),
              to_date(:dueDate, 'YYYY-MM-DD'),
              :amount,
              :status,
              'integration_enel'
            )
            """,
            {
                "condominiumId": condominium_id,
                "unidadeId": unidade_id,
                "moradorId": morador_id,
                "competencia": competencia,
                "dueDate": item.get("dueDate"),
                "amount": float(item.get("amount") or 0),
                "status": item.get("status"),
            },
        )

        invoice_rows = await run_oracle_query(
            """
            select fatura_id
            from app.faturas_condominiais
            where condominio_id = :condominiumId
              and unidade_id = :unidadeId
              and competencia = to_date(:competencia, 'YYYY-MM-DD')
            fetch first 1 rows only
            """,
            {"condominiumId": condominium_id, "unidadeId": unidade_id, "competencia": competencia},
        )
        invoice_id = str(invoice_rows[0].get("FATURA_ID")) if invoice_rows else None

        return {
            "mode": "oracle",
            "result": "imported",
            "message": "Importado em Oracle com origem integration_enel.",
            "invoiceId": invoice_id,
        }
    except Exception as exc:
        message = str(exc or "oracle_error")
        if "ORA-00001" in message:
            return {
                "mode": "oracle",
                "result": "skipped",
                "message": "Duplicado por chave de negocio no Oracle.",
                "invoiceId": None,
            }
        record_api_fallback_metric("integrations_enel", "oracle_fallback_snapshot")
        return {
            "mode": "snapshot",
            "result": "imported",
            "message": "Oracle indisponivel para persistencia da integracao; importado em snapshot assistido.",
            "invoiceId": None,
        }


def _build_snapshot_invoice(condominium_id: int, item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"enel-snapshot-{uuid4().hex[:12]}",
        "condominiumId": condominium_id,
        "unit": item.get("unit"),
        "resident": item.get("resident") or "-",
        "reference": item.get("reference"),
        "dueDate": item.get("dueDate"),
        "amount": float(item.get("amount") or 0),
        "status": str(item.get("status") or "pending"),
        "source": "integration_enel",
        "externalReference": item.get("externalReference"),
        "businessKey": item.get("businessKey"),
        "externalHash": item.get("documentHash"),
        "createdAt": _now_iso(),
    }


async def execute_enel_assisted_run(
    condominium_id: int,
    actor_sub: str | None,
    source: str,
    notes: str | None,
    entries: list[dict[str, Any]],
) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    state = await read_json_state(ENEL_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)

    imported_invoices = tenant.get("importedInvoices", [])
    dedupe_keys = {str(item.get("businessKey") or "") for item in imported_invoices if item.get("businessKey")}
    dedupe_hashes = {str(item.get("externalHash") or "") for item in imported_invoices if item.get("externalHash")}

    run_id = f"enel-run-{uuid4().hex[:12]}"
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
                    "invoiceId": None,
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
                    "invoiceId": None,
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
                    "invoiceId": None,
                    "businessKey": business_key,
                    "externalHash": external_hash,
                    "externalReference": external_reference,
                    "raw": raw,
                }
            )
            continue

        import_result = await _try_import_invoice_oracle(condominium_id, parsed)
        result = str(import_result.get("result") or "failed")
        reason = str(import_result.get("message") or "")
        invoice_id = import_result.get("invoiceId")

        if result == "imported":
            imported_count += 1
            dedupe_keys.add(business_key)
            dedupe_hashes.add(external_hash)
            if import_result.get("mode") == "snapshot":
                imported_invoices.insert(0, _build_snapshot_invoice(condominium_id, parsed))
        elif result == "skipped":
            skipped_count += 1
        else:
            failed_count += 1

        run_items.append(
            {
                "index": index,
                "result": result,
                "reason": reason,
                "invoiceId": invoice_id,
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
        "provider": "enel",
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
    tenant["importedInvoices"] = imported_invoices[:1000]
    state[str(condominium_id)] = tenant
    await write_json_state(ENEL_STATE_FILE, state)
    return run_record


async def list_enel_runs(condominium_id: int, page: int = 1, page_size: int = 20, status: str | None = None) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    state = await read_json_state(ENEL_STATE_FILE)
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


async def get_enel_run_detail(condominium_id: int, run_id: str) -> dict[str, Any] | None:
    condominium_id = ensure_condominium_id(condominium_id)
    state = await read_json_state(ENEL_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    runs = tenant.get("runs", [])
    for run in runs:
        if isinstance(run, dict) and str(run.get("runId")) == str(run_id):
            return run
    return None


async def enel_run_exists_in_other_tenant(condominium_id: int, run_id: str) -> bool:
    condominium_id = ensure_condominium_id(condominium_id)
    state = await read_json_state(ENEL_STATE_FILE)
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


async def list_imported_invoices_snapshot(condominium_id: int) -> list[dict[str, Any]]:
    condominium_id = ensure_condominium_id(condominium_id)
    state = await read_json_state(ENEL_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    invoices = tenant.get("importedInvoices", [])
    if not isinstance(invoices, list):
        return []
    return [dict(item) for item in invoices if isinstance(item, dict)]


def reset_enel_integration_state() -> None:
    try:
        ENEL_STATE_FILE.unlink()
    except FileNotFoundError:
        return
