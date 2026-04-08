from __future__ import annotations

import asyncio

from app.integrations.sabesp import repository


def test_try_import_consumption_oracle_persists_business_keys(monkeypatch):
    monkeypatch.setattr(repository.settings, "db_dialect", "oracle", raising=False)

    executed: dict[str, object] = {}

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        if "from app.unidades" in q:
            return [{"UNIDADE_ID": 101}]
        if "from app.consumo_agua_mensal" in q:
            assert params["condominiumId"] == 1
            return [{"CONSUMO_AGUA_ID": 987}]
        return []

    async def fake_run_oracle_execute(query: str, params: dict):
        executed["query"] = query
        executed["params"] = params
        return 1

    monkeypatch.setattr(repository, "run_oracle_query", fake_run_oracle_query)
    monkeypatch.setattr(repository, "run_oracle_execute", fake_run_oracle_execute)

    result = asyncio.run(
        repository._try_import_consumption_oracle(
            1,
            {
                "unit": "A-101",
                "reference": "04/2026",
                "readingDate": "2026-04-08",
                "dueDate": "2026-04-20",
                "consumptionM3": 38.4,
                "amount": 214.90,
                "status": "pending",
                "externalReference": "SAB-APR-001",
                "businessKey": "1|A-101|04/2026|2026-04-08|2026-04-20|38.40|214.90",
                "documentHash": "sab-hash-apr-001",
                "notes": "Conta importada pela sprint 12.",
            },
        )
    )

    params = executed["params"]
    assert isinstance(params, dict)
    assert params["unidadeId"] == 101
    assert params["externalReference"] == "SAB-APR-001"
    assert params["businessKey"] == "1|A-101|04/2026|2026-04-08|2026-04-20|38.40|214.90"
    assert params["externalHash"] == "sab-hash-apr-001"
    assert params["notes"] == "Conta importada pela sprint 12."
    assert result["mode"] == "oracle"
    assert result["result"] == "imported"
    assert result["recordId"] == "987"


def test_list_imported_consumption_snapshot_reads_oracle_rows(monkeypatch):
    monkeypatch.setattr(repository.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(repository.settings, "allow_oracle_seed_fallback", False, raising=False)

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        assert "from app.consumo_agua_mensal" in q
        assert params["condominiumId"] == 1
        return [
            {
                "CONSUMO_AGUA_ID": 321,
                "CONDOMINIO_ID": 1,
                "BLOCO": "A",
                "NUMERO_UNIDADE": "101",
                "REFERENCIA": "04/2026",
                "READING_DATE": "2026-04-08",
                "DUE_DATE": "2026-04-20",
                "CONSUMO_M3": 41.5,
                "VALOR_TOTAL": 230.75,
                "STATUS": "pending",
                "ORIGEM_DADO": "integration_sabesp",
                "EXTERNAL_REFERENCE": "SAB-APR-001",
                "BUSINESS_KEY": "bk-001",
                "EXTERNAL_HASH": "hash-001",
                "CREATED_AT_ISO": "2026-04-08T01:20:00Z",
                "RESIDENT_NAME": "Maria Silva",
            }
        ]

    async def fake_read_json_state(_path):
        return {}

    monkeypatch.setattr(repository, "run_oracle_query", fake_run_oracle_query)
    monkeypatch.setattr(repository, "read_json_state", fake_read_json_state)

    items = asyncio.run(repository.list_imported_consumption_snapshot(1))

    assert len(items) == 1
    assert items[0]["id"] == "sabesp-oracle-321"
    assert items[0]["unit"] == "A-101"
    assert items[0]["resident"] == "Maria Silva"
    assert items[0]["reference"] == "04/2026"
    assert items[0]["consumptionM3"] == 41.5
    assert items[0]["amount"] == 230.75
    assert items[0]["businessKey"] == "bk-001"
    assert items[0]["externalHash"] == "hash-001"


def test_list_imported_consumption_snapshot_falls_back_to_state_when_oracle_listing_fails(monkeypatch):
    monkeypatch.setattr(repository.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(repository.settings, "allow_oracle_seed_fallback", True, raising=False)

    async def fake_run_oracle_query(_query: str, _params: dict):
        raise RuntimeError("oracle unavailable")

    async def fake_read_json_state(_path):
        return {
            "1": {
                "runs": [],
                "importedConsumptions": [
                    {
                        "id": "sabesp-snapshot-local-1",
                        "unit": "B-202",
                        "reference": "05/2026",
                        "consumptionM3": 20.0,
                        "amount": 99.9,
                        "businessKey": "bk-local-1",
                        "externalHash": "hash-local-1",
                    }
                ],
            }
        }

    metrics: list[tuple[str, str]] = []

    def fake_record_api_fallback_metric(service: str, reason: str):
        metrics.append((service, reason))

    monkeypatch.setattr(repository, "run_oracle_query", fake_run_oracle_query)
    monkeypatch.setattr(repository, "read_json_state", fake_read_json_state)
    monkeypatch.setattr(repository, "record_api_fallback_metric", fake_record_api_fallback_metric)

    items = asyncio.run(repository.list_imported_consumption_snapshot(1))

    assert [item["id"] for item in items] == ["sabesp-snapshot-local-1"]
    assert metrics == [("integrations_sabesp", "oracle_snapshot_listing_fallback")]
