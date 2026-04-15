"""
Chroma vector store lifecycle — singleton, idempotent ingestion.

Embedding strategy:
  - EMBEDDING_PROVIDER=google + GEMINI_API_KEY  → GoogleGenerativeAIEmbeddings
  - Otherwise (default / offline)               → HuggingFaceEmbeddings
    (paraphrase-multilingual-MiniLM-L12-v2, supports Portuguese, ~130 MB download on first use)

Set RAG_ENABLED=false to skip all RAG operations (e.g., in CI without network).
"""
from __future__ import annotations

import logging

_log = logging.getLogger(__name__)

_VECTOR_STORE = None
_EMBEDDINGS = None


def _get_embeddings():
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        from app.core.config import settings  # noqa: PLC0415

        if settings.embedding_provider == "google" and settings.gemini_api_key:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings  # noqa: PLC0415
            _EMBEDDINGS = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.gemini_api_key,
            )
            _log.info("Embeddings: GoogleGenerativeAIEmbeddings (models/embedding-001)")
        else:
            from langchain_community.embeddings import HuggingFaceEmbeddings  # noqa: PLC0415
            _EMBEDDINGS = HuggingFaceEmbeddings(
                model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            _log.info("Embeddings: HuggingFace paraphrase-multilingual-MiniLM-L12-v2")
    return _EMBEDDINGS


def get_vector_store(persist_dir: str | None = None, embeddings=None):
    """Return (or create) the Chroma vector store singleton."""
    global _VECTOR_STORE
    if _VECTOR_STORE is None:
        from langchain_community.vectorstores import Chroma  # noqa: PLC0415
        from app.core.config import settings  # noqa: PLC0415

        _persist = persist_dir or settings.chroma_persist_dir
        _emb = embeddings or _get_embeddings()
        _VECTOR_STORE = Chroma(
            collection_name="atlasgrid_kb",
            embedding_function=_emb,
            persist_directory=_persist,
        )
        _log.info("Chroma vector store iniciado em: %s", _persist)
    return _VECTOR_STORE


async def ingest_knowledge_base(kb_dir: str | None = None, force: bool = False) -> int:
    """Ingest the knowledge base into Chroma. Idempotent — skips if already indexed.

    Returns the number of chunks ingested (0 when already up to date).
    """
    from app.core.config import settings  # noqa: PLC0415

    if not settings.rag_enabled:
        _log.info("RAG desabilitado (RAG_ENABLED=false) — ingestao ignorada")
        return 0

    store = get_vector_store()
    try:
        count = store._collection.count()
    except Exception:
        count = 0

    if count > 0 and not force:
        _log.info("Base de conhecimento ja indexada (%d chunks) — ingestao ignorada", count)
        return 0

    from app.ai.rag.document_loader import load_knowledge_base  # noqa: PLC0415
    import asyncio  # noqa: PLC0415

    chunks = await asyncio.get_event_loop().run_in_executor(
        None, load_knowledge_base, kb_dir
    )

    if not chunks:
        _log.warning("Nenhum documento encontrado na base de conhecimento")
        return 0

    if force and count > 0:
        store._collection.delete(where={})
        _log.info("Colecao limpa para re-ingestao forcada")

    await asyncio.get_event_loop().run_in_executor(None, store.add_documents, chunks)
    _log.info("Ingestao concluida: %d chunks indexados", len(chunks))
    return len(chunks)


def reset_vector_store() -> None:
    """Reset the singleton — used in tests to swap collections."""
    global _VECTOR_STORE, _EMBEDDINGS
    _VECTOR_STORE = None
    _EMBEDDINGS = None
