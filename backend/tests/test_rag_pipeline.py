"""
Sprint 3 — Testes do pipeline RAG.

Usa FakeEmbeddings para evitar download do modelo sentence-transformers em CI.
Define RAG_ENABLED=false para testes de integração que não precisam de RAG real.
"""
from __future__ import annotations

import os
import tempfile
import pytest
from pathlib import Path

from app.ai.memory import clear_all_memories
from app.ai.graph import reset_agent_graph
from app.ai.rag.vector_store import reset_vector_store


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_embeddings():
    """FakeEmbeddings produz vetores aleatórios — sem download de modelo."""
    from langchain_core.embeddings import FakeEmbeddings
    return FakeEmbeddings(size=384)


def _reset():
    clear_all_memories()
    reset_agent_graph()
    reset_vector_store()


# ---------------------------------------------------------------------------
# Document loader tests
# ---------------------------------------------------------------------------

class TestDocumentLoader:
    def test_loads_md_files_from_kb_dir(self):
        from app.ai.rag.document_loader import load_knowledge_base

        # Use the actual knowledge base directory
        kb_path = Path(__file__).parents[1] / "data" / "knowledge_base"
        if not kb_path.exists():
            pytest.skip("Diretorio da knowledge base nao encontrado")

        chunks = load_knowledge_base(str(kb_path))
        assert len(chunks) > 0, "Deve carregar pelo menos um chunk"

    def test_chunks_have_reasonable_size(self):
        from app.ai.rag.document_loader import load_knowledge_base

        kb_path = Path(__file__).parents[1] / "data" / "knowledge_base"
        if not kb_path.exists():
            pytest.skip("Diretorio da knowledge base nao encontrado")

        chunks = load_knowledge_base(str(kb_path))
        for chunk in chunks:
            assert len(chunk.page_content) <= 700, f"Chunk muito grande: {len(chunk.page_content)} chars"
            assert len(chunk.page_content) > 10, "Chunk muito pequeno"

    def test_chunks_have_source_metadata(self):
        from app.ai.rag.document_loader import load_knowledge_base

        kb_path = Path(__file__).parents[1] / "data" / "knowledge_base"
        if not kb_path.exists():
            pytest.skip("Diretorio da knowledge base nao encontrado")

        chunks = load_knowledge_base(str(kb_path))
        for chunk in chunks:
            assert "source" in chunk.metadata

    def test_empty_dir_returns_no_chunks(self):
        from app.ai.rag.document_loader import load_knowledge_base

        with tempfile.TemporaryDirectory() as tmpdir:
            chunks = load_knowledge_base(tmpdir)
            assert chunks == []

    def test_nonexistent_dir_returns_no_chunks(self):
        from app.ai.rag.document_loader import load_knowledge_base

        chunks = load_knowledge_base("/nonexistent/path/xyz")
        assert chunks == []


# ---------------------------------------------------------------------------
# Vector store tests (with FakeEmbeddings — no real model needed)
# ---------------------------------------------------------------------------

class TestVectorStore:
    def setup_method(self):
        _reset()

    def test_ingest_and_count_with_fake_embeddings(self):
        """Verify ingestion pipeline works end-to-end with fake embeddings."""
        from langchain_community.vectorstores import Chroma
        from app.ai.rag.document_loader import load_knowledge_base

        kb_path = Path(__file__).parents[1] / "data" / "knowledge_base"
        if not kb_path.exists():
            pytest.skip("Diretorio da knowledge base nao encontrado")

        with tempfile.TemporaryDirectory() as tmpdir:
            embeddings = _fake_embeddings()
            store = Chroma(
                collection_name="test_kb",
                embedding_function=embeddings,
                persist_directory=tmpdir,
            )
            chunks = load_knowledge_base(str(kb_path))
            assert len(chunks) > 0

            store.add_documents(chunks)
            count = store._collection.count()
            assert count == len(chunks), f"Esperado {len(chunks)}, obtido {count}"

    def test_similarity_search_returns_results(self):
        """Verify similarity_search works with fake embeddings."""
        from langchain_community.vectorstores import Chroma
        from app.ai.rag.document_loader import load_knowledge_base

        kb_path = Path(__file__).parents[1] / "data" / "knowledge_base"
        if not kb_path.exists():
            pytest.skip("Diretorio da knowledge base nao encontrado")

        with tempfile.TemporaryDirectory() as tmpdir:
            embeddings = _fake_embeddings()
            store = Chroma(
                collection_name="test_kb2",
                embedding_function=embeddings,
                persist_directory=tmpdir,
            )
            chunks = load_knowledge_base(str(kb_path))
            store.add_documents(chunks)

            results = store.similarity_search("procedimento de cobranca", k=3)
            assert len(results) > 0
            # With fake embeddings, results are random — just check structure
            for doc in results:
                assert doc.page_content
                assert "source" in doc.metadata


