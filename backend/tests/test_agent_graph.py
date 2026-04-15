"""
Sprint 2 — Testes do LangGraph multi-agent StateGraph.

Usa FakeListChatModel para evitar chamadas reais à API do Gemini.
Verifica roteamento por domínio, guardrails, e shape da resposta final.
"""
from __future__ import annotations

import pytest
from unittest.mock import patch

from app.ai.memory import clear_all_memories
from app.ai.graph import reset_agent_graph
from app.ai.guardrails import check_guardrails


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reset():
    clear_all_memories()
    reset_agent_graph()


# ---------------------------------------------------------------------------
# Guardrails unit tests
# ---------------------------------------------------------------------------

class TestGuardrails:
    def test_out_of_scope_blocked(self):
        result = check_guardrails("me conta uma piada", "high")
        assert result["blocked"] is True
        assert result["reason"] == "OUT_OF_SCOPE"

    def test_low_confidence_no_key_allowed(self):
        """Low-confidence messages are no longer blocked — the rule-based fallback handles them gracefully."""
        with patch("app.ai.guardrails.settings") as s:
            s.gemini_api_key = ""
            result = check_guardrails("xyzabc qualquer coisa", "low")
        assert result["blocked"] is False

    def test_low_confidence_with_key_allowed(self):
        with patch("app.ai.guardrails.settings") as s:
            s.gemini_api_key = "fake-key"
            result = check_guardrails("algo generico", "low")
        assert result["blocked"] is False

    def test_valid_message_allowed(self):
        result = check_guardrails("quais faturas estao vencidas?", "high")
        assert result["blocked"] is False

    def test_policy_version_always_present(self):
        r = check_guardrails("qualquer coisa", "medium")
        assert r["policyVersion"] == "s5-03.v1"


# ---------------------------------------------------------------------------
# Graph integration tests (rule-based mode — no API key)
# ---------------------------------------------------------------------------

class TestAgentGraph:
    def setup_method(self):
        _reset()

    def test_router_detects_collaborative_mode_for_cross_domain_question(self):
        from app.services.chat_agent_router import route_chat_message

        route = route_chat_message("Quero um resumo das faturas vencidas e dos alertas criticos tambem.")
        assert route["mode"] == "collaborative"
        assert "financeiro" in route["multiDomains"]
        assert "alertas" in route["multiDomains"]

    @pytest.mark.asyncio
    async def test_graph_returns_valid_contract(self):
        """Graph must return the full API contract shape."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("status do condominio", condominium_id=1)

        required_keys = {
            "id", "role", "text", "time", "intentId", "confidence",
            "promptCatalogVersion", "sources", "aiPowered", "limitations", "guardrails",
        }
        assert required_keys.issubset(result.keys())
        assert result["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_graph_includes_agent_name(self):
        """Response must include agentName field (Sprint 2 addition)."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("quais faturas estao vencidas?", condominium_id=1)
        assert "agentName" in result
        assert result["agentName"] is not None

    @pytest.mark.asyncio
    async def test_graph_returns_collaboration_metadata_for_multi_domain_prompt(self):
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat(
            "Quero um resumo das faturas vencidas e dos alertas criticos tambem.",
            condominium_id=1,
        )

        assert result["agentName"] == "Orquestrador Multiagente"
        assert result["collaboration"] is not None
        assert result["collaboration"]["enabled"] is True
        assert len(result["collaboration"]["contributors"]) >= 2

    @pytest.mark.asyncio
    async def test_financial_domain_routes_to_financial_agent(self):
        """A financial message should be handled by the Agente Financeiro."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("quais faturas estao vencidas?", condominium_id=1)
        assert result["agentName"] == "Agente Financeiro"

    @pytest.mark.asyncio
    async def test_alerts_domain_routes_to_alerts_agent(self):
        """An alerts message should be handled by the Agente de Alertas."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("quais alertas criticos existem?", condominium_id=1)
        assert result["agentName"] == "Agente de Alertas"

    @pytest.mark.asyncio
    async def test_consumption_domain_routes_to_consumption_agent(self):
        """A consumption message should be handled by the Agente de Consumo."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("analise consumo de energia e anomalias", condominium_id=1)
        assert result["agentName"] == "Agente de Consumo"

    @pytest.mark.asyncio
    async def test_guardrails_block_out_of_scope(self):
        """Out-of-scope messages must be blocked before reaching any agent."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("me conta uma piada", condominium_id=1)
        assert result["guardrails"]["blocked"] is True
        assert result["guardrails"]["reason"] == "OUT_OF_SCOPE"
        assert result["agentName"] is None

    @pytest.mark.asyncio
    async def test_blocked_response_has_valid_shape(self):
        """Blocked responses must still satisfy the API contract."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("futebol ao vivo", condominium_id=1)
        required_keys = {"id", "role", "text", "time", "guardrails"}
        assert required_keys.issubset(result.keys())
        assert result["guardrails"]["blocked"] is True

    @pytest.mark.asyncio
    async def test_rag_sources_present_and_empty_in_sprint2(self):
        """ragSources should be present (but empty — RAG stub in Sprint 2)."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("resumo do condominio", condominium_id=1)
        assert "ragSources" in result
        assert result["ragSources"] == []

    @pytest.mark.asyncio
    async def test_multiple_calls_with_same_session(self):
        """Multiple calls with the same session_id should not crash."""
        from app.repositories.chat_repo import ask_chat

        session = "multi-call-session"
        r1 = await ask_chat("faturas vencidas?", condominium_id=1, session_id=session)
        r2 = await ask_chat("e os alertas criticos?", condominium_id=1, session_id=session)

        assert r1["role"] == "assistant"
        assert r2["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_graph_with_fake_llm_routes_correctly(self):
        """Verify that a chain built with a fake LLM returns the expected text."""
        from langchain_core.language_models.fake_chat_models import FakeListChatModel
        from langchain_core.output_parsers import StrOutputParser
        from app.ai.prompts import DOMAIN_PROMPTS

        fake_llm = FakeListChatModel(responses=["Resposta financeira de teste."] * 10)
        chain = DOMAIN_PROMPTS["financial"] | fake_llm | StrOutputParser()

        result = await chain.ainvoke({
            "metrics_block": "Faturas vencidas: 3",
            "context_block": "Resumo financeiro",
            "rag_context": "Nenhuma referencia.",
            "history": [],
            "question": "quais faturas estao vencidas?",
        })
        assert "Resposta financeira de teste." in result


# ---------------------------------------------------------------------------
# HTTP endpoint tests
# ---------------------------------------------------------------------------

class TestChatEndpoint:
    def setup_method(self):
        _reset()

    def test_chat_message_returns_200_with_agent_name(self):
        """POST /api/chat/message should return agentName field."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        res = client.post("/api/auth/login", json={"email": "admin@atlasgrid.ai", "password": "password123"})
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        msg = client.post(
            "/api/chat/message",
            json={"message": "quais faturas estao vencidas?"},
            headers=headers,
        )
        assert msg.status_code == 200
        body = msg.json()
        assert "agentName" in body
        assert "ragSources" in body
        assert body["agentName"] == "Agente Financeiro"
