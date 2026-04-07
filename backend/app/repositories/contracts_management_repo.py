from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.state_store import read_json_state, write_json_state
from app.utils.seed_loader import read_seed_json

CONTRACTS_STATE_FILE = Path(__file__).resolve().parents[3] / "backend" / "data" / "contracts_management_state.json"

DEFAULT_INDEX_RATES = {"IPCA": 0.06, "IGPM": 0.08, "INPC": 0.055, "FIXO": 0.04}
CONTRACT_STATUSES = {"active", "expiring", "expired", "renewal_pending", "closed", "draft"}
CONTRACT_RENEWAL_STATUSES = {"not_started", "in_progress", "renewed", "closed"}
RISK_LEVELS = {"low", "medium", "high"}
DOC_STATUSES = {"active", "archived", "pending_review"}


def _default_tenant_state() -> dict[str, Any]:
    return {"contracts": {}, "documents": {}, "events": {}, "nextSequence": 1}


def _safe_tenant_state(state: dict[str, Any], condominium_id: int) -> dict[str, Any]:
    key = str(condominium_id)
    tenant = state.get(key)
    if not isinstance(tenant, dict):
        tenant = _default_tenant_state()
        state[key] = tenant
    tenant.setdefault("contracts", {})
    tenant.setdefault("documents", {})
    tenant.setdefault("events", {})
    tenant.setdefault("nextSequence", 1)
    return tenant


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _to_iso_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if value is None:
        return ""
    raw = str(value).strip()
    if not raw:
        return ""
    for pattern in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return ""


def _parse_iso_date(value: Any) -> date | None:
    iso = _to_iso_date(value)
    if not iso:
        return None
    try:
        return date.fromisoformat(iso)
    except ValueError:
        return None


