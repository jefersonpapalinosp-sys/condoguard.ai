"""
Chat repository — thin adapter over the LangGraph multi-agent pipeline.

ask_chat() delegates all AI logic to the StateGraph defined in app.ai.graph.
get_chat_bootstrap() remains a standalone DB query (no graph involvement).
"""
from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.core.tenancy import ensure_condominium_id
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.chat_intents_repo import get_chat_intent_catalog, list_intent_suggestions
from app.utils.seed_loader import read_seed_json
from app.ai.memory import get_memory, save_to_memory
from app.ai.graph import get_agent_graph

_log = logging.getLogger(__name__)


async def get_chat_bootstrap(condominium_id: int) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
    catalog = get_chat_intent_catalog()
    ai_badge = "Gemini AI" if settings.gemini_api_key else "Modo regras"

    if settings.db_dialect == "oracle":
        try:
            overdue_rows, alerts_rows = await asyncio.gather(
                run_oracle_query(
                    """
                    select count(1) as TOTAL
                    from mart.vw_financial_invoices
                    where lower(status) = 'overdue'
                      and condominio_id = :condominiumId
                    """,
                    {"condominiumId": condominium_id},
                ),
                run_oracle_query(
                    """
                    select count(1) as TOTAL
                    from mart.vw_alerts_operational
                    where lower(gravidade) in ('alta', 'critica')
                      and condominio_id = :condominiumId
                    """,
                    {"condominiumId": condominium_id},
                ),
            )
            overdue_count = int((overdue_rows or [{}])[0].get("TOTAL") or 0)
            critical_count = int((alerts_rows or [{}])[0].get("TOTAL") or 0)
            welcome = (
                f"Ola! Sou o **CondoGuard Copiloto** ({ai_badge}). "
                f"Situacao atual: **{overdue_count} faturas vencidas** e **{critical_count} alertas criticos**. "
                "Pergunte sobre faturas, alertas, consumo, contratos ou gestao de unidades."
            )
            return {
                "welcomeMessage": welcome,
                "catalogVersion": catalog["version"],
                "suggestions": list_intent_suggestions(3),
            }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("chat", "oracle_fallback_seed")

    seed = read_seed_json("chat_bootstrap.json")
    welcome = (
        f"Ola! Sou o **CondoGuard Copiloto** ({ai_badge}). "
        "Posso ajudar com faturas, alertas operacionais, consumo de recursos e gestao de unidades. "
        "Como posso ajudar hoje?"
    )
    return {
        **seed,
        "welcomeMessage": welcome,
        "catalogVersion": catalog["version"],
        "suggestions": list_intent_suggestions(3),
    }


async def ask_chat(
    message: str,
    condominium_id: int,
    session_id: str | None = None,
) -> dict:
    condominium_id = ensure_condominium_id(condominium_id)
    memory = get_memory(session_id)
    history = memory.messages

    initial_state = {
        "session_id": session_id or "",
        "condominium_id": condominium_id,
        "question": message,
        "history": history,
        "context": {},
        "classification": {},
        "route": {},
        "guardrails": {"blocked": False, "reason": None, "policyVersion": "s5-03.v1", "message": None},
        "rag_docs": [],
        "agent_response": "",
        "agent_name": "",
        "ai_powered": False,
        "action_result": None,
        "collaboration": {},
        "final_response": {},
    }

    graph = get_agent_graph()
    result = await graph.ainvoke(initial_state)

    final = result.get("final_response", {})

    # Save exchange to session memory only when the LLM actually ran
    if session_id and final.get("aiPowered") and not result.get("guardrails", {}).get("blocked"):
        save_to_memory(memory, message, final.get("text", ""))

    return final
