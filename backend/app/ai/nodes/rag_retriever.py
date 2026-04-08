"""
rag_retriever node — semantic search in the Chroma knowledge base.

Runs the sync Chroma query in a thread pool to avoid blocking the event loop.
Returns empty rag_docs when RAG_ENABLED=false (CI / offline mode).
"""
from __future__ import annotations

import asyncio
import logging

from app.ai.graph_state import AgentState

_log = logging.getLogger(__name__)


async def rag_retriever_node(state: AgentState) -> dict:
    from app.core.config import settings  # noqa: PLC0415

    if not settings.rag_enabled:
        return {"rag_docs": []}

    from app.ai.rag.retriever import retrieve  # noqa: PLC0415

    route = state.get("route") or {}
    domain = route.get("domain", "general")
    question = state.get("question", "")

    try:
        loop = asyncio.get_event_loop()
        docs = await loop.run_in_executor(None, retrieve, question, domain)
        _log.debug("RAG retornou %d documentos para '%s'", len(docs), question[:60])
        return {"rag_docs": docs}
    except Exception as exc:
        _log.warning("rag_retriever_node falhou: %s", exc)
        return {"rag_docs": []}
