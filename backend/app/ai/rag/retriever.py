"""
Semantic retriever — queries Chroma for the most relevant knowledge-base chunks.

Similarity threshold: Chroma uses L2 distance; lower = more similar.
The MAX_DISTANCE threshold filters out low-quality matches.
"""
from __future__ import annotations

import logging

_log = logging.getLogger(__name__)

MAX_DISTANCE = 1.2   # L2 distance threshold; tune based on embedding model


def retrieve(query: str, domain: str = "general", top_k: int | None = None) -> list[dict]:
    """Return the top-k most relevant knowledge-base chunks for a query.

    Each result: {"content": str, "source": str, "score": float}
    Returns [] when RAG is disabled or vector store is empty.
    """
    from app.core.config import settings  # noqa: PLC0415

    if not settings.rag_enabled:
        return []

    k = top_k or settings.rag_top_k

    try:
        from app.ai.rag.vector_store import get_vector_store  # noqa: PLC0415

        store = get_vector_store()

        # Guard against empty collection (before first ingestion)
        try:
            if store._collection.count() == 0:
                return []
        except Exception:
            return []

        results = store.similarity_search_with_score(query, k=k)
        docs = []
        for doc, score in results:
            if score <= MAX_DISTANCE:
                source = doc.metadata.get("source", "knowledge_base")
                # Keep only the filename for brevity
                import os  # noqa: PLC0415
                source = os.path.basename(source)
                docs.append({
                    "content": doc.page_content,
                    "source": source,
                    "score": round(float(score), 4),
                })
        _log.debug("RAG: %d documentos recuperados para query '%s'", len(docs), query[:60])
        return docs
    except Exception as exc:
        _log.warning("RAG retrieve falhou: %s", exc)
        return []