def _parse_currency(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    raw = str(value or "").strip()
    if not raw:
        return 0.0
    cleaned = raw.replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _currency(value: float) -> str:
    return f"R$ {float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _safe_index(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if raw in DEFAULT_INDEX_RATES:
        return raw
    return "IPCA"


def _risk_from_audit(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if raw in {"critico", "critical", "alto", "high"}:
        return "high"
    if raw in {"medio", "medium", "atencao", "warning"}:
        return "medium"
    return "low"


def _category_from_service(service_type: str) -> str:
    text = str(service_type or "").strip().lower()
    if "segur" in text or "portari" in text:
        return "Seguranca"
    if "limpez" in text or "conserv" in text or "higien" in text:
        return "Conservacao"
    if "elevador" in text or "manut" in text:
        return "Manutencao"
    if "jardin" in text or "paisag" in text:
        return "Paisagismo"
    return "Servicos Gerais"


def _add_months(base: date, months: int) -> date:
    target_month = base.month + months
    year = base.year + ((target_month - 1) // 12)
    month = ((target_month - 1) % 12) + 1
    day = min(base.day, 28)
    return date(year, month, day)


def _compute_term_months(start: str, end: str) -> int:
    start_d = _parse_iso_date(start)
    end_d = _parse_iso_date(end)
    if not start_d or not end_d:
        return 12
    months = (end_d.year - start_d.year) * 12 + (end_d.month - start_d.month)
    return max(1, months or 1)


def _compute_next_adjustment(start_date: str, frequency_months: int, end_date: str) -> str:
    start = _parse_iso_date(start_date)
    if not start:
        return ""
    freq = max(1, int(frequency_months or 12))
    end = _parse_iso_date(end_date)
    today = date.today()
    cursor = start
    while cursor <= today:
        cursor = _add_months(cursor, freq)
    if end and cursor > end:
        return end.isoformat()
    return cursor.isoformat()


def _status_from_dates(end_date: str, current_status: str | None = None) -> str:
    current = str(current_status or "").strip().lower()
    if current in {"closed", "draft", "renewal_pending"}:
        return current

    end_d = _parse_iso_date(end_date)
    if not end_d:
        return "active"
    delta = (end_d - date.today()).days
    if delta < 0:
        return "expired"
    if delta <= 90:
        return "expiring"
    return "active"


def _enrich_contract(record: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(record)
    monthly_value = _parse_currency(record.get("monthlyValue"))
    start_date = _to_iso_date(record.get("startDate"))
    end_date = _to_iso_date(record.get("endDate"))
    frequency = int(record.get("adjustmentFrequencyMonths") or 12)
    next_adjustment = _to_iso_date(record.get("nextAdjustmentDate")) or _compute_next_adjustment(start_date, frequency, end_date)
    index_name = _safe_index(record.get("index"))
    status = _status_from_dates(end_date, str(record.get("status") or ""))
    risk = str(record.get("risk") or "").strip().lower()
    if risk not in RISK_LEVELS:
        risk = _risk_from_audit(record.get("risk"))

    end_d = _parse_iso_date(end_date)
    next_d = _parse_iso_date(next_adjustment)
    days_to_end = (end_d - date.today()).days if end_d else None
    adjustment_due_in = (next_d - date.today()).days if next_d else None

    if risk == "low":
        if status == "expired" or (days_to_end is not None and days_to_end <= 15):
            risk = "high"
        elif status == "expiring" or (adjustment_due_in is not None and adjustment_due_in <= 30):
            risk = "medium"

    projected_value = monthly_value * (1 + DEFAULT_INDEX_RATES.get(index_name, 0.05))

    enriched.update(
        {
            "id": str(record.get("id") or ""),
            "contractNumber": str(record.get("contractNumber") or f"CTR-{str(record.get('id') or '0').zfill(4)}"),
            "name": str(record.get("name") or f"Contrato {record.get('id') or ''}").strip(),
            "supplier": str(record.get("supplier") or "Fornecedor nao informado").strip(),
            "supplierId": record.get("supplierId"),
            "category": str(record.get("category") or _category_from_service(str(record.get("serviceType") or ""))),
            "description": str(record.get("description") or "Contrato operacional em acompanhamento."),
            "serviceType": str(record.get("serviceType") or "Servico geral"),
            "monthlyValue": round(monthly_value, 2),
            "startDate": start_date,
            "endDate": end_date,
            "termMonths": int(record.get("termMonths") or _compute_term_months(start_date, end_date)),
            "index": index_name,
            "adjustmentFrequencyMonths": frequency,
            "nextAdjustmentDate": next_adjustment,
            "internalOwner": str(record.get("internalOwner") or "Gestao condominial"),
            "status": status if status in CONTRACT_STATUSES else "active",
            "renewalStatus": str(record.get("renewalStatus") or "not_started"),
            "risk": risk if risk in RISK_LEVELS else "low",
            "notes": str(record.get("notes") or ""),
            "createdAt": str(record.get("createdAt") or _now_iso()),
            "updatedAt": str(record.get("updatedAt") or _now_iso()),
            "daysToEnd": days_to_end,
            "adjustmentDueInDays": adjustment_due_in,
            "projectedMonthlyValue": round(projected_value, 2),
            "estimatedAdjustmentImpact": round(projected_value - monthly_value, 2),
            "monthlyValueLabel": _currency(monthly_value),
            "projectedMonthlyValueLabel": _currency(projected_value),
            "estimatedAdjustmentImpactLabel": _currency(projected_value - monthly_value),
        }
    )
    if enriched["renewalStatus"] not in CONTRACT_RENEWAL_STATUSES:
        enriched["renewalStatus"] = "not_started"
    return enriched


async def _load_base_contracts_oracle(condominium_id: int) -> list[dict[str, Any]]:
    rows = await run_oracle_query(
        """
        select
          c.contrato_id,
          c.condominio_id,
          c.fornecedor_id,
          f.razao_social as fornecedor,
          c.tipo_servico,
          c.valor_mensal_vigente,
          c.data_inicio,
          c.data_vencimento,
          c.indice_reajuste,
          c.status_auditoria_ia
        from app.contratos c
        join app.fornecedores f on f.fornecedor_id = c.fornecedor_id
        where c.condominio_id = :condominiumId
        order by c.valor_mensal_vigente desc
        fetch first 500 rows only
        """,
        {"condominiumId": condominium_id},
    )
    items = []
    for idx, row in enumerate(rows or []):
        contract_id = str(row.get("CONTRATO_ID") or idx + 1)
        start_date = _to_iso_date(row.get("DATA_INICIO"))
        end_date = _to_iso_date(row.get("DATA_VENCIMENTO"))
        service_type = str(row.get("TIPO_SERVICO") or "Servico geral")
        base = {
            "id": contract_id,
            "contractNumber": f"CTR-{contract_id.zfill(4)}",
            "name": f"{service_type} - {row.get('FORNECEDOR') or 'Fornecedor'}",
            "supplier": str(row.get("FORNECEDOR") or f"Fornecedor {idx + 1}"),
            "supplierId": row.get("FORNECEDOR_ID"),
            "category": _category_from_service(service_type),
            "description": f"Contrato de {service_type.lower()} vinculado ao condominio.",
            "serviceType": service_type,
            "monthlyValue": float(row.get("VALOR_MENSAL_VIGENTE") or 0),
            "startDate": start_date,
            "endDate": end_date,
            "termMonths": _compute_term_months(start_date, end_date),
            "index": _safe_index(row.get("INDICE_REAJUSTE")),
            "adjustmentFrequencyMonths": 12,
            "nextAdjustmentDate": _compute_next_adjustment(start_date, 12, end_date),
            "internalOwner": "Sindico responsavel",
            "status": _status_from_dates(end_date),
            "renewalStatus": "not_started",
            "risk": _risk_from_audit(row.get("STATUS_AUDITORIA_IA")),
            "notes": str(row.get("STATUS_AUDITORIA_IA") or "Sem observacoes adicionais."),
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        items.append(_enrich_contract(base))
    return items


def _seed_contracts(condominium_id: int) -> list[dict[str, Any]]:
    seed = read_seed_json("contracts.json")
    items = []
    today = date.today()
    for idx, raw in enumerate(seed.get("items", [])):
        start_date = _add_months(today, -(idx + 2) * 6)
        end_date = _add_months(today, 3 + (idx * 4))
        base = {
            "id": str(raw.get("id") or f"seed-{idx + 1}"),
            "contractNumber": f"CTR-S{idx + 1:03d}",
            "name": str(raw.get("vendor") or f"Contrato seed {idx + 1}"),
            "supplier": str(raw.get("vendor") or f"Fornecedor {idx + 1}"),
            "supplierId": None,
            "category": _category_from_service(str(raw.get("note") or "")),
            "description": str(raw.get("note") or "Contrato de referencia em ambiente seed."),
            "serviceType": str(raw.get("note") or "Servico geral"),
            "monthlyValue": _parse_currency(raw.get("monthlyValue")),
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "termMonths": _compute_term_months(start_date.isoformat(), end_date.isoformat()),
            "index": _safe_index(raw.get("index")),
            "adjustmentFrequencyMonths": 12,
            "nextAdjustmentDate": _compute_next_adjustment(start_date.isoformat(), 12, end_date.isoformat()),
            "internalOwner": "Gestao condominial",
            "status": _status_from_dates(end_date.isoformat()),
            "renewalStatus": "not_started",
            "risk": str(raw.get("risk") or "low"),
            "notes": str(raw.get("note") or ""),
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
            "condominiumId": condominium_id,
        }
        items.append(_enrich_contract(base))
    return items


async def _load_base_contracts(condominium_id: int) -> list[dict[str, Any]]:
    if settings.db_dialect == "oracle":
        try:
            return await _load_base_contracts_oracle(condominium_id)
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("contracts", "oracle_fallback_seed")
    return _seed_contracts(condominium_id)


def _merge_state_overrides(base_items: list[dict[str, Any]], tenant_state: dict[str, Any], condominium_id: int) -> list[dict[str, Any]]:
    base_map: dict[str, dict[str, Any]] = {str(item["id"]): dict(item) for item in base_items}
    overlays = tenant_state.get("contracts", {})
    if not isinstance(overlays, dict):
        overlays = {}

    for contract_id, patch in overlays.items():
        if not isinstance(patch, dict):
            continue
        existing = base_map.get(str(contract_id), {"id": str(contract_id), "condominiumId": condominium_id})
        merged = dict(existing)
        merged.update(patch)
        merged["id"] = str(contract_id)
        base_map[str(contract_id)] = _enrich_contract(merged)

    return sorted(base_map.values(), key=lambda item: item.get("monthlyValue", 0), reverse=True)


async def _get_contract_catalog(condominium_id: int) -> list[dict[str, Any]]:
    base = await _load_base_contracts(condominium_id)
    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    return _merge_state_overrides(base, tenant, condominium_id)


def _event_entry(event_type: str, message: str, actor_sub: str | None = None) -> dict[str, Any]:
    return {
        "id": f"evt-{uuid4().hex[:10]}",
        "type": event_type,
        "message": message,
        "actor": actor_sub or "system",
        "createdAt": _now_iso(),
    }


async def _append_event(condominium_id: int, contract_id: str, event_type: str, message: str, actor_sub: str | None = None) -> None:
    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    events_map = tenant.get("events", {})
    events = events_map.get(contract_id)
    if not isinstance(events, list):
        events = []
    events.insert(0, _event_entry(event_type, message, actor_sub))
    events_map[contract_id] = events[:100]
    tenant["events"] = events_map
    await write_json_state(CONTRACTS_STATE_FILE, state)


def _matches_filters(item: dict[str, Any], filters: dict[str, Any]) -> bool:
    status = str(filters.get("status") or "").strip().lower() or None
    supplier = str(filters.get("supplier") or "").strip().lower() or None
    service_type = str(filters.get("serviceType") or "").strip().lower() or None
    index_name = str(filters.get("index") or "").strip().upper() or None
    risk = str(filters.get("risk") or "").strip().lower() or None
    search = str(filters.get("search") or "").strip().lower() or None
    expiring_only = filters.get("expiringOnly") is True

    if status and str(item.get("status") or "").lower() != status:
        return False
    if supplier and supplier not in str(item.get("supplier") or "").lower():
        return False
    if service_type and service_type not in str(item.get("serviceType") or "").lower():
        return False
    if index_name and str(item.get("index") or "").upper() != index_name:
        return False
    if risk and str(item.get("risk") or "").lower() != risk:
        return False
    if expiring_only and not (item.get("daysToEnd") is not None and 0 <= int(item["daysToEnd"]) <= 90):
        return False
    if search:
        search_fields = [
            str(item.get("contractNumber") or ""),
            str(item.get("name") or ""),
            str(item.get("supplier") or ""),
            str(item.get("category") or ""),
            str(item.get("description") or ""),
            str(item.get("serviceType") or ""),
        ]
        if all(search not in field.lower() for field in search_fields):
            return False
    return True


def _sort_items(items: list[dict[str, Any]], sort_by: str, sort_order: str) -> list[dict[str, Any]]:
    key_map: dict[str, Any] = {
        "contract": lambda x: str(x.get("contractNumber") or ""),
        "supplier": lambda x: str(x.get("supplier") or ""),
        "category": lambda x: str(x.get("category") or ""),
        "monthlyValue": lambda x: float(x.get("monthlyValue") or 0),
        "startDate": lambda x: str(x.get("startDate") or ""),
        "endDate": lambda x: str(x.get("endDate") or ""),
        "index": lambda x: str(x.get("index") or ""),
        "nextAdjustment": lambda x: str(x.get("nextAdjustmentDate") or ""),
        "status": lambda x: str(x.get("status") or ""),
        "risk": lambda x: str(x.get("risk") or ""),
    }
    safe_sort = sort_by if sort_by in key_map else "monthlyValue"
    reverse = str(sort_order or "desc").lower() == "desc"
    return sorted(items, key=key_map[safe_sort], reverse=reverse)


def _paginate(items: list[dict[str, Any]], page: int, page_size: int) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    safe_page = max(1, int(page or 1))
    safe_size = min(200, max(1, int(page_size or 20)))
    total = len(items)
    total_pages = max(1, (total + safe_size - 1) // safe_size)
    current_page = min(safe_page, total_pages)
    start = (current_page - 1) * safe_size
    end = start + safe_size
    chunk = items[start:end]
    meta = {
        "page": current_page,
        "pageSize": safe_size,
        "total": total,
        "totalPages": total_pages,
        "hasNext": current_page < total_pages,
        "hasPrevious": current_page > 1,
    }
    return chunk, meta


async def get_contracts_dashboard_data(condominium_id: int) -> dict[str, Any]:
    items = await _get_contract_catalog(condominium_id)
    total = len(items)
    active = len([item for item in items if item.get("status") == "active"])
    expiring = len([item for item in items if item.get("status") == "expiring"])
    expired = len([item for item in items if item.get("status") == "expired"])
    upcoming_adjustments = len([item for item in items if item.get("adjustmentDueInDays") is not None and 0 <= int(item["adjustmentDueInDays"]) <= 90])
    high_risk = len([item for item in items if item.get("risk") == "high"])

    total_monthly_spend = sum(float(item.get("monthlyValue") or 0) for item in items)
    estimated_impact = sum(float(item.get("estimatedAdjustmentImpact") or 0) for item in items if item.get("status") != "closed")

    return {
        "metrics": {
            "totalContracts": total,
            "activeContracts": active,
            "expiringSoonContracts": expiring,
            "expiredContracts": expired,
            "upcomingAdjustments": upcoming_adjustments,
            "highRiskContracts": high_risk,
            "totalMonthlySpend": _currency(total_monthly_spend),
            "estimatedFinancialImpact": _currency(estimated_impact),
        },
        "highlights": {
            "topRiskContracts": [
                {
                    "id": item["id"],
                    "contractNumber": item["contractNumber"],
                    "supplier": item["supplier"],
                    "risk": item["risk"],
                    "status": item["status"],
                }
                for item in sorted(items, key=lambda x: (x.get("risk") == "high", x.get("monthlyValue", 0)), reverse=True)[:5]
            ],
            "topSpendContracts": [
                {
                    "id": item["id"],
                    "contractNumber": item["contractNumber"],
                    "supplier": item["supplier"],
                    "monthlyValue": item["monthlyValueLabel"],
                }
                for item in sorted(items, key=lambda x: float(x.get("monthlyValue") or 0), reverse=True)[:5]
            ],
        },
    }


async def get_contracts_list_data(condominium_id: int, query: dict[str, Any]) -> dict[str, Any]:
    contracts = await _get_contract_catalog(condominium_id)
    filtered = [item for item in contracts if _matches_filters(item, query)]
    sorted_items = _sort_items(filtered, str(query.get("sortBy") or "monthlyValue"), str(query.get("sortOrder") or "desc"))
    page_data, meta = _paginate(sorted_items, int(query.get("page") or 1), int(query.get("pageSize") or 20))

    suppliers = sorted({str(item.get("supplier") or "") for item in contracts if item.get("supplier")})
    service_types = sorted({str(item.get("serviceType") or "") for item in contracts if item.get("serviceType")})
    indices = sorted({str(item.get("index") or "") for item in contracts if item.get("index")})

    return {
        "items": page_data,
        "meta": meta,
        "filters": {
            "status": query.get("status"),
            "supplier": query.get("supplier"),
            "serviceType": query.get("serviceType"),
            "index": query.get("index"),
            "risk": query.get("risk"),
            "search": query.get("search"),
            "expiringOnly": bool(query.get("expiringOnly")),
        },
        "sort": {"sortBy": str(query.get("sortBy") or "monthlyValue"), "sortOrder": str(query.get("sortOrder") or "desc")},
        "facets": {"suppliers": suppliers, "serviceTypes": service_types, "indices": indices},
    }


async def get_contract_detail_data(condominium_id: int, contract_id: str) -> dict[str, Any] | None:
    contracts = await _get_contract_catalog(condominium_id)
    item = next((contract for contract in contracts if str(contract.get("id")) == str(contract_id)), None)
    if not item:
        return None

    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    documents = tenant.get("documents", {}).get(str(contract_id), [])
    events = tenant.get("events", {}).get(str(contract_id), [])

    alerts = []
    days_to_end = item.get("daysToEnd")
    adjustment_due = item.get("adjustmentDueInDays")
    if days_to_end is not None and days_to_end < 0:
        alerts.append({"level": "critical", "message": "Contrato vencido e requer decisao imediata."})
    elif days_to_end is not None and days_to_end <= 30:
        alerts.append({"level": "warning", "message": "Contrato com vencimento em ate 30 dias."})
    elif days_to_end is not None and days_to_end <= 90:
        alerts.append({"level": "info", "message": "Contrato em janela de renovacao (90 dias)."})

    if adjustment_due is not None and adjustment_due <= 30:
        alerts.append({"level": "warning", "message": "Reajuste previsto para os proximos 30 dias."})

    if item.get("risk") == "high":
        alerts.append({"level": "critical", "message": "Contrato classificado como risco alto."})

    return {
        "item": item,
        "supplier": {
            "name": item.get("supplier"),
            "category": item.get("category"),
            "serviceType": item.get("serviceType"),
            "internalOwner": item.get("internalOwner"),
        },
        "documents": documents if isinstance(documents, list) else [],
        "timeline": events if isinstance(events, list) else [],
        "alerts": alerts,
    }


def _normalize_contract_payload(payload: dict[str, Any], fallback_id: str | None = None) -> dict[str, Any]:
    contract_id = str(payload.get("id") or fallback_id or f"local-{uuid4().hex[:8]}")
    start_date = _to_iso_date(payload.get("startDate"))
    end_date = _to_iso_date(payload.get("endDate"))
    frequency = int(payload.get("adjustmentFrequencyMonths") or 12)
    normalized = {
        "id": contract_id,
        "contractNumber": str(payload.get("contractNumber") or f"CTR-{contract_id.zfill(4)}"),
        "name": str(payload.get("name") or "Contrato sem nome").strip(),
        "supplier": str(payload.get("supplier") or "Fornecedor nao informado").strip(),
        "supplierId": payload.get("supplierId"),
        "category": str(payload.get("category") or _category_from_service(str(payload.get("serviceType") or ""))).strip(),
        "description": str(payload.get("description") or "").strip(),
        "serviceType": str(payload.get("serviceType") or "Servico geral").strip(),
        "monthlyValue": _parse_currency(payload.get("monthlyValue")),
        "startDate": start_date,
        "endDate": end_date,
        "termMonths": int(payload.get("termMonths") or _compute_term_months(start_date, end_date)),
        "index": _safe_index(payload.get("index")),
        "adjustmentFrequencyMonths": max(1, frequency),
        "nextAdjustmentDate": _to_iso_date(payload.get("nextAdjustmentDate")) or _compute_next_adjustment(start_date, frequency, end_date),
        "internalOwner": str(payload.get("internalOwner") or "Gestao condominial"),
        "status": str(payload.get("status") or _status_from_dates(end_date)).strip().lower(),
        "renewalStatus": str(payload.get("renewalStatus") or "not_started").strip().lower(),
        "risk": str(payload.get("risk") or "low").strip().lower(),
        "notes": str(payload.get("notes") or "").strip(),
        "createdAt": str(payload.get("createdAt") or _now_iso()),
        "updatedAt": _now_iso(),
    }
    return _enrich_contract(normalized)


async def create_contract_data(condominium_id: int, payload: dict[str, Any], actor_sub: str | None = None) -> dict[str, Any]:
    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    next_sequence = int(tenant.get("nextSequence") or 1)
    contract_id = str(payload.get("id") or f"local-{next_sequence:04d}")
    tenant["nextSequence"] = next_sequence + 1

    normalized = _normalize_contract_payload(payload, contract_id)
    tenant["contracts"][contract_id] = normalized
    state[str(condominium_id)] = tenant
    await write_json_state(CONTRACTS_STATE_FILE, state)

    await _append_event(condominium_id, contract_id, "created", "Contrato cadastrado no modulo de gestao.", actor_sub)
    return normalized


async def update_contract_data(condominium_id: int, contract_id: str, payload: dict[str, Any], actor_sub: str | None = None) -> dict[str, Any] | None:
    current = await get_contract_detail_data(condominium_id, contract_id)
    if not current:
        return None

    merged = dict(current["item"])
    merged.update(payload)
    merged["id"] = str(contract_id)
    normalized = _normalize_contract_payload(merged, str(contract_id))

    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    tenant["contracts"][str(contract_id)] = normalized
    state[str(condominium_id)] = tenant
    await write_json_state(CONTRACTS_STATE_FILE, state)

    await _append_event(condominium_id, str(contract_id), "updated", "Contrato atualizado no modulo de gestao.", actor_sub)
    return normalized


async def renew_contract_data(condominium_id: int, contract_id: str, actor_sub: str | None = None) -> dict[str, Any] | None:
    details = await get_contract_detail_data(condominium_id, contract_id)
    if not details:
        return None
    item = details["item"]
    end_date = _parse_iso_date(item.get("endDate")) or date.today()
    renewed_end = _add_months(end_date, 12)

    updated = await update_contract_data(
        condominium_id,
        contract_id,
        {
            "status": "active",
            "renewalStatus": "renewed",
            "endDate": renewed_end.isoformat(),
            "notes": f"{item.get('notes', '')} Renovado em {_to_iso_date(date.today())}.".strip(),
        },
        actor_sub,
    )
    if updated:
        await _append_event(condominium_id, str(contract_id), "renewed", "Contrato renovado por mais 12 meses.", actor_sub)
    return updated


async def close_contract_data(condominium_id: int, contract_id: str, actor_sub: str | None = None) -> dict[str, Any] | None:
    updated = await update_contract_data(condominium_id, contract_id, {"status": "closed", "renewalStatus": "closed"}, actor_sub)
    if updated:
        await _append_event(condominium_id, str(contract_id), "closed", "Contrato encerrado no modulo.", actor_sub)
    return updated


async def get_contracts_expiring_data(condominium_id: int) -> dict[str, Any]:
    items = await _get_contract_catalog(condominium_id)
    expired = [item for item in items if item.get("daysToEnd") is not None and int(item["daysToEnd"]) < 0 and item.get("status") != "closed"]
    in_30 = [item for item in items if item.get("daysToEnd") is not None and 0 <= int(item["daysToEnd"]) <= 30]
    in_60 = [item for item in items if item.get("daysToEnd") is not None and 31 <= int(item["daysToEnd"]) <= 60]
    in_90 = [item for item in items if item.get("daysToEnd") is not None and 61 <= int(item["daysToEnd"]) <= 90]

    return {
        "summary": {"expired": len(expired), "in30Days": len(in_30), "in60Days": len(in_60), "in90Days": len(in_90)},
        "groups": {"expired": expired, "in30Days": in_30, "in60Days": in_60, "in90Days": in_90},
    }


async def get_contracts_adjustments_data(condominium_id: int) -> dict[str, Any]:
    items = await _get_contract_catalog(condominium_id)
    filtered = [
        item
        for item in items
        if item.get("status") in {"active", "expiring", "renewal_pending"}
        and item.get("adjustmentDueInDays") is not None
        and int(item["adjustmentDueInDays"]) <= 120
    ]

    total_impact = sum(float(item.get("estimatedAdjustmentImpact") or 0) for item in filtered)
    return {
        "summary": {"upcomingAdjustments": len(filtered), "estimatedImpact": _currency(total_impact)},
        "items": filtered,
    }


async def list_contract_documents_data(condominium_id: int, contract_id: str | None = None) -> dict[str, Any]:
    contracts = await _get_contract_catalog(condominium_id)
    contract_map = {str(item["id"]): item for item in contracts}

    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    docs_map = tenant.get("documents", {})
    documents: list[dict[str, Any]] = []

    for current_contract_id, docs in docs_map.items():
        if contract_id and str(current_contract_id) != str(contract_id):
            continue
        if not isinstance(docs, list):
            continue
        contract_name = contract_map.get(str(current_contract_id), {}).get("name", f"Contrato {current_contract_id}")
        for doc in docs:
            if isinstance(doc, dict):
                documents.append({**doc, "contractId": str(current_contract_id), "contractName": contract_name})

    documents = sorted(documents, key=lambda doc: str(doc.get("uploadedAt") or ""), reverse=True)
    return {"items": documents}


async def attach_contract_document_data(condominium_id: int, contract_id: str, payload: dict[str, Any], actor_sub: str | None = None) -> dict[str, Any] | None:
    details = await get_contract_detail_data(condominium_id, contract_id)
    if not details:
        return None

    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    docs_map = tenant.get("documents", {})
    docs = docs_map.get(str(contract_id))
    if not isinstance(docs, list):
        docs = []

    status = str(payload.get("status") or "active").strip().lower()
    if status not in DOC_STATUSES:
        status = "active"
    document = {
        "id": f"doc-{uuid4().hex[:10]}",
        "name": str(payload.get("name") or "Documento"),
        "type": str(payload.get("type") or "geral"),
        "sizeKb": float(payload.get("sizeKb") or 0),
        "uploadedAt": _now_iso(),
        "status": status,
        "url": str(payload.get("url") or ""),
        "uploadedBy": actor_sub or "system",
    }
    docs.insert(0, document)
    docs_map[str(contract_id)] = docs
    tenant["documents"] = docs_map
    state[str(condominium_id)] = tenant
    await write_json_state(CONTRACTS_STATE_FILE, state)

    await _append_event(condominium_id, str(contract_id), "document_attached", f"Documento anexado: {document['name']}.", actor_sub)
    return document


async def remove_contract_document_data(condominium_id: int, document_id: str, actor_sub: str | None = None) -> bool:
    state = await read_json_state(CONTRACTS_STATE_FILE)
    tenant = _safe_tenant_state(state, condominium_id)
    docs_map = tenant.get("documents", {})
    changed = False

    for contract_id, docs in docs_map.items():
        if not isinstance(docs, list):
            continue
        remaining = [doc for doc in docs if str(doc.get("id")) != str(document_id)]
        if len(remaining) != len(docs):
            docs_map[contract_id] = remaining
            changed = True
            await _append_event(condominium_id, str(contract_id), "document_removed", f"Documento removido: {document_id}.", actor_sub)
            break

    if changed:
        tenant["documents"] = docs_map
        state[str(condominium_id)] = tenant
        await write_json_state(CONTRACTS_STATE_FILE, state)
    return changed


async def get_contracts_audit_data(condominium_id: int, query: dict[str, Any] | None = None) -> dict[str, Any]:
    contracts = await _get_contract_catalog(condominium_id)
    query = query or {}
    search = str(query.get("search") or "").strip().lower() or None
    risk_filter = str(query.get("risk") or "").strip().lower() or None
    index_filter = str(query.get("index") or "").strip().upper() or None

    filtered = []
    for item in contracts:
        if search and search not in str(item.get("supplier") or "").lower() and search not in str(item.get("name") or "").lower():
            continue
        if risk_filter and str(item.get("risk") or "").lower() != risk_filter:
            continue
        if index_filter and str(item.get("index") or "").upper() != index_filter:
            continue
        filtered.append(item)

    total_monthly = sum(float(item.get("monthlyValue") or 0) for item in filtered)
    estimated_impact = sum(float(item.get("estimatedAdjustmentImpact") or 0) for item in filtered)

    supplier_map: dict[str, dict[str, Any]] = {}
    for item in filtered:
        supplier = str(item.get("supplier") or "Fornecedor nao identificado")
        current = supplier_map.setdefault(
            supplier,
            {"supplier": supplier, "contractsCount": 0, "monthlyValue": 0.0, "highRiskCount": 0},
        )
        current["contractsCount"] += 1
        current["monthlyValue"] += float(item.get("monthlyValue") or 0)
        if item.get("risk") == "high":
            current["highRiskCount"] += 1

    comparisons = [
        {
            "supplier": info["supplier"],
            "contractsCount": info["contractsCount"],
            "monthlyValue": _currency(info["monthlyValue"]),
            "riskLevel": "high" if info["highRiskCount"] > 0 else "medium" if info["contractsCount"] > 1 else "low",
        }
        for info in supplier_map.values()
    ]
    comparisons.sort(key=lambda item: _parse_currency(item["monthlyValue"]), reverse=True)

    top_impact = sorted(filtered, key=lambda item: float(item.get("estimatedAdjustmentImpact") or 0), reverse=True)[:5]

    return {
        "estimatedQuarterImpact": _currency(estimated_impact * 3),
        "totalMonthlySpend": _currency(total_monthly),
        "items": [
            {
                "id": item["id"],
                "vendor": item["supplier"],
                "monthlyValue": item["monthlyValueLabel"],
                "index": item["index"],
                "nextAdjustment": item["nextAdjustmentDate"],
                "risk": item["risk"],
                "note": item["notes"] or item["description"],
            }
            for item in filtered
        ],
        "comparisonsBySupplier": comparisons,
        "topImpactContracts": [
            {
                "id": item["id"],
                "contractNumber": item["contractNumber"],
                "supplier": item["supplier"],
                "estimatedAdjustmentImpact": item["estimatedAdjustmentImpactLabel"],
                "risk": item["risk"],
            }
            for item in top_impact
        ],
        "projectedIndexVariation": {
            "IPCA": "6.0%",
            "IGPM": "8.0%",
            "INPC": "5.5%",
            "FIXO": "4.0%",
        },
        "alerts": {
            "highRiskContracts": len([item for item in filtered if item.get("risk") == "high"]),
            "expiringIn30Days": len([item for item in filtered if item.get("daysToEnd") is not None and 0 <= int(item["daysToEnd"]) <= 30]),
        },
        "filters": {"search": search, "risk": risk_filter, "index": index_filter},
    }


def reset_contracts_management_state() -> None:
    try:
        CONTRACTS_STATE_FILE.unlink()
    except FileNotFoundError:
        return
