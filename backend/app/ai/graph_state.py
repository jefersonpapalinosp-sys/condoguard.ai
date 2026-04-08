"""
Shared state contract used by the chat LangGraph pipeline.
"""
from __future__ import annotations

from typing import Optional
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    # Inputs
    session_id: str
    condominium_id: int
    question: str
    history: list[BaseMessage]

    # Context and routing
    context: dict
    classification: dict
    route: dict
    guardrails: dict
    rag_docs: list[dict]

    # Agent outputs
    agent_response: str
    agent_name: str
    ai_powered: bool

    # Optional transactional and collaborative metadata
    action_result: Optional[dict]
    collaboration: dict

    # Final payload returned by the API
    final_response: dict
