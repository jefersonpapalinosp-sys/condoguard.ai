"""
guardrails_node — applies content policy before reaching the LLM.
"""
from __future__ import annotations

from app.ai.graph_state import AgentState
from app.ai.guardrails import check_guardrails


async def guardrails_node(state: AgentState) -> dict:
    classification = state.get("classification") or {}
    confidence = classification.get("confidence", "low")
    guardrails = check_guardrails(state["question"], confidence)
    return {"guardrails": guardrails}