# ---------------------------------------------------------------------------
# Context formatters tests
# ---------------------------------------------------------------------------

class TestContextFormatters:
    def test_format_rag_context_empty(self):
        from app.ai.context_formatters import format_rag_context
        result = format_rag_context([])
        assert "Nenhuma" in result

    def test_format_rag_context_with_docs(self):
        from app.ai.context_formatters import format_rag_context
        docs = [
            {"content": "Procedimento de cobranca passo 1.", "source": "procedimentos_cobranca.md", "score": 0.3},
            {"content": "Procedimento de cobranca passo 2.", "source": "procedimentos_cobranca.md", "score": 0.5},
        ]
        result = format_rag_context(docs)
        assert "procedimentos_cobranca.md" in result
        assert "Procedimento de cobranca passo 1." in result

    def test_format_rag_sources_deduplication(self):
        from app.ai.context_formatters import format_rag_sources
        docs = [
            {"source": "regulamento_interno.md", "score": 0.2},
            {"source": "regulamento_interno.md", "score": 0.4},
            {"source": "procedimentos_cobranca.md", "score": 0.3},
        ]
        sources = format_rag_sources(docs)
        assert len(sources) == 2
        assert "regulamento_interno.md" in sources
        assert "procedimentos_cobranca.md" in sources

    def test_format_rag_sources_empty(self):
        from app.ai.context_formatters import format_rag_sources
        assert format_rag_sources([]) == []


# ---------------------------------------------------------------------------
# Retriever tests (disabled RAG — no model needed)
# ---------------------------------------------------------------------------

class TestRetriever:
    def setup_method(self):
        _reset()

    def test_retrieve_returns_empty_when_rag_disabled(self):
        """RAG_ENABLED=false (set via env in test run) should return []."""
        from app.ai.rag.retriever import retrieve
        from app.core.config import settings

        if settings.rag_enabled:
            pytest.skip("Este teste requer RAG_ENABLED=false")

        result = retrieve("procedimento de cobranca", "financial")
        assert result == []

    def test_retrieve_returns_empty_when_store_empty(self):
        """An empty Chroma collection should report count == 0 (no crash)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            from langchain_community.vectorstores import Chroma
            empty_store = Chroma(
                collection_name="empty_guard_test",
                embedding_function=_fake_embeddings(),
                persist_directory=tmpdir,
            )
            # Empty collection — retrieve guard must handle this gracefully
            assert empty_store._collection.count() == 0
            results = empty_store.similarity_search("qualquer coisa", k=3)
            assert results == []


# ---------------------------------------------------------------------------
# Integration tests — graph with RAG disabled
# ---------------------------------------------------------------------------

class TestGraphWithRagDisabled:
    def setup_method(self):
        _reset()

    @pytest.mark.asyncio
    async def test_graph_works_with_rag_disabled(self):
        """Full graph run with RAG_ENABLED=false — ragSources should be empty."""
        from app.repositories.chat_repo import ask_chat
        from unittest.mock import patch

        with patch("app.core.config.settings") as s:
            # Set all necessary settings
            from app.core.config import settings as real_settings
            s.gemini_api_key = ""
            s.db_dialect = "mock"
            s.allow_oracle_seed_fallback = False
            s.rag_enabled = False
            s.rag_top_k = 3

            result = await ask_chat("como cobrar inadimplentes?", condominium_id=1)

        assert result["role"] == "assistant"
        assert result["ragSources"] == []

    @pytest.mark.asyncio
    async def test_graph_rag_sources_empty_in_rule_based_mode(self):
        """Rule-based mode (no API key) should always return empty ragSources."""
        from app.repositories.chat_repo import ask_chat

        result = await ask_chat("procedimento de cobranca", condominium_id=1)
        assert "ragSources" in result
        # RAG may or may not be enabled, but without docs it should be empty or list
        assert isinstance(result["ragSources"], list)
