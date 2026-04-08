"""
Guardrails — out-of-scope filtering and low-confidence blocking.

Extracted from chat_repo.py so both the legacy path and the LangGraph nodes
can share the same logic without circular imports.
"""
from __future__ import annotations

from app.core.config import settings

_OUT_OF_SCOPE_TERMS = [
    "futebol", "jogo", "receita", "culinaria", "filme", "serie",
    "celebridade", "astrologia", "loteria", "piada", "politica",
    "horoscopo", "musica", "novela",
]

POLICY_VERSION = "s5-03.v1"


def check_guardrails(message: str, confidence: str) -> dict:
    """Return a guardrails dict.  'blocked' is True if the message should be rejected."""
    normalized = (message or "").lower()
    if any(term in normalized for term in _OUT_OF_SCOPE_TERMS):
        return {
            "blocked": True,
            "reason": "OUT_OF_SCOPE",
            "policyVersion": POLICY_VERSION,
            "message": "Esse assunto esta fora do escopo do condominio. Posso ajudar com faturas, alertas, consumo ou gestao.",
        }
    # Without a live LLM, block vague messages that scored low on keyword matching
    if confidence == "low" and not settings.gemini_api_key:
        return {
            "blocked": True,
            "reason": "LOW_CONFIDENCE",
            "policyVersion": POLICY_VERSION,
            "message": "Nao entendi bem a pergunta. Reformule com contexto de alertas, consumo, faturas ou gestao.",
        }
    return {"blocked": False, "reason": None, "policyVersion": POLICY_VERSION, "message": None}
