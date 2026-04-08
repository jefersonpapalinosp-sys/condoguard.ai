"""
response_formatter node — assembles the final API response dict from AgentState.

Produces the same contract as the original ask_chat() response, plus two new
optional fields: agentName and ragSources (added in Sprint 2, consumed in Sprint 4 UI).
"""
from __future__ import annotations

from datetime import datetime

from app.ai.graph_state import AgentState
from app.ai.context_formatters import format_rag_sources


def _now_time() -> str:
    return datetime.now().strftime("%H:%M")


async def response_formatter_node(state: AgentState) -> dict:
    guardrails = state.get("guardrails") or {}
    blocked = guardrails.get("blocked", False)
    classification = state.get("classification") or {}
    context = state.get("context") or {}
    rag_docs = state.get("rag_docs") or []
    ai_powered = state.get("ai_powered", False)

    if blocked:
        text = guardrails.get("message") or "Mensagem bloqueada pelas politicas do sistema."
        agent_name = None
    else:
        text = state.get("agent_response") or ""
        agent_name = state.get("agent_name") or None

    return {
        "final_response": {
            "id": f"bot-{int(datetime.now().timestamp() * 1000)}",
            "role": "assistant",
            "text": text,
            "time": _now_time(),
            "intentId": classification.get("intentId", "general_overview"),
            "confidence": classification.get("confidence", "low"),
            "promptCatalogVersion": classification.get("catalogVersion", ""),
            "sources": context.get("sources", []),
            "aiPowered": ai_powered,
            "limitations": (
                "Resposta gerada por IA com base no contexto operacional atual."
                if ai_powered
                else "Resposta automatica baseada em regras; confirme casos criticos com o responsavel tecnico."
            ),
            "guardrails": {
                "blocked": blocked,
                "reason": guardrails.get("reason"),
                "policyVersion": guardrails.get("policyVersion", "s5-03.v1"),
            },
            # New optional fields (Sprint 2+) — not breaking for existing clients
            "agentName": agent_name,
            "ragSources": format_rag_sources(rag_docs),
        }
    }
