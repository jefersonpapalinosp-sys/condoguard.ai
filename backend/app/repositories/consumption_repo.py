from __future__ import annotations

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json


def _map_severity(value: str | None) -> str:
    raw = str(value or "").lower()
    if raw in {"alta", "critica"}:
        return "critical"
    if raw == "media":
        return "warning"
    return "info"


async def get_consumption_data(condominium_id: int = 1) -> dict:
    if settings.db_dialect == "oracle":
        try:
            units_rows = await run_oracle_query(
                """
                select count(1) as TOTAL
                from mart.vw_management_units
                where condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )
            invoices_rows = await run_oracle_query(
                """
                select nvl(sum(amount), 0) as TOTAL_AMOUNT
                from mart.vw_financial_invoices
                where condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )
            anomalies_rows = await run_oracle_query(
                """
                select alert_id, tipo_anomalia, descricao_anomalia, gravidade
                from mart.vw_alerts_operational
                where condominio_id = :condominiumId
                order by data_detectada desc
                fetch first 3 rows only
                """,
                {"condominiumId": condominium_id},
            )

            monitored_units = int((units_rows or [{}])[0].get("TOTAL") or 0)
            total_amount = float((invoices_rows or [{}])[0].get("TOTAL_AMOUNT") or 0)
            avg_load = (total_amount / monitored_units) if monitored_units > 0 else 0

            anomalies = []
            for row in anomalies_rows or []:
                anomalies.append(
                    {
                        "id": str(row.get("ALERT_ID") or f"oracle-{len(anomalies) + 1}"),
                        "title": str(row.get("TIPO_ANOMALIA") or "anomalia operacional").replace("_", " "),
                        "sigma": "2.0 sigma",
                        "severity": _map_severity(str(row.get("GRAVIDADE") or "")),
                        "description": str(row.get("DESCRICAO_ANOMALIA") or "Anomalia detectada automaticamente"),
                    }
                )

            return {
                "kpis": {
                    "monitoredUnits": monitored_units,
                    "peakLoad": f"{avg_load:.1f} kWh medio estimado",
                    "projectedCost": f"R$ {total_amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                },
                "anomalies": anomalies,
            }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("consumption", "oracle_fallback_seed")

    seed = read_seed_json("consumption.json")
    return {
        "kpis": seed.get("kpis", {}),
        "anomalies": seed.get("anomalies", []),
    }
