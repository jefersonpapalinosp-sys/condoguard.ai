from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import PlainTextResponse

from app.api.helpers import (
    build_observability_alerts,
    invoices_to_csv,
    paginate,
    parse_enum,
    parse_iso_datetime,
    parse_positive_int,
    parse_sort_by,
    parse_sort_order,
    sort_collection,
)
from app.core.config import settings
from app.core.errors import ApiRequestError, summarize_oracle_error
from app.core.security import AUTH_ROLES, create_access_token, require_auth, require_roles, require_tenant_scope
from app.db.oracle_client import get_oracle_pool
from app.observability.metrics_store import get_observability_metrics_snapshot
from app.repositories.alerts_repo import get_alerts_data, mark_alert_as_read
from app.repositories.auth_repo import find_account_for_login
from app.repositories.cadastros_repo import create_cadastro, list_cadastros, update_cadastro, update_cadastro_status
from app.repositories.chat_intents_repo import get_chat_intent_catalog
from app.repositories.chat_repo import ask_chat, get_chat_bootstrap
from app.repositories.chat_telemetry_repo import (
    get_chat_telemetry_snapshot,
    record_chat_error_telemetry,
    record_chat_feedback_telemetry,
    record_chat_message_telemetry,
)
from app.repositories.invoices_repo import create_invoice, get_invoices_data, mark_invoice_as_paid, update_invoice
from app.repositories.management_repo import get_management_units_data, update_unit_status
from app.repositories.dashboard_repo import get_dashboard_data
from app.repositories.consumption_repo import get_consumption_data
from app.repositories.contracts_repo import get_contracts_data
from app.repositories.reports_repo import get_reports_data, reports_to_csv
from app.repositories.settings_repo import get_settings_data, update_thresholds
from app.schemas.requests import CadastroCreateBody, CadastroStatusBody, CadastroUpdateBody, ChatFeedbackBody, ChatMessageBody, InvoiceCreateBody, InvoiceUpdateBody, LoginBody, ThresholdUpdateBody, UnitStatusBody
from app.services.chat_context_service import build_chat_context
from app.services.observability_alerts import dispatch_observability_alerts
from app.audit.security_audit import query_security_audit_events
from app.utils.logging import log_security_event

router = APIRouter(prefix="/api")

INVOICE_STATUSES = ["pending", "paid", "overdue"]
ALERT_SEVERITIES = ["critical", "warning", "info"]
ALERT_STATUSES = ["active", "read"]
MANAGEMENT_STATUSES = ["occupied", "vacant", "maintenance"]
MANAGEMENT_BLOCKS = ["a", "b", "c"]
CADASTRO_TYPES = ["unidade", "morador", "fornecedor", "servico"]
CADASTRO_STATUSES = ["active", "pending", "inactive"]


def _filter_sort_invoices(items: list[dict[str, Any]], query: dict[str, Any]) -> dict[str, Any]:
    status = parse_enum(query.get("status"), INVOICE_STATUSES, "status")
    unit = str(query.get("unit") or "").strip().lower() or None
    search = str(query.get("search") or "").strip().lower() or None
    sort_by = parse_sort_by(query.get("sortBy"), ["dueDate", "amount", "unit", "resident", "reference", "status"])
    sort_order = parse_sort_order(query.get("sortOrder"))

    filtered = []
    for item in items:
        status_ok = item.get("status") == status if status else True
        unit_ok = unit in str(item.get("unit") or "").lower() if unit else True
        search_ok = (
            search in str(item.get("unit") or "").lower()
            or search in str(item.get("resident") or "").lower()
            or search in str(item.get("reference") or "").lower()
        ) if search else True
        if status_ok and unit_ok and search_ok:
            filtered.append(item)

    sorted_items = sort_collection(
        filtered,
        sort_by,
        sort_order,
        {
            "dueDate": lambda x: x.get("dueDate"),
            "amount": lambda x: x.get("amount"),
            "unit": lambda x: x.get("unit"),
            "resident": lambda x: x.get("resident"),
            "reference": lambda x: x.get("reference"),
            "status": lambda x: x.get("status"),
        },
    )

    return {
        "items": sorted_items,
        "filters": {"status": status, "unit": unit, "search": search},
        "sort": {"sortBy": sort_by, "sortOrder": sort_order},
    }


