from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.core.tenancy import ensure_condominium_id
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_brl(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _filter_by_date(
    items: list[dict[str, Any]],
    from_date: str | None,
    to_date: str | None,
    field: str = "dueDate",
) -> list[dict[str, Any]]:
    if not from_date and not to_date:
        return items

    def _parse(val: str | None) -> date | None:
        if not val:
            return None
        try:
            return date.fromisoformat(str(val)[:10])
        except ValueError:
            return None

    lo = _parse(from_date)
    hi = _parse(to_date)
    result = []
    for item in items:
        d = _parse(item.get(field))
        if d is None:
            result.append(item)
            continue
        if lo and d < lo:
            continue
        if hi and d > hi:
            continue
        result.append(item)
    return result


def reports_to_csv(report: dict[str, Any]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)

    # Header block
    writer.writerow(["Tipo", report.get("type", "")])
    period = report.get("period", {})
    writer.writerow(["Periodo De", period.get("from", "")])
    writer.writerow(["Periodo Ate", period.get("to", "")])
    writer.writerow(["Gerado Em", report.get("generatedAt", "")])
    writer.writerow([])

    # Sections
    for section in report.get("sections", []):
        writer.writerow([section.get("title", "")])
        writer.writerow(["Indicador", "Valor"])
        for row in section.get("data", []):
            writer.writerow([row.get("label", ""), row.get("value", "")])
        writer.writerow([])

    return buf.getvalue()


# ---------------------------------------------------------------------------
# Mock builders
# ---------------------------------------------------------------------------

def _build_financeiro_mock(
    condominium_id: int,
    from_date: str | None,
    to_date: str | None,
) -> dict[str, Any]:
    seed = read_seed_json("invoices.json")
    all_items = [{**i, "condominiumId": 1} for i in seed.get("items", [])]
    items = [i for i in all_items if i.get("condominiumId") == condominium_id]
    items = _filter_by_date(items, from_date, to_date, "dueDate")

    total = len(items)
    paid = sum(1 for i in items if str(i.get("status", "")).lower() == "paid")
    pending = sum(1 for i in items if str(i.get("status", "")).lower() == "pending")
    overdue = sum(1 for i in items if str(i.get("status", "")).lower() == "overdue")
    total_amount = sum(float(i.get("amount") or 0) for i in items)
    paid_amount = sum(float(i.get("amount") or 0) for i in items if str(i.get("status", "")).lower() == "paid")
    open_amount = total_amount - paid_amount
    pct_inadimplencia = round((overdue / total * 100) if total else 0, 1)

    return {
        "executiveTitle": "Relatório Financeiro",
        "executiveSummary": (
            f"{total} faturas no período — {paid} pagas, {pending} pendentes, {overdue} vencidas. "
            f"Volume total: {_format_brl(total_amount)}. Inadimplência: {pct_inadimplencia}%."
        ),
        "sections": [
            {
                "title": "Faturamento",
                "data": [
                    {"label": "Total de faturas", "value": str(total)},
                    {"label": "Valor total", "value": _format_brl(total_amount)},
                    {"label": "Pagas", "value": str(paid)},
                    {"label": "Pendentes", "value": str(pending)},
                    {"label": "Vencidas", "value": str(overdue)},
                ],
            },
            {
                "title": "Inadimplência",
                "data": [
                    {"label": "Valor em aberto", "value": _format_brl(open_amount)},
                    {"label": "% de inadimplência", "value": f"{pct_inadimplencia}%"},
                ],
            },
        ],
        "items": items,
    }


def _build_operacional_mock(
    condominium_id: int,
    from_date: str | None,
    to_date: str | None,
) -> dict[str, Any]:
    alerts_seed = read_seed_json("alerts.json")
    alerts = alerts_seed.get("alerts", [])
    alerts = _filter_by_date(alerts, from_date, to_date, "timestamp")

    total_alerts = len(alerts)
    critical = sum(1 for a in alerts if str(a.get("severity") or a.get("gravidade") or "").lower() in ("critical", "alta", "critica"))
    warning = sum(1 for a in alerts if str(a.get("severity") or a.get("gravidade") or "").lower() in ("warning", "media", "médio"))
    info = sum(1 for a in alerts if str(a.get("severity") or a.get("gravidade") or "").lower() in ("info", "baixa", "low"))

    mgmt_seed = read_seed_json("management_units.json")
    units = mgmt_seed.get("units", [])
    maintenance = sum(1 for u in units if str(u.get("status", "")).lower() == "maintenance")
    occupied = sum(1 for u in units if str(u.get("status", "")).lower() == "occupied")
    vacant = sum(1 for u in units if str(u.get("status", "")).lower() == "vacant")

    return {
        "executiveTitle": "Relatório Operacional",
        "executiveSummary": (
            f"{total_alerts} alertas no período — {critical} críticos, {warning} avisos, {info} informativos. "
            f"Unidades: {maintenance} em manutenção, {occupied} ocupadas, {vacant} vagas."
        ),
        "sections": [
            {
                "title": "Alertas",
                "data": [
                    {"label": "Total de alertas", "value": str(total_alerts)},
                    {"label": "Críticos", "value": str(critical)},
                    {"label": "Avisos", "value": str(warning)},
                    {"label": "Informativos", "value": str(info)},
                ],
            },
            {
                "title": "Manutenção de Unidades",
                "data": [
                    {"label": "Em manutenção", "value": str(maintenance)},
                    {"label": "Ocupadas", "value": str(occupied)},
                    {"label": "Vagas", "value": str(vacant)},
                    {"label": "Total de unidades", "value": str(len(units))},
                ],
            },
        ],
        "items": alerts,
    }


def _build_contratos_mock(
    condominium_id: int,
    from_date: str | None,
    to_date: str | None,
) -> dict[str, Any]:
    seed = read_seed_json("contracts.json")
    items = seed.get("items", [])
    total_monthly_str: str = seed.get("totalMonthlySpend", "R$ 0,00")

    high = sum(1 for i in items if str(i.get("risk", "")).lower() == "high")
    medium = sum(1 for i in items if str(i.get("risk", "")).lower() == "medium")
    low = sum(1 for i in items if str(i.get("risk", "")).lower() == "low")

    # Parse totalMonthlySpend to float for quarterly estimate
    try:
        raw = total_monthly_str.replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
        monthly_value = float(raw)
    except (ValueError, AttributeError):
        monthly_value = 0.0
    quarterly = _format_brl(monthly_value * 3)

    return {
        "executiveTitle": "Relatório de Contratos",
        "executiveSummary": (
            f"{len(items)} contratos ativos — {high} de alto risco, {medium} médio, {low} baixo. "
            f"Gasto mensal: {total_monthly_str}. Estimativa trimestral: {quarterly}."
        ),
        "sections": [
            {
                "title": "Gastos Mensais",
                "data": [
                    {"label": "Total mensal", "value": total_monthly_str},
                    {"label": "Estimativa trimestral", "value": quarterly},
                    {"label": "Total de contratos", "value": str(len(items))},
                ],
            },
            {
                "title": "Risco",
                "data": [
                    {"label": "Alto risco", "value": str(high)},
                    {"label": "Médio risco", "value": str(medium)},
                    {"label": "Baixo risco", "value": str(low)},
                ],
            },
        ],
        "items": items,
    }


# ---------------------------------------------------------------------------
# Oracle builders
# ---------------------------------------------------------------------------

async def _build_financeiro_oracle(
    condominium_id: int,
    from_date: str | None,
    to_date: str | None,
) -> dict[str, Any]:
    date_filter = ""
    binds: dict[str, Any] = {"condominiumId": condominium_id}
    if from_date:
        date_filter += " and vencimento >= to_date(:fromDate, 'YYYY-MM-DD')"
        binds["fromDate"] = from_date
    if to_date:
        date_filter += " and vencimento <= to_date(:toDate, 'YYYY-MM-DD')"
        binds["toDate"] = to_date

    rows = await run_oracle_query(
        f"""
        select
          count(1) as TOTAL,
          sum(case when lower(status) = 'paid'    then 1 else 0 end) as PAID_TOTAL,
          sum(case when lower(status) = 'pending' then 1 else 0 end) as PENDING_TOTAL,
          sum(case when lower(status) = 'overdue' then 1 else 0 end) as OVERDUE_TOTAL,
          nvl(sum(amount), 0) as TOTAL_AMOUNT,
          nvl(sum(case when lower(status) = 'paid' then amount else 0 end), 0) as PAID_AMOUNT
        from mart.vw_financial_invoices
        where condominio_id = :condominiumId{date_filter}
        """,
        binds,
    )
    inv = (rows or [{}])[0]
    total = int(inv.get("TOTAL") or 0)
    paid = int(inv.get("PAID_TOTAL") or 0)
    pending = int(inv.get("PENDING_TOTAL") or 0)
    overdue = int(inv.get("OVERDUE_TOTAL") or 0)
    total_amount = float(inv.get("TOTAL_AMOUNT") or 0)
    paid_amount = float(inv.get("PAID_AMOUNT") or 0)
    open_amount = total_amount - paid_amount
    pct = round((overdue / total * 100) if total else 0, 1)

    return {
        "executiveTitle": "Relatório Financeiro",
        "executiveSummary": (
            f"{total} faturas no período — {paid} pagas, {pending} pendentes, {overdue} vencidas. "
            f"Volume total: {_format_brl(total_amount)}. Inadimplência: {pct}%."
        ),
        "sections": [
            {
                "title": "Faturamento",
                "data": [
                    {"label": "Total de faturas", "value": str(total)},
                    {"label": "Valor total", "value": _format_brl(total_amount)},
                    {"label": "Pagas", "value": str(paid)},
                    {"label": "Pendentes", "value": str(pending)},
                    {"label": "Vencidas", "value": str(overdue)},
                ],
            },
            {
                "title": "Inadimplência",
                "data": [
                    {"label": "Valor em aberto", "value": _format_brl(open_amount)},
                    {"label": "% de inadimplência", "value": f"{pct}%"},
                ],
            },
        ],
        "items": [],
    }


async def _build_operacional_oracle(
    condominium_id: int,
    from_date: str | None,
    to_date: str | None,
) -> dict[str, Any]:
    date_filter = ""
    binds: dict[str, Any] = {"condominiumId": condominium_id}
    if from_date:
        date_filter += " and criado_em >= to_date(:fromDate, 'YYYY-MM-DD')"
        binds["fromDate"] = from_date
    if to_date:
        date_filter += " and criado_em <= to_date(:toDate, 'YYYY-MM-DD')"
        binds["toDate"] = to_date

    alerts_rows = await run_oracle_query(
        f"""
        select
          count(1) as TOTAL,
          sum(case when lower(gravidade) in ('alta','critica','critical') then 1 else 0 end) as CRITICAL_TOTAL,
          sum(case when lower(gravidade) in ('media','médio','warning')   then 1 else 0 end) as WARNING_TOTAL,
          sum(case when lower(gravidade) in ('baixa','low','info')        then 1 else 0 end) as INFO_TOTAL
        from mart.vw_alerts_operational
        where condominio_id = :condominiumId{date_filter}
        """,
        binds,
    )
    mgmt_rows = await run_oracle_query(
        """
        select
          sum(case when lower(status) = 'maintenance' then 1 else 0 end) as MAINTENANCE_TOTAL,
          sum(case when lower(status) = 'occupied'    then 1 else 0 end) as OCCUPIED_TOTAL,
          sum(case when lower(status) = 'vacant'      then 1 else 0 end) as VACANT_TOTAL,
          count(1) as TOTAL
        from mart.vw_management_units
        where condominio_id = :condominiumId
        """,
        {"condominiumId": condominium_id},
    )

    a = (alerts_rows or [{}])[0]
    m = (mgmt_rows or [{}])[0]
    total_alerts = int(a.get("TOTAL") or 0)
    critical = int(a.get("CRITICAL_TOTAL") or 0)
    warning = int(a.get("WARNING_TOTAL") or 0)
    info = int(a.get("INFO_TOTAL") or 0)
    maintenance = int(m.get("MAINTENANCE_TOTAL") or 0)
    occupied = int(m.get("OCCUPIED_TOTAL") or 0)
    vacant = int(m.get("VACANT_TOTAL") or 0)
    total_units = int(m.get("TOTAL") or 0)

    return {
        "executiveTitle": "Relatório Operacional",
        "executiveSummary": (
            f"{total_alerts} alertas no período — {critical} críticos, {warning} avisos, {info} informativos. "
            f"Unidades: {maintenance} em manutenção, {occupied} ocupadas, {vacant} vagas."
        ),
        "sections": [
            {
                "title": "Alertas",
                "data": [
                    {"label": "Total de alertas", "value": str(total_alerts)},
                    {"label": "Críticos", "value": str(critical)},
                    {"label": "Avisos", "value": str(warning)},
                    {"label": "Informativos", "value": str(info)},
                ],
            },
            {
                "title": "Manutenção de Unidades",
                "data": [
                    {"label": "Em manutenção", "value": str(maintenance)},
                    {"label": "Ocupadas", "value": str(occupied)},
                    {"label": "Vagas", "value": str(vacant)},
                    {"label": "Total de unidades", "value": str(total_units)},
                ],
            },
        ],
        "items": [],
    }


async def _build_contratos_oracle(
    condominium_id: int,
    from_date: str | None,
    to_date: str | None,
) -> dict[str, Any]:
    rows = await run_oracle_query(
        """
        select
          count(1) as TOTAL,
          nvl(sum(valor_mensal), 0) as TOTAL_MENSAL,
          sum(case when lower(risco) = 'high'   then 1 else 0 end) as HIGH_TOTAL,
          sum(case when lower(risco) = 'medium' then 1 else 0 end) as MEDIUM_TOTAL,
          sum(case when lower(risco) = 'low'    then 1 else 0 end) as LOW_TOTAL
        from app.contratos
        where condominio_id = :condominiumId
        """,
        {"condominiumId": condominium_id},
    )
    c = (rows or [{}])[0]
    total = int(c.get("TOTAL") or 0)
    monthly = float(c.get("TOTAL_MENSAL") or 0)
    high = int(c.get("HIGH_TOTAL") or 0)
    medium = int(c.get("MEDIUM_TOTAL") or 0)
    low = int(c.get("LOW_TOTAL") or 0)
    quarterly = _format_brl(monthly * 3)
    monthly_fmt = _format_brl(monthly)

    return {
        "executiveTitle": "Relatório de Contratos",
        "executiveSummary": (
            f"{total} contratos ativos — {high} de alto risco, {medium} médio, {low} baixo. "
            f"Gasto mensal: {monthly_fmt}. Estimativa trimestral: {quarterly}."
        ),
        "sections": [
            {
                "title": "Gastos Mensais",
                "data": [
                    {"label": "Total mensal", "value": monthly_fmt},
                    {"label": "Estimativa trimestral", "value": quarterly},
                    {"label": "Total de contratos", "value": str(total)},
                ],
            },
            {
                "title": "Risco",
                "data": [
                    {"label": "Alto risco", "value": str(high)},
                    {"label": "Médio risco", "value": str(medium)},
                    {"label": "Baixo risco", "value": str(low)},
                ],
            },
        ],
        "items": [],
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

REPORT_TYPES = {"financeiro", "operacional", "contratos"}


async def get_reports_data(
    condominium_id: int,
    report_type: str = "financeiro",
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    safe_type = report_type if report_type in REPORT_TYPES else "financeiro"

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    today = datetime.now(timezone.utc).date().isoformat()
    first_of_month = today[:8] + "01"
    period = {
        "from": from_date or first_of_month,
        "to": to_date or today,
    }

    if settings.db_dialect == "oracle":
        try:
            if safe_type == "financeiro":
                payload = await _build_financeiro_oracle(condominium_id, from_date, to_date)
            elif safe_type == "operacional":
                payload = await _build_operacional_oracle(condominium_id, from_date, to_date)
            else:
                payload = await _build_contratos_oracle(condominium_id, from_date, to_date)

            return {"type": safe_type, "period": period, "generatedAt": now, **payload}
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("reports", "oracle_fallback_seed")

    if safe_type == "financeiro":
        payload = _build_financeiro_mock(condominium_id, from_date, to_date)
    elif safe_type == "operacional":
        payload = _build_operacional_mock(condominium_id, from_date, to_date)
    else:
        payload = _build_contratos_mock(condominium_id, from_date, to_date)

    return {"type": safe_type, "period": period, "generatedAt": now, **payload}
