from __future__ import annotations

import asyncio

from app.repositories import contracts_repo


def test_contracts_repo_prefers_app_tables_over_mart_view(monkeypatch):
    monkeypatch.setattr(contracts_repo.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(contracts_repo.settings, "allow_oracle_seed_fallback", True, raising=False)

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        if "from app.contratos" in q:
            return [
                {
                    "CONTRATO_ID": 101,
                    "CONDOMINIO_ID": params["condominiumId"],
                    "FORNECEDOR": "Fornecedor Real",
                    "TIPO_SERVICO": "Portaria",
                    "VALOR_MENSAL": 1234.56,
                    "INDICE_REAJUSTE": "IPCA",
                    "DATA_VENCIMENTO": None,
                    "STATUS_AUDITORIA_IA": "ok",
                }
            ]
        if "from mart.vw_contracts" in q:
            return [
                {
                    "CONTRATO_ID": 999,
                    "CONDOMINIO_ID": params["condominiumId"],
                    "FORNECEDOR": "Fallback MART",
                    "TIPO_SERVICO": "Fallback",
                    "VALOR_MENSAL": 1,
                    "INDICE_REAJUSTE": "IPCA",
                    "DATA_VENCIMENTO": None,
                    "STATUS_AUDITORIA_IA": "ok",
                }
            ]
        if "total_amount" in q:
            return [{"TOTAL_AMOUNT": 1234.56}]
        if "overdue_amount" in q:
            return [{"OVERDUE_AMOUNT": 100}]
        if "critical_total" in q:
            return [{"CRITICAL_TOTAL": 0}]
        return []

    monkeypatch.setattr(contracts_repo, "run_oracle_query", fake_run_oracle_query)

    payload = asyncio.run(contracts_repo.get_contracts_data(1))
    assert payload["items"][0]["vendor"] == "Fornecedor Real"
    assert payload["items"][0]["id"] == "101"
