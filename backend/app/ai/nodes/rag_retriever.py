"""
rag_retriever node — semantic search in the Chroma knowledge base.

Runs the sync Chroma query in a thread pool to avoid blocking the event loop.
Returns empty rag_docs when RAG_ENABLED=false (CI / offline mode).
"""
from __future__ import annotations

import asyncio
import logging

from app.ai.graph_state import AgentState
from app.ai.prompts import resolve_domain

_log = logging.getLogger(__name__)


def _merge_and_dedupe_docs(groups: list[list[dict]], limit: int) -> list[dict]:
    merged: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for docs in groups:
        for doc in docs:
            source = str(doc.get("source", "")).strip()
            content = str(doc.get("content", "")).strip()
            key = (source, content)
            if key in seen:
                continue
            seen.add(key)
            merged.append(doc)
            if len(merged) >= limit:
                return merged
    return merged


async def rag_retriever_node(state: AgentState) -> dict:
    from app.core.config import settings  # noqa: PLC0415

    if not settings.rag_enabled:
        return {"rag_docs": []}

    from app.ai.rag.retriever import retrieve  # noqa: PLC0415

    route = state.get("route") or {}
    question = state.get("question", "")
    mode = route.get("mode")

    domains: list[str] = []
    if mode == "collaborative":
        for raw in route.get("multiDomains") or []:
            normalized = resolve_domain(str(raw))
            if normalized not in domains:
                domains.append(normalized)
    if not domains:
        domains = [resolve_domain(str(route.get("domain", "general")))]

    try:
        loop = asyncio.get_event_loop()
        if len(domains) == 1:
            docs = await loop.run_in_executor(None, retrieve, question, domains[0])
        else:
            tasks = [loop.run_in_executor(None, retrieve, question, domain) for domain in domains]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            valid_groups = [result for result in results if isinstance(result, list)]
            limit = max(settings.rag_top_k, len(domains) * settings.rag_top_k)
            docs = _merge_and_dedupe_docs(valid_groups, limit)

        _log.debug("RAG retornou %d documentos para '%s'", len(docs), question[:60])
        return {"rag_docs": docs}
    except Exception as exc:
        _log.warning("rag_retriever_node falhou: %s", exc)
        return {"rag_docs": []}
