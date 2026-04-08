"""
LangChain LLM and embeddings factory.

Lazily instantiates the LLM and embeddings models. Callers should catch
ValueError when GEMINI_API_KEY is not set and fall back to rule-based logic.
"""
from __future__ import annotations

import asyncio
import logging

from app.core.config import settings

_log = logging.getLogger(__name__)
_llm = None
_embeddings = None


def get_llm():
    """Return a ChatGoogleGenerativeAI instance or raise ValueError if no API key."""
    global _llm
    if _llm is None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY nao configurado — modo rule-based ativo")
        from langchain_google_genai import ChatGoogleGenerativeAI  # noqa: PLC0415
        _llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.3,
            max_output_tokens=512,
        )
    return _llm


def get_embeddings():
    """Return an embeddings model. Falls back to local sentence-transformers when no API key."""
    global _embeddings
    if _embeddings is None:
        if settings.embedding_provider == "google" and settings.gemini_api_key:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings  # noqa: PLC0415
            _embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.gemini_api_key,
            )
        else:
            from langchain_community.embeddings import HuggingFaceEmbeddings  # noqa: PLC0415
            _embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )
    return _embeddings


async def invoke_chain_with_retry(chain, kwargs: dict, max_retries: int = 1) -> str:
    """Invoke an LCEL chain, retrying once on quota exhaustion (429)."""
    for attempt in range(max_retries + 1):
        try:
            return await chain.ainvoke(kwargs)
        except Exception as exc:
            err_str = str(exc).lower()
            is_quota = (
                "429" in err_str
                or "quota" in err_str
                or "exhausted" in err_str
                or "resource_exhausted" in err_str
                or "rate_limit" in err_str
            )
            if is_quota and attempt < max_retries:
                _log.warning("Quota 429 — aguardando 5s antes de retry %d/%d", attempt + 1, max_retries)
                await asyncio.sleep(5)
                continue
            raise


def reset_llm_cache() -> None:
    """Reset cached instances — used in tests to swap providers."""
    global _llm, _embeddings
    _llm = None
    _embeddings = None
