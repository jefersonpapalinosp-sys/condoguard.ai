"""
LangGraph AgentState — shared state that flows through all graph nodes.
"""
from __future__ import annotations

from typing import Any, Optional
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    # ── Inputs ────────────────────────────────────────────────────────────────
    session_id: str
    condominium_id: int
    question: str
    history: list[BaseMessage]           # populated from memory before graph call

    # ── context_loader node ───────────────────────────────────────────────────
    context: dict                         # {metrics, sources, generatedAt, …}

    # ── intent_router node ────────────────────────────────────────────────────
    classification: dict                  # {intentId, confidence, catalogVersion}
    route: dict                           # {domain, action, mode, entities, …}

    # ── guardrails_node ───────────────────────────────────────────────────────
    guardrails: dict                      # {blocked, reason, policyVersion, message}

    # ── rag_retriever node ────────────────────────────────────────────────────
    rag_docs: list[dict]                  # [{content, source, score}, …]

    # ── agent nodes ───────────────────────────────────────────────────────────
    agent_response: str
    agent_name: str                       # e.g. "Agente Financeiro"
    ai_powered: bool

    # ── response_formatter node ───────────────────────────────────────────────
    final_response: dict                  # the full API response dict
