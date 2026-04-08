"""
Sprint 1 — Testes das LangChain chains e abstração de memória.

Usa FakeListChatModel para evitar chamadas reais à API do Gemini.
"""
from __future__ import annotations

import asyncio
import pytest

from langchain_core.messages import HumanMessage, AIMessage

from app.ai.memory import (
    get_memory,
    save_to_memory,
    clear_all_memories,
    get_history_messages,
    MAX_SESSIONS,
    MAX_TURNS,
)
from app.ai.prompts import resolve_domain, DOMAIN_PROMPTS


# ---------------------------------------------------------------------------
# Memory tests
# ---------------------------------------------------------------------------

class TestMemory:
    def setup_method(self):
        clear_all_memories()

    def test_new_session_starts_empty(self):
        mem = get_memory("sess-1")
        assert mem.messages == []

    def test_save_and_retrieve(self):
        mem = get_memory("sess-2")
        save_to_memory(mem, "Ola", "Ola! Como posso ajudar?")
        msgs = mem.messages
        assert len(msgs) == 2
        assert isinstance(msgs[0], HumanMessage)
        assert isinstance(msgs[1], AIMessage)
        assert msgs[0].content == "Ola"

    def test_trim_to_max_turns(self):
        mem = get_memory("sess-3")
        for i in range(MAX_TURNS + 3):
            save_to_memory(mem, f"pergunta {i}", f"resposta {i}")
        assert len(mem.messages) == MAX_TURNS * 2

    def test_no_session_returns_ephemeral(self):
        mem = get_memory(None)
        assert mem.messages == []
        from app.ai.memory import _MEMORIES
        assert None not in _MEMORIES

    def test_eviction_at_max_sessions(self):
        for i in range(MAX_SESSIONS + 1):
            get_memory(f"sess-evict-{i}")
        from app.ai.memory import _MEMORIES
        assert len(_MEMORIES) == MAX_SESSIONS

    def test_get_history_messages_returns_list(self):
        mem = get_memory("sess-hist")
        save_to_memory(mem, "pergunta", "resposta")
        msgs = get_history_messages("sess-hist")
        assert len(msgs) == 2


# ---------------------------------------------------------------------------
# Prompt / domain resolution tests
# ---------------------------------------------------------------------------

class TestPrompts:
    def test_resolve_financial_variants(self):
        assert resolve_domain("financeiro") == "financial"
        assert resolve_domain("financial") == "financial"

    def test_resolve_alerts_variants(self):
        assert resolve_domain("alertas") == "alerts"
        assert resolve_domain("alerts") == "alerts"

    def test_resolve_consumption(self):
        assert resolve_domain("consumo") == "consumption"

    def test_resolve_maintenance_variants(self):
        assert resolve_domain("contratos") == "maintenance"
        assert resolve_domain("cadastros") == "maintenance"

    def test_resolve_general_fallback(self):
        assert resolve_domain("unknown_domain") == "general"
        assert resolve_domain("geral") == "general"

    def test_all_domains_have_prompts(self):
        for domain in ("financial", "alerts", "consumption", "maintenance", "general"):
            assert domain in DOMAIN_PROMPTS


# ---------------------------------------------------------------------------
# ask_chat integration tests (rule-based mode — no API key needed)
# ---------------------------------------------------------------------------

class TestAskChatContract:
    def setup_method(self):
        clear_all_memories()

    @pytest.mark.asyncio
    async def test_response_contract_shape(self):
        """ask_chat always returns the required keys regardless of LLM availability."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("status do condominio", condominium_id=1)

        required_keys = {
            "id", "role", "text", "time", "intentId", "confidence",
            "promptCatalogVersion", "sources", "aiPowered", "limitations", "guardrails",
        }
        assert required_keys.issubset(result.keys())
        assert result["role"] == "assistant"
        assert result["guardrails"]["policyVersion"] == "s5-03.v1"

    @pytest.mark.asyncio
    async def test_rule_based_mode_when_no_api_key(self):
        """With no GEMINI_API_KEY configured, aiPowered must be False."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("resumo financeiro", condominium_id=1, session_id="test-no-key")

        assert result["role"] == "assistant"
        assert result["aiPowered"] is False
        assert "faturas" in result["text"].lower() or "resumo" in result["text"].lower()

    @pytest.mark.asyncio
    async def test_guardrails_blocks_out_of_scope(self):
        """Out-of-scope terms must always be blocked."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("me conta uma piada", condominium_id=1)

        assert result["guardrails"]["blocked"] is True
        assert result["guardrails"]["reason"] == "OUT_OF_SCOPE"

    @pytest.mark.asyncio
    async def test_guardrails_not_blocking_valid_message(self):
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("quais faturas estao vencidas?", condominium_id=1)

        assert result["guardrails"]["blocked"] is False

    @pytest.mark.asyncio
    async def test_memory_does_not_crash_across_calls(self):
        """Session memory should not crash in rule-based mode (no saves expected)."""
        from app.repositories.chat_repo import ask_chat

        session = "mem-test-session"
        await ask_chat("faturas vencidas?", condominium_id=1, session_id=session)
        await ask_chat("e os alertas?", condominium_id=1, session_id=session)
        msgs = get_history_messages(session)
        assert isinstance(msgs, list)

    @pytest.mark.asyncio
    async def test_chain_calls_with_fake_llm(self):
        """Verify the LCEL chain works end-to-end with a fake LLM."""
        from langchain_core.language_models.fake_chat_models import FakeListChatModel
        from langchain_core.output_parsers import StrOutputParser
        from app.ai.prompts import DOMAIN_PROMPTS
        from app.ai.chains import clear_chains_cache

        clear_chains_cache()

        fake_llm = FakeListChatModel(responses=["Resposta sobre faturas vencidas."])
        prompt = DOMAIN_PROMPTS["financial"]
        chain = prompt | fake_llm | StrOutputParser()

        result = await chain.ainvoke({
            "metrics_block": "Faturas vencidas: 3",
            "context_block": "Resumo financeiro",
            "rag_context": "Nenhuma referencia adicional disponivel.",
            "history": [],
            "question": "quais faturas estao vencidas?",
        })

        assert isinstance(result, str)
        assert len(result) > 0