def _build_management_indicators(units: list[dict[str, Any]], invoices: list[dict[str, Any]], cadastros: list[dict[str, Any]]) -> dict[str, Any]:
    total_units = len(units)
    occupied = [u for u in units if u.get("status") == "occupied"]
    occupied_count = len(occupied)
    occupancy_rate = round((occupied_count / total_units) * 100) if total_units else 0

    occupied_keys = {f"{str(u.get('block') or '').upper()}-{u.get('unit')}" for u in occupied}
    overdue_keys = {str(i.get("unit") or "").upper() for i in invoices if i.get("status") == "overdue"}
    delinquency_units = len([k for k in occupied_keys if k in overdue_keys])
    delinquency_rate = round((delinquency_units / occupied_count) * 100) if occupied_count else 0

    maintenance_count = len([u for u in units if u.get("status") == "maintenance"])
    cadastros_pending = len([c for c in cadastros if c.get("status") == "pending"])

    return {
        "occupancy": {"totalUnits": total_units, "occupiedCount": occupied_count, "occupancyRate": occupancy_rate},
        "delinquency": {"delinquencyUnits": delinquency_units, "occupiedUnits": occupied_count, "delinquencyRate": delinquency_rate},
        "pending": {"maintenanceCount": maintenance_count, "cadastrosPending": cadastros_pending, "pendingCount": maintenance_count + cadastros_pending},
    }


