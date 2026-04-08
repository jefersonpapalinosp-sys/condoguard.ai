"""Alerts specialist agent node."""
from __future__ import annotations

import logging

from app.ai.graph_state import AgentState
from app.ai.context_formatters import format_metrics_block, format_context_block, format_rag_context
from app.ai.fallback import rule_based_response
from app.ai.llm_provider import invoke_chain_with_retry
from app.observability.metrics_store import record_api_fallback_metric

_log = logging.getLogger(__name__)
AGENT_NAME = "Agente de Alertas"
DOMAIN = "alerts"


async def alerts_agent_node(state: AgentState) -> dict:
    from app.ai.chains import build_domain_chain  # noqa: PLC0415

    context = state.get("context") or {}
    classification = state.get("classification") or {}
    rag_docs = state.get("rag_docs") or []

    try:
        chain = build_domain_chain(DOMAIN)
        text = await invoke_chain_with_retry(chain, {
            "metrics_block": format_metrics_block(context),
            "context_block": format_context_block(context, DOMAIN),
            "rag_context": format_rag_context(rag_docs),
            "history": state.get("history") or [],
            "question": state["question"],
        })
        return {"agent_response": text, "agent_name": AGENT_NAME, "ai_powered": True}
    except Exception as exc:
        _log.error("%s falhou: %s", AGENT_NAME, exc)
        record_api_fallback_metric("chat", "agent_fallback_rules")
        return {
            "agent_response": rule_based_response(
                classification.get("intentId", "critical_alerts"), context, state.get("question", "")
            ),
            "agent_name": AGENT_NAME,
            "ai_powered": False,
        }
