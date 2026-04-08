from __future__ import annotations

import asyncio

from app.repositories import consumption_repo


class _FakeAsyncLob:
    def __init__(self, content: str):
        self._content = content

    async def read(self) -> str:
        return self._content


def test_get_consumption_data_reads_oracle_async_lob(monkeypatch):
    monkeypatch.setattr(consumption_repo.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(consumption_repo.settings, "allow_oracle_seed_fallback", False, raising=False)

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        assert params["condominiumId"] == 1
        if "from mart.vw_management_units" in q:
            return [{"TOTAL": 2}]
        if "from mart.vw_financial_invoices" in q:
            return [{"TOTAL_AMOUNT": 440.0}]
        if "from mart.vw_alerts_operational" in q:
            return [
                {
                    "ALERT_ID": "alert-1",
                    "TIPO_ANOMALIA": _FakeAsyncLob("consumo_energia_acima"),
                    "DESCRICAO_ANOMALIA": _FakeAsyncLob("Consumo acima do baseline por 4 horas."),
                    "GRAVIDADE": "alta",
                }
            ]
        return []

    monkeypatch.setattr(consumption_repo, "run_oracle_query", fake_run_oracle_query)

    payload = asyncio.run(consumption_repo.get_consumption_data(1))

    assert payload["kpis"]["monitoredUnits"] == 2
    assert payload["anomalies"][0]["id"] == "alert-1"
    assert payload["anomalies"][0]["title"] == "consumo energia acima"
    assert payload["anomalies"][0]["description"] == "Consumo acima do baseline por 4 horas."
    assert payload["anomalies"][0]["severity"] == "critical"


def test_get_consumption_data_uses_fallback_when_lob_read_fails(monkeypatch):
    monkeypatch.setattr(consumption_repo.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(consumption_repo.settings, "allow_oracle_seed_fallback", False, raising=False)

    class _BrokenLob:
        async def read(self) -> str:
            raise RuntimeError("lob read error")

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        assert params["condominiumId"] == 1
        if "from mart.vw_management_units" in q:
            return [{"TOTAL": 1}]
        if "from mart.vw_financial_invoices" in q:
            return [{"TOTAL_AMOUNT": 220.0}]
        if "from mart.vw_alerts_operational" in q:
            return [
                {
                    "ALERT_ID": "alert-2",
                    "TIPO_ANOMALIA": _BrokenLob(),
                    "DESCRICAO_ANOMALIA": _BrokenLob(),
                    "GRAVIDADE": "media",
                }
            ]
        return []

    monkeypatch.setattr(consumption_repo, "run_oracle_query", fake_run_oracle_query)

    payload = asyncio.run(consumption_repo.get_consumption_data(1))

    assert payload["anomalies"][0]["title"] == "anomalia operacional"
    assert payload["anomalies"][0]["description"] == "Anomalia detectada automaticamente"
    assert payload["anomalies"][0]["severity"] == "warning"
