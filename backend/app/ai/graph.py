"""
LangGraph StateGraph — multi-agent orchestration for CondoGuard chat.

Graph flow:
  context_loader
      → intent_router
      → guardrails_node
          ↳ (blocked)  → response_formatter → END
          ↳ (allowed)  → [financial|alerts|consumption|maintenance|general]_agent
                            → rag_retriever
                            → response_formatter
                            → END
"""
from __future__ import annotations

import logging

from langgraph.graph import StateGraph, END

from app.ai.graph_state import AgentState
from app.ai.nodes.context_loader import context_loader_node
from app.ai.nodes.intent_router import intent_router_node
from app.ai.nodes.guardrails_node import guardrails_node
from app.ai.nodes.rag_retriever import rag_retriever_node
from app.ai.nodes.response_formatter import response_formatter_node
from app.ai.nodes.agents.financial_agent import financial_agent_node
from app.ai.nodes.agents.alerts_agent import alerts_agent_node
from app.ai.nodes.agents.consumption_agent import consumption_agent_node
from app.ai.nodes.agents.maintenance_agent import maintenance_agent_node
from app.ai.nodes.agents.general_agent import general_agent_node
from app.ai.nodes.action_executor_node import action_executor_node
from app.ai.prompts import resolve_domain

_log = logging.getLogger(__name__)

# Domain → agent node name
_DOMAIN_TO_NODE: dict[str, str] = {
    "financial": "financial_agent",
    "alerts": "alerts_agent",
    "consumption": "consumption_agent",
    "maintenance": "maintenance_agent",
    "general": "general_agent",
}


def _route_after_guardrails(state: AgentState) -> str:
    """Conditional edge: if blocked go straight to formatter, otherwise pick agent or executor."""
    if state.get("guardrails", {}).get("blocked", False):
        return "response_formatter"
    route = state.get("route") or {}
    # Transactional actions go to the executor, not a domain agent
    if route.get("mode") == "transactional":
        return "action_executor"
    raw_domain = route.get("domain", "geral")
    domain_key = resolve_domain(raw_domain)
    return _DOMAIN_TO_NODE.get(domain_key, "general_agent")


def build_agent_graph():
    g = StateGraph(AgentState)

    # Register nodes
    g.add_node("context_loader", context_loader_node)
    g.add_node("intent_router", intent_router_node)
    g.add_node("guardrails_node", guardrails_node)
    g.add_node("financial_agent", financial_agent_node)
    g.add_node("alerts_agent", alerts_agent_node)
    g.add_node("consumption_agent", consumption_agent_node)
    g.add_node("maintenance_agent", maintenance_agent_node)
    g.add_node("general_agent", general_agent_node)
    g.add_node("action_executor", action_executor_node)
    g.add_node("rag_retriever", rag_retriever_node)
    g.add_node("response_formatter", response_formatter_node)

    # Edges
    g.set_entry_point("context_loader")
    g.add_edge("context_loader", "intent_router")
    g.add_edge("intent_router", "guardrails_node")

    g.add_conditional_edges(
        "guardrails_node",
        _route_after_guardrails,
        {
            "response_formatter": "response_formatter",
            "action_executor": "action_executor",
            "financial_agent": "financial_agent",
            "alerts_agent": "alerts_agent",
            "consumption_agent": "consumption_agent",
            "maintenance_agent": "maintenance_agent",
            "general_agent": "general_agent",
        },
    )

    # Action executor bypasses rag_retriever and goes straight to formatter
    g.add_edge("action_executor", "response_formatter")

    # All agent nodes go through rag_retriever then formatter
    for agent_node in ("financial_agent", "alerts_agent", "consumption_agent", "maintenance_agent", "general_agent"):
        g.add_edge(agent_node, "rag_retriever")
    g.add_edge("rag_retriever", "response_formatter")
    g.add_edge("response_formatter", END)

    return g.compile()


_GRAPH = None


def get_agent_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_agent_graph()
        _log.info("LangGraph AgentGraph compilado com sucesso")
    return _GRAPH


def reset_agent_graph() -> None:
    """Reset the compiled graph singleton — used in tests."""
    global _GRAPH
    _GRAPH = None