@router.get("/health")
async def health() -> dict[str, Any]:
    db_status = "seed"
    pool_status = "not_applicable"
    latency_ms = None
    error_summary = None

    if settings.db_dialect == "oracle":
        started = datetime.now(timezone.utc)
        try:
            pool = await get_oracle_pool()
            db_status = "oracle_pool_ok" if pool else "oracle_disabled"
            pool_status = "active" if pool else "disabled"
        except Exception as exc:
            db_status = "oracle_error_fallback_seed" if settings.allow_oracle_seed_fallback else "oracle_error_no_fallback"
            pool_status = "error"
            error_summary = summarize_oracle_error(exc)
        finally:
            latency_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)

    return {
        "ok": True,
        "service": "condoguard-api",
        "env": settings.effective_env,
        "dialect": settings.db_dialect,
        "authProvider": settings.auth_provider,
        "authPasswordLoginEnabled": bool(settings.auth_password_login_enabled),
        "oidcConfigured": bool(settings.oidc_configured),
        "oidcReadiness": {
            "ready": settings.oidc_ready,
            "missingConfig": settings.oidc_missing_fields,
            "issues": settings.oidc_readiness_issues,
        },
        "dbStatus": db_status,
        "poolStatus": pool_status,
        "latencyMs": latency_ms,
        "errorSummary": error_summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/dashboard")
async def dashboard(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_dashboard_data(auth["condominiumId"])


@router.get("/consumption")
async def consumption(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_consumption_data(auth["condominiumId"])


@router.get("/contracts")
async def contracts(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_contracts_data(auth["condominiumId"])


@router.get("/reports/export.csv")
async def export_reports_csv(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    type: str | None = Query(default=None),
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
):
    report_type = parse_enum(type, ["financeiro", "operacional", "contratos"], "type") or "financeiro"
    report = await get_reports_data(auth["condominiumId"], report_type, from_date, to_date)
    csv_data = reports_to_csv(report)
    filename = f"relatorio-{report_type}-{int(datetime.now().timestamp())}.csv"
    return PlainTextResponse(csv_data, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/reports")
async def reports(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    type: str | None = Query(default=None),
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
):
    report_type = parse_enum(type, ["financeiro", "operacional", "contratos"], "type") or "financeiro"
    return await get_reports_data(auth["condominiumId"], report_type, from_date, to_date)


@router.get("/settings")
async def settings_snapshot(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return get_settings_data(auth["condominiumId"])


@router.patch("/settings/thresholds")
async def patch_settings_thresholds(
    body: ThresholdUpdateBody,
    request: Request,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin"])),
):
    if not any([body.latencyP95WarnMs, body.errorRateWarnPct, body.fallbackWarnCount]):
        raise ApiRequestError(400, "INVALID_BODY", "Ao menos um threshold deve ser informado.")
    updated = update_thresholds(auth["condominiumId"], body.model_dump(exclude_none=True))
    log_security_event("settings_thresholds_updated", request, {"thresholds": updated})
    return {"thresholds": updated}


@router.post("/auth/login")
async def login(body: LoginBody, request: Request) -> dict[str, Any]:
    if not settings.auth_password_login_enabled:
        raise ApiRequestError(501, "AUTH_EXTERNAL_PROVIDER_REQUIRED", "Login por senha desabilitado. Use o provedor corporativo de identidade.", {"authProvider": settings.auth_provider})

    account = await find_account_for_login(body.email, body.password)
    if not account or not account.get("passwordMatches") or account.get("role") not in AUTH_ROLES:
        log_security_event("auth_login_failed", request, {"email": body.email.lower()})
        raise ApiRequestError(401, "INVALID_CREDENTIALS", "Credenciais invalidas.")

    token, expires_at = create_access_token({"sub": account["email"], "role": account["role"], "condominium_id": account["condominiumId"]})
    log_security_event("auth_login_success", request, {"email": account["email"], "role": account["role"]})
    return {"token": token, "role": account["role"], "condominiumId": account["condominiumId"], "expiresAt": expires_at}


@router.get("/invoices")
async def list_invoices(
    request: Request,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
    page: int = Query(default=1),
    pageSize: int = Query(default=20),
    status: str | None = Query(default=None),
    unit: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sortBy: str | None = Query(default=None),
    sortOrder: str | None = Query(default=None),
):
    payload = await get_invoices_data(auth["condominiumId"])
    listing = _filter_sort_invoices(payload["items"], {"status": status, "unit": unit, "search": search, "sortBy": sortBy, "sortOrder": sortOrder})
    p = parse_positive_int(page, 1, "page")
    ps = parse_positive_int(pageSize, 20, "pageSize")
    data, meta = paginate(listing["items"], p, ps)
    return {"items": data, "meta": meta, "filters": listing["filters"], "sort": listing["sort"]}


@router.get("/invoices/export.csv")
async def export_invoices_csv(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
    status: str | None = Query(default=None),
    unit: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sortBy: str | None = Query(default=None),
    sortOrder: str | None = Query(default=None),
):
    payload = await get_invoices_data(auth["condominiumId"])
    listing = _filter_sort_invoices(payload["items"], {"status": status, "unit": unit, "search": search, "sortBy": sortBy, "sortOrder": sortOrder})
    csv = invoices_to_csv(listing["items"])
    return PlainTextResponse(csv, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="invoices-export-{int(datetime.now().timestamp())}.csv"'})


@router.post("/invoices", status_code=201)
async def post_invoice(
    body: InvoiceCreateBody,
    request: Request,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    created = await create_invoice(auth["condominiumId"], body.model_dump())
    log_security_event("invoice_create", request, {"unit": body.unit})
    return {"item": created}


@router.patch("/invoices/{invoice_id}")
async def patch_invoice(
    invoice_id: str,
    body: InvoiceUpdateBody,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    if not any([body.unit, body.resident, body.reference, body.dueDate, body.amount]):
        raise ApiRequestError(400, "INVALID_BODY", "Ao menos um campo deve ser informado para atualizacao.")
    updated = await update_invoice(auth["condominiumId"], invoice_id, body.model_dump(exclude_none=True))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Fatura nao encontrada.")
    return {"item": updated}


@router.patch("/invoices/{invoice_id}/pay")
async def pay_invoice(invoice_id: str, request: Request, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin", "sindico"]))):
    invoice_id = (invoice_id or "").strip()
    if not invoice_id:
        raise ApiRequestError(400, "INVALID_BODY", "Parametro id e obrigatorio.", {"field": "id"})

    updated = await mark_invoice_as_paid(auth["condominiumId"], invoice_id, auth.get("sub"))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Fatura nao encontrada.")

    log_security_event("invoice_mark_paid", request, {"invoiceId": invoice_id})
    return {"item": updated}


@router.get("/management/units")
async def management_units(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
    page: int = Query(default=1),
    pageSize: int = Query(default=20),
    status: str | None = Query(default=None),
    block: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sortBy: str | None = Query(default=None),
    sortOrder: str | None = Query(default=None),
):
    payload = await get_management_units_data(auth["condominiumId"])
    invoices_payload = await get_invoices_data(auth["condominiumId"])
    try:
        cadastros_payload = await list_cadastros(auth["condominiumId"])
    except ApiRequestError as exc:
        # Cadastros is informational for this endpoint. If Oracle is unavailable with fallback disabled,
        # keep management available and proceed without cadastros pending count.
        if exc.code == "ORACLE_UNAVAILABLE":
            cadastros_payload = {"items": []}
        else:
            raise

    status_f = parse_enum(status, MANAGEMENT_STATUSES, "status")
    block_f = parse_enum(block.lower() if block else None, MANAGEMENT_BLOCKS, "block")
    search_f = (search or "").strip().lower() or None
    p = parse_positive_int(page, 1, "page")
    ps = parse_positive_int(pageSize, 20, "pageSize")
    sb = parse_sort_by(sortBy, ["block", "unit", "resident", "status", "lastUpdate"])
    so = parse_sort_order(sortOrder)

    filtered = []
    for item in payload["units"]:
        ok_status = item.get("status") == status_f if status_f else True
        ok_block = str(item.get("block") or "").lower() == block_f if block_f else True
        ok_search = (
            search_f in str(item.get("block") or "").lower()
            or search_f in str(item.get("unit") or "").lower()
            or search_f in str(item.get("resident") or "").lower()
        ) if search_f else True
        if ok_status and ok_block and ok_search:
            filtered.append(item)

    sorted_items = sort_collection(filtered, sb, so, {"block": lambda x: x.get("block"), "unit": lambda x: x.get("unit"), "resident": lambda x: x.get("resident"), "status": lambda x: x.get("status"), "lastUpdate": lambda x: x.get("lastUpdate")})
    data, meta = paginate(sorted_items, p, ps)
    indicators = _build_management_indicators(payload["units"], invoices_payload["items"], cadastros_payload["items"])

    return {
        "items": data,
        "units": data,
        "indicators": indicators,
        "meta": meta,
        "filters": {"status": status_f, "block": block_f.upper() if block_f else None, "search": search_f},
        "sort": {"sortBy": sb, "sortOrder": so},
    }


@router.patch("/management/units/{unit_id}/status")
async def patch_unit_status(
    unit_id: str,
    body: UnitStatusBody,
    request: Request,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin", "sindico"])),
):
    unit_id = (unit_id or "").strip()
    if not unit_id:
        raise ApiRequestError(400, "INVALID_BODY", "Parametro unit_id e obrigatorio.", {"field": "unit_id"})

    updated = await update_unit_status(auth["condominiumId"], unit_id, body.status)
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Unidade nao encontrada.")

    log_security_event("unit_status_update", request, {"unitId": unit_id, "status": body.status})
    return {"item": updated}


@router.get("/cadastros")
async def get_cadastros(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    page: int = Query(default=1),
    pageSize: int = Query(default=20),
    tipo: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
):
    payload = await list_cadastros(auth["condominiumId"])
    tipo_f = parse_enum(tipo, CADASTRO_TYPES, "tipo")
    status_f = parse_enum(status, CADASTRO_STATUSES, "status")
    search_f = (search or "").strip().lower() or None
    p = parse_positive_int(page, 1, "page")
    ps = parse_positive_int(pageSize, 20, "pageSize")

    filtered = []
    for item in payload["items"]:
        ok_tipo = item.get("tipo") == tipo_f if tipo_f else True
        ok_status = item.get("status") == status_f if status_f else True
        ok_search = (search_f in item.get("titulo", "").lower() or search_f in item.get("descricao", "").lower()) if search_f else True
        if ok_tipo and ok_status and ok_search:
            filtered.append(item)

    data, meta = paginate(filtered, p, ps)
    return {"items": data, "meta": meta, "filters": {"tipo": tipo_f, "status": status_f, "search": search_f}}


@router.post("/cadastros", status_code=201)
async def post_cadastros(body: CadastroCreateBody, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin", "sindico"]))):
    created = await create_cadastro(auth["condominiumId"], body.model_dump())
    return {"item": created}


@router.patch("/cadastros/{cadastro_id}/status")
async def patch_cadastro_status(cadastro_id: str, body: CadastroStatusBody, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin", "sindico"]))):
    updated = await update_cadastro_status(auth["condominiumId"], cadastro_id, body.status)
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Cadastro nao encontrado.")
    return {"item": updated}


@router.patch("/cadastros/{cadastro_id}")
async def patch_cadastro(cadastro_id: str, body: CadastroUpdateBody, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin", "sindico"]))):
    if not any([body.tipo, body.titulo, body.descricao, body.status]):
        raise ApiRequestError(400, "INVALID_BODY", "Ao menos um campo deve ser informado para atualizacao.")
    updated = await update_cadastro(auth["condominiumId"], cadastro_id, body.model_dump(exclude_none=True))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Cadastro nao encontrado.")
    return {"item": updated}


@router.get("/chat/bootstrap")
async def chat_bootstrap(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await get_chat_bootstrap(auth["condominiumId"])


@router.get("/chat/intents")
async def chat_intents(_auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return get_chat_intent_catalog()


@router.get("/chat/context")
async def chat_context(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    return await build_chat_context(auth["condominiumId"])


@router.get("/chat/telemetry")
async def chat_telemetry(auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin", "sindico"])), limit: int = Query(default=20)):
    lim = min(parse_positive_int(limit, 20, "limit"), 100)
    return get_chat_telemetry_snapshot(auth["condominiumId"], lim)


@router.get("/observability/metrics")
async def observability_metrics(_auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin"])), routeLimit: int = Query(default=10), codeLimit: int = Query(default=10)):
    rl = min(parse_positive_int(routeLimit, 10, "routeLimit"), 100)
    cl = min(parse_positive_int(codeLimit, 10, "codeLimit"), 100)
    return get_observability_metrics_snapshot(rl, cl)


@router.get("/observability/alerts")
async def observability_alerts(_auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin"]))):
    metrics = get_observability_metrics_snapshot(20, 20)
    thresholds = {
        "latencyP95WarnMs": settings.obs_alert_p95_latency_ms,
        "errorRateWarnPct": settings.obs_alert_error_rate_pct,
        "fallbackWarnCount": settings.obs_alert_fallback_count,
    }
    items = build_observability_alerts(metrics, thresholds)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "channel": settings.obs_alert_channel,
        "channelConfigured": settings.obs_alert_channel != "webhook" or bool(settings.obs_alert_webhook_url.strip()),
        "thresholds": thresholds,
        "hasAlerts": len(items) > 0,
        "items": items,
    }


@router.post("/observability/alerts/dispatch")
async def observability_alerts_dispatch(_auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(["admin"]))):
    metrics = get_observability_metrics_snapshot(20, 20)
    thresholds = {
        "latencyP95WarnMs": settings.obs_alert_p95_latency_ms,
        "errorRateWarnPct": settings.obs_alert_error_rate_pct,
        "fallbackWarnCount": settings.obs_alert_fallback_count,
    }
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "channel": settings.obs_alert_channel,
        "thresholds": thresholds,
        "items": build_observability_alerts(metrics, thresholds),
    }
    payload["hasAlerts"] = len(payload["items"]) > 0
    dispatch = await dispatch_observability_alerts(payload)
    return {**payload, "dispatch": dispatch}


@router.get("/alerts")
async def list_alerts(
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(AUTH_ROLES)),
    page: int = Query(default=1),
    pageSize: int = Query(default=20),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sortBy: str | None = Query(default=None),
    sortOrder: str | None = Query(default=None),
):
    payload = await get_alerts_data(auth["condominiumId"])
    severity_f = parse_enum(severity, ALERT_SEVERITIES, "severity")
    status_f = parse_enum(status, ALERT_STATUSES, "status")
    search_f = (search or "").strip().lower() or None
    p = parse_positive_int(page, 1, "page")
    ps = parse_positive_int(pageSize, 20, "pageSize")
    sb = parse_sort_by(sortBy, ["severity", "title", "time", "status", "readAt"])
    so = parse_sort_order(sortOrder)

    filtered = []
    for item in payload["items"]:
        ok_sev = item.get("severity") == severity_f if severity_f else True
        ok_status = item.get("status") == status_f if status_f else True
        ok_search = (search_f in item.get("title", "").lower() or search_f in item.get("description", "").lower()) if search_f else True
        if ok_sev and ok_status and ok_search:
            filtered.append(item)

    sorted_items = sort_collection(filtered, sb, so, {"severity": lambda x: x.get("severity"), "title": lambda x: x.get("title"), "time": lambda x: x.get("time"), "status": lambda x: x.get("status"), "readAt": lambda x: x.get("readAt") or ""})
    data, meta = paginate(sorted_items, p, ps)
    return {"activeCount": payload["activeCount"], "items": data, "meta": meta, "filters": {"severity": severity_f, "status": status_f, "search": search_f}, "sort": {"sortBy": sb, "sortOrder": so}}


@router.patch("/alerts/{alert_id}/read")
async def read_alert(alert_id: str, request: Request, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    alert_id = (alert_id or "").strip()
    if not alert_id:
        raise ApiRequestError(400, "INVALID_BODY", "Parametro id e obrigatorio.", {"field": "id"})
    updated = await mark_alert_as_read(auth["condominiumId"], alert_id, auth.get("sub"))
    if not updated:
        raise ApiRequestError(404, "NOT_FOUND", "Alerta nao encontrado.")
    log_security_event("alert_mark_read", request, {"alertId": alert_id})
    return {"item": updated}


@router.post("/chat/message")
async def chat_message(body: ChatMessageBody, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    try:
        payload = await ask_chat(body.message.strip(), auth["condominiumId"], body.sessionId)
    except Exception as exc:
        record_chat_error_telemetry(auth["condominiumId"], getattr(exc, "code", "CHAT_ERROR"))
        raise
    record_chat_message_telemetry(auth["condominiumId"], payload)
    return payload


@router.post("/chat/feedback", status_code=201)
async def chat_feedback(body: ChatFeedbackBody, request: Request, auth: dict = Depends(require_tenant_scope), _role: dict = Depends(require_roles(AUTH_ROLES))):
    record_chat_feedback_telemetry(auth["condominiumId"], {"messageId": body.messageId, "rating": body.rating, "comment": body.comment})
    log_security_event("chat_feedback_submitted", request, {"messageId": body.messageId, "rating": body.rating})
    return {"ok": True}


@router.get("/security/audit")
async def security_audit(
    request: Request,
    auth: dict = Depends(require_tenant_scope),
    _role: dict = Depends(require_roles(["admin"])),
    event: str | None = Query(default=None),
    actorSub: str | None = Query(default=None),
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    limit: int = Query(default=100),
):
    # condominiumId always comes from the authenticated token — never from the query string
    # to prevent cross-tenant audit log access.
    scoped_condominium_id: int = auth["condominiumId"]
    from_iso = parse_iso_datetime(from_, "from") if from_ else None
    to_iso = parse_iso_datetime(to, "to") if to else None
    lim = min(parse_positive_int(limit, 100, "limit"), 500)

    if from_iso and to_iso and datetime.fromisoformat(from_iso) > datetime.fromisoformat(to_iso):
        raise ApiRequestError(400, "INVALID_QUERY_PARAM", "Intervalo de datas invalido: from deve ser menor ou igual a to.", {"fields": ["from", "to"]})

    items = query_security_audit_events({"event": event, "actorSub": actorSub, "condominiumId": scoped_condominium_id, "from": from_iso, "to": to_iso, "limit": lim})
    log_security_event("audit_log_viewed", request, {"filters": {"event": event, "actorSub": actorSub, "condominiumId": scoped_condominium_id, "from": from_iso, "to": to_iso}, "returned": len(items)})
    return {
        "items": items,
        "meta": {"returned": len(items), "limit": lim},
        "filters": {"event": event, "actorSub": actorSub, "condominiumId": scoped_condominium_id, "from": from_iso, "to": to_iso},
    }
