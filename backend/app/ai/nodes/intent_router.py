"""
intent_router node — classifies the user's message into an intent + domain.

Uses the deterministic keyword classifiers from Sprint 1 as primary routing.
The LLM-based upgrade is planned for a future sprint.
"""
from __future__ import annotations

from app.ai.graph_state import AgentState
from app.repositories.chat_intents_repo import classify_intent
from app.services.chat_agent_router import route_chat_message


async def intent_router_node(state: AgentState) -> dict:
    message = state["question"]
    classification = classify_intent(message)   # {intentId, confidence, catalogVersion}
    route = route_chat_message(message)         # {domain, action, mode, entities, …}
    return {
        "classification": classification,
        "route": route,
    }
