from __future__ import annotations

import inspect
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.core.tenancy import ensure_condominium_id
from app.db.oracle_client import run_oracle_query
from app.integrations.sabesp.repository import list_imported_consumption_snapshot
from app.observability.metrics_store import record_api_fallback_metric
from app.utils.seed_loader import read_seed_json


def _map_severity(value: str | None) -> str:
    raw = str(value or "").lower()
    if raw in {"alta", "critica"}:
        return "critical"
    if raw == "media":
        return "warning"
    return "info"


async def _normalize_text(value: Any, fallback: str) -> str:
    if value is None:
        return fallback

    try:
        parsed = value
        read_fn = getattr(value, "read", None)
        if callable(read_fn):
            read_result = read_fn()
            parsed = await read_result if inspect.isawaitable(read_result) else read_result

        if isinstance(parsed, bytes):
            parsed = parsed.decode("utf-8", errors="ignore")

        raw = str(parsed).strip()
    except Exception:
        return fallback

    # Defensive fallback for unresolved LOB repr leaking to API payload.
    if not raw or "oracledb.AsyncLOB object at" in raw:
        return fallback
    return raw[:240]


def _format_currency_br(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _water_alert_severity(consumption_m3: float) -> str:
    if consumption_m3 >= 40:
        return "critical"
    if consumption_m3 >= 25:
        return "warning"
    return "info"


def _water_alert_sigma(consumption_m3: float) -> str:
    if consumption_m3 >= 40:
        return "3.0 sigma"
    if consumption_m3 >= 25:
        return "2.2 sigma"
    return "1.5 sigma"


def _merge_sabesp_anomalies(payload: dict[str, Any], imported_items: list[dict[str, Any]]) -> dict[str, Any]:
    if not imported_items:
        return payload

    anomalies = list(payload.get("anomalies") or [])
    kpis = dict(payload.get("kpis") or {})

    units_from_import = set()
    total_amount = 0.0
    sabesp_anomalies: list[dict[str, Any]] = []

    for item in imported_items:
        snapshot_id = str(item.get("id") or "").strip()
        if not snapshot_id:
            continue

        unit = str(item.get("unit") or "-").strip() or "-"
        reference = str(item.get("reference") or "").strip()
        consumption_m3 = float(item.get("consumptionM3") or 0)
        amount = float(item.get("amount") or 0)
        units_from_import.add(unit)
        total_amount += amount

        severity = _water_alert_severity(consumption_m3)
        if severity == "critical":
            title = f"Consumo de agua elevado na unidade {unit}"
        elif severity == "warning":
            title = f"Consumo de agua acima da faixa ideal na unidade {unit}"
        else:
            title = f"Leitura de agua monitorada na unidade {unit}"

        description = (
            f"Leitura Sabesp de {consumption_m3:.1f} m3"
            f"{f' ({reference})' if reference else ''}. "
            f"Valor: {_format_currency_br(amount)}."
        )
        sabesp_anomalies.append(
            {
                "id": snapshot_id,
                "title": title,
                "sigma": _water_alert_sigma(consumption_m3),
                "severity": severity,
                "description": description,
            }
        )

    existing_ids = {str(item.get("id") or "") for item in anomalies}
    merged_anomalies = [item for item in sabesp_anomalies if str(item.get("id") or "") not in existing_ids] + anomalies

    monitored_units = int(kpis.get("monitoredUnits") or 0)
    kpis["monitoredUnits"] = max(monitored_units, len(units_from_import))
    if total_amount > 0:
        kpis["projectedCost"] = _format_currency_br(total_amount)

    return {"kpis": kpis, "anomalies": merged_anomalies[:12]}


async def get_consumption_data(condominium_id: int) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
    try:
        imported_items = await list_imported_consumption_snapshot(condominium_id)
    except Exception:
        # Sabesp is additive context for the UI; if this side channel fails we still
        # keep the main consumption view available and observable.
        record_api_fallback_metric("consumption", "sabesp_import_listing_fallback")
        imported_items = []

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
                title = (await _normalize_text(row.get("TIPO_ANOMALIA"), "anomalia operacional")).replace("_", " ")
                description = await _normalize_text(row.get("DESCRICAO_ANOMALIA"), "Anomalia detectada automaticamente")
                anomalies.append(
                    {
                        "id": str(row.get("ALERT_ID") or f"oracle-{len(anomalies) + 1}"),
                        "title": title,
                        "sigma": "2.0 sigma",
                        "severity": _map_severity(str(row.get("GRAVIDADE") or "")),
                        "description": description,
                    }
                )

            seed = read_seed_json("consumption.json")
            base_payload = {
                "kpis": {
                    "monitoredUnits": monitored_units,
                    "peakLoad": f"{avg_load:.1f} kWh medio estimado",
                    "projectedCost": _format_currency_br(total_amount),
                },
                "anomalies": anomalies,
                "timeSeries": seed.get("timeSeries", []),
            }
            return _merge_sabesp_anomalies(base_payload, imported_items)
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("consumption", "oracle_fallback_seed")

    seed = read_seed_json("consumption.json")
    base_payload = {
        "kpis": seed.get("kpis", {}),
        "anomalies": seed.get("anomalies", []),
        "timeSeries": seed.get("timeSeries", []),
    }
    return _merge_sabesp_anomalies(base_payload, imported_items)
