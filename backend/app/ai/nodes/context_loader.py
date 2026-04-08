"""
context_loader node — fetches real-time operational context from the DB (or mock).
"""
from __future__ import annotations

from app.ai.graph_state import AgentState
from app.services.chat_context_service import build_chat_context


async def context_loader_node(state: AgentState) -> dict:
    context = await build_chat_context(state["condominium_id"])
    return {"context": context}
