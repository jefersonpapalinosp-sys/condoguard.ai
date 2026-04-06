from __future__ import annotations

import asyncio

import pytest

from app.core.errors import ApiRequestError
from app.repositories import cadastros_repo


def test_list_cadastros_reads_oracle_rows(monkeypatch):
    monkeypatch.setattr(cadastros_repo.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(cadastros_repo.settings, "allow_oracle_seed_fallback", False, raising=False)

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        assert "from cadastros_gerais" in q
        assert params["condominiumId"] == 1
        return [
            {
                "CADASTRO_ID": "cad-901",
                "CONDOMINIO_ID": 1,
                "TIPO": "fornecedor",
                "TITULO": "Fornecedor Real",
                "DESCRICAO": "Contrato ativo",
                "STATUS": "active",
                "UPDATED_AT": "2026-04-06T12:00:00.000Z",
            }
        ]

    monkeypatch.setattr(cadastros_repo, "run_oracle_query", fake_run_oracle_query)

    payload = asyncio.run(cadastros_repo.list_cadastros(1))
    assert len(payload["items"]) == 1
    assert payload["items"][0]["id"] == "cad-901"
    assert payload["items"][0]["tipo"] == "fornecedor"
    assert payload["items"][0]["status"] == "active"


def test_list_cadastros_oracle_failure_raises_when_fallback_disabled(monkeypatch):
    monkeypatch.setattr(cadastros_repo.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(cadastros_repo.settings, "allow_oracle_seed_fallback", False, raising=False)

    async def failing_query(_query: str, _params: dict):
        raise RuntimeError("ORA-00942: table or view does not exist")

    monkeypatch.setattr(cadastros_repo, "run_oracle_query", failing_query)

    with pytest.raises(ApiRequestError) as exc:
        asyncio.run(cadastros_repo.list_cadastros(1))

    assert exc.value.status_code == 503
    assert exc.value.code == "ORACLE_UNAVAILABLE"


def test_create_and_update_cadastro_use_oracle_execute(monkeypatch):
    monkeypatch.setattr(cadastros_repo.settings, "db_dialect", "oracle", raising=False)
    monkeypatch.setattr(cadastros_repo.settings, "allow_oracle_seed_fallback", False, raising=False)

    stored: dict[str, dict] = {}

    async def fake_run_oracle_execute(query: str, params: dict):
        q = " ".join(query.lower().split())
        if "insert into cadastros_gerais" in q:
            stored[params["cadastroId"]] = {
                "CADASTRO_ID": params["cadastroId"],
                "CONDOMINIO_ID": params["condominiumId"],
                "TIPO": params["tipo"],
                "TITULO": params["titulo"],
                "DESCRICAO": params["descricao"],
                "STATUS": params["status"],
                "UPDATED_AT": "2026-04-06T12:00:00.000Z",
            }
            return 1
        if "update cadastros_gerais" in q:
            current = stored.get(params["cadastroId"])
            if current is None:
                return 0
            current["STATUS"] = params["status"]
            current["UPDATED_AT"] = "2026-04-06T12:05:00.000Z"
            return 1
        return 0

    async def fake_run_oracle_query(query: str, params: dict):
        q = " ".join(query.lower().split())
        if "and cadastro_id = :cadastroid" in q:
            current = stored.get(params["cadastroId"])
            return [current] if current else []
        if "from cadastros_gerais" in q:
            return list(stored.values())
        return []

    monkeypatch.setattr(cadastros_repo, "run_oracle_execute", fake_run_oracle_execute)
    monkeypatch.setattr(cadastros_repo, "run_oracle_query", fake_run_oracle_query)

    created = asyncio.run(
        cadastros_repo.create_cadastro(
            1,
            {
                "tipo": "servico",
                "titulo": "Vistoria mensal",
                "descricao": "Rotina preventiva",
                "status": "pending",
            },
        )
    )

    assert created["id"].startswith("cad-")
    assert created["tipo"] == "servico"
    assert created["status"] == "pending"

    updated = asyncio.run(cadastros_repo.update_cadastro_status(1, created["id"], "active"))
    assert updated is not None
    assert updated["status"] == "active"
