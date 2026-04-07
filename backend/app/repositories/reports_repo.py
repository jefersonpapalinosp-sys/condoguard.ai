from __future__ import annotations

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json


async def get_reports_data(condominium_id: int = 1) -> dict:
    if settings.db_dialect == "oracle":
        try:
            invoices_rows = await run_oracle_query(
                """
                select
                  count(1) as TOTAL,
                  sum(case when lower(status) = 'pending' then 1 else 0 end) as PENDING_TOTAL,
                  sum(case when lower(status) = 'overdue' then 1 else 0 end) as OVERDUE_TOTAL,
                  nvl(sum(amount), 0) as TOTAL_AMOUNT
                from mart.vw_financial_invoices
                where condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )
            alerts_rows = await run_oracle_query(
                """
                select count(1) as CRITICAL_TOTAL
                from mart.vw_alerts_operational
                where condominio_id = :condominiumId
                  and lower(gravidade) in ('alta', 'critica')
                """,
                {"condominiumId": condominium_id},
            )
            management_rows = await run_oracle_query(
                """
                select sum(case when lower(status) = 'maintenance' then 1 else 0 end) as MAINTENANCE_TOTAL
                from mart.vw_management_units
                where condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )

            inv = (invoices_rows or [{}])[0]
            critical_total = int((alerts_rows or [{}])[0].get("CRITICAL_TOTAL") or 0)
            maintenance_total = int((management_rows or [{}])[0].get("MAINTENANCE_TOTAL") or 0)
            pending_total = int(inv.get("PENDING_TOTAL") or 0)
            overdue_total = int(inv.get("OVERDUE_TOTAL") or 0)
            total_amount = float(inv.get("TOTAL_AMOUNT") or 0)

            return {
                "executiveTitle": "Resumo executivo operacional",
                "executiveSummary": (
                    f"Oracle: {pending_total} pendentes, {overdue_total} vencidas, "
                    f"{critical_total} alertas criticos e {maintenance_total} unidades em manutencao."
                ),
                "items": [
                    {
                        "id": "r1",
                        "title": "Fechamento financeiro",
                        "subtitle": f"Volume financeiro monitorado: R$ {total_amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                        "generatedAt": "agora",
                    },
                    {
                        "id": "r2",
                        "title": "Risco operacional",
                        "subtitle": f"Alertas criticos ativos: {critical_total}",
                        "generatedAt": "agora",
                    },
                    {
                        "id": "r3",
                        "title": "Manutencao e capacidade",
                        "subtitle": f"Unidades em manutencao: {maintenance_total}",
                        "generatedAt": "agora",
                    },
                ],
            }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("reports", "oracle_fallback_seed")

    seed = read_seed_json("reports.json")
    return {
        "executiveTitle": seed.get("executiveTitle", "Resumo executivo"),
        "executiveSummary": seed.get("executiveSummary", ""),
        "items": seed.get("items", []),
    }
