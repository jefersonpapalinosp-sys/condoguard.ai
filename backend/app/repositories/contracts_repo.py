from __future__ import annotations

from datetime import datetime

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json


def _currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _risk_from_audit_status(value: str | None) -> str:
    raw = str(value or "").strip().lower()
    if raw in {"critico", "critical", "alto", "high"}:
        return "high"
    if raw in {"medio", "médio", "medium", "atencao", "atenção", "warning"}:
        return "medium"
    return "low"


def _next_adjustment(offset_months: int) -> str:
    now = datetime.now()
    month = now.month + offset_months
    year = now.year + ((month - 1) // 12)
    normalized_month = ((month - 1) % 12) + 1
    day = 15 if offset_months == 1 else 2 if offset_months == 2 else 12
    month_names = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ]
    return f"{day:02d} {month_names[normalized_month - 1]} {year}"


def _build_oracle_contract_items(total_amount: float, overdue_amount: float, critical_alerts: int) -> list[dict]:
    seed = read_seed_json("contracts.json")
    templates = seed.get("items", [])
    if not templates:
        return []

    weights = [0.42, 0.32, 0.26]
    overdue_ratio = (overdue_amount / total_amount) if total_amount > 0 else 0

    items = []
    for idx, template in enumerate(templates[:3]):
        monthly_value = total_amount * weights[idx]
        risk = "low"
        note = "Contrato dentro da faixa operacional prevista."

        if overdue_ratio >= 0.2 and idx == 0:
            risk = "high"
            note = "Pressao financeira elevada por inadimplencia; revisar clausulas e prazos."
        elif overdue_ratio >= 0.08 and idx in {0, 1}:
            risk = "medium"
            note = "Sinal de risco moderado; acompanhar reajustes e cronograma de renovacao."

        if critical_alerts > 0 and idx == 0:
            risk = "high"
            note = "Eventos criticos operacionais ativos podem impactar custo contratual."
        elif critical_alerts > 0 and idx == 1 and risk == "low":
            risk = "medium"
            note = "Alertas operacionais exigem monitoramento do SLA do fornecedor."

        items.append(
            {
                "id": template.get("id", f"ct{idx + 1}"),
                "vendor": template.get("vendor", f"Fornecedor {idx + 1}"),
                "monthlyValue": _currency(monthly_value),
                "index": template.get("index", "IPCA"),
                "nextAdjustment": _next_adjustment(idx + 1),
                "risk": risk,
                "note": note,
            }
        )

    return items


def _build_contract_items_from_view(rows: list[dict] | None) -> list[dict]:
    items = []
    for idx, row in enumerate(rows or []):
        monthly_amount = float(row.get("VALOR_MENSAL") or 0)
        items.append(
            {
                "id": str(row.get("CONTRATO_ID") or f"ct-{idx + 1}"),
                "vendor": str(row.get("FORNECEDOR") or f"Fornecedor {idx + 1}"),
                "monthlyValue": _currency(monthly_amount),
                "index": str(row.get("INDICE_REAJUSTE") or "IPCA"),
                "nextAdjustment": _next_adjustment((idx % 3) + 1),
                "risk": _risk_from_audit_status(row.get("STATUS_AUDITORIA_IA")),
                "note": str(row.get("TIPO_SERVICO") or "Contrato operacional ativo"),
            }
        )
    return items


async def get_contracts_data(condominium_id: int = 1) -> dict:
    if settings.db_dialect == "oracle":
        try:
            contracts_items: list[dict] = []
            try:
                contracts_rows = await run_oracle_query(
                    """
                    select
                      contrato_id,
                      condominio_id,
                      fornecedor,
                      tipo_servico,
                      valor_mensal,
                      indice_reajuste,
                      status_auditoria_ia
                    from mart.vw_contracts
                    where condominio_id = :condominiumId
                    order by valor_mensal desc
                    fetch first 20 rows only
                    """,
                    {"condominiumId": condominium_id},
                )
                contracts_items = _build_contract_items_from_view(contracts_rows)
            except Exception:
                contracts_items = []

            totals_rows = await run_oracle_query(
                """
                select nvl(sum(amount), 0) as TOTAL_AMOUNT
                from mart.vw_financial_invoices
                where condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )
            overdue_rows = await run_oracle_query(
                """
                select nvl(sum(amount), 0) as OVERDUE_AMOUNT
                from mart.vw_financial_invoices
                where condominio_id = :condominiumId
                  and lower(status) = 'overdue'
                """,
                {"condominiumId": condominium_id},
            )
            critical_alerts_rows = await run_oracle_query(
                """
                select count(1) as CRITICAL_TOTAL
                from mart.vw_alerts_operational
                where condominio_id = :condominiumId
                  and lower(gravidade) in ('alta', 'critica')
                """,
                {"condominiumId": condominium_id},
            )

            total_amount = float((totals_rows or [{}])[0].get("TOTAL_AMOUNT") or 0)
            overdue_amount = float((overdue_rows or [{}])[0].get("OVERDUE_AMOUNT") or 0)
            critical_alerts = int((critical_alerts_rows or [{}])[0].get("CRITICAL_TOTAL") or 0)
            estimated_impact = overdue_amount * 0.12

            return {
                "estimatedQuarterImpact": _currency(estimated_impact),
                "totalMonthlySpend": _currency(total_amount),
                "items": contracts_items or _build_oracle_contract_items(total_amount, overdue_amount, critical_alerts),
            }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("contracts", "oracle_fallback_seed")

    seed = read_seed_json("contracts.json")
    return {
        "estimatedQuarterImpact": seed.get("estimatedQuarterImpact", "R$ 0,00"),
        "totalMonthlySpend": seed.get("totalMonthlySpend", "R$ 0,00"),
        "items": seed.get("items", []),
    }
