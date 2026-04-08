"""
LCEL chain factory — one chain per agent domain.

Each chain: prompt | llm | StrOutputParser()

Usage:
    chain = build_domain_chain("financial")
    result = await chain.ainvoke({
        "metrics_block": "...",
        "context_block": "...",
        "rag_context": "Nenhuma referencia adicional.",
        "history": [...],  # list[BaseMessage]
        "question": "quais faturas estao vencidas?",
    })
"""
from __future__ import annotations

import logging

from langchain_core.output_parsers import StrOutputParser

from app.ai.prompts import DOMAIN_PROMPTS, resolve_domain

_log = logging.getLogger(__name__)
_CHAINS: dict[str, object] = {}


def build_domain_chain(domain: str):
    """Return (or create) the LCEL chain for a domain key."""
    key = resolve_domain(domain)
    if key not in _CHAINS:
        from app.ai.llm_provider import get_llm  # noqa: PLC0415 — lazy to allow test patches
        prompt = DOMAIN_PROMPTS.get(key, DOMAIN_PROMPTS["general"])
        llm = get_llm()
        _CHAINS[key] = prompt | llm | StrOutputParser()
        _log.debug("Cadeia LangChain criada para dominio '%s'", key)
    return _CHAINS[key]


def clear_chains_cache() -> None:
    """Invalidate all cached chains — used in tests."""
    _CHAINS.clear()
