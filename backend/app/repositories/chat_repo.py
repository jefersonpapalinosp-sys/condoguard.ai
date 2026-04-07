"""
Chat repository — Gemini AI integration with per-session conversation history
and automatic fallback to rule-based responses when the API is unavailable.
"""
from __future__ import annotations

import asyncio
import logging
from collections import deque
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.chat_intents_repo import classify_intent, get_chat_intent_catalog, list_intent_suggestions
from app.services.chat_context_service import build_chat_context
from app.utils.seed_loader import read_seed_json

_log = logging.getLogger(__name__)

# In-memory conversation history: session_id -> deque of {"role", "content"} dicts
_SESSION_HISTORY: dict[str, deque[dict[str, str]]] = {}
MAX_HISTORY_TURNS = 10   # last 10 user+model exchanges per session
MAX_SESSIONS = 500       # evict oldest when exceeded

_OUT_OF_SCOPE_TERMS = [
    "futebol", "jogo", "receita", "culinaria", "filme", "serie",
    "celebridade", "astrologia", "loteria", "piada", "politica",
    "horoscopo", "musica", "novela",
]


# ---------------------------------------------------------------------------
# Session history helpers
# ---------------------------------------------------------------------------

def _get_history(session_id: str | None) -> deque[dict[str, str]]:
    if not session_id:
        return deque(maxlen=MAX_HISTORY_TURNS * 2)
    if session_id not in _SESSION_HISTORY:
        if len(_SESSION_HISTORY) >= MAX_SESSIONS:
            _SESSION_HISTORY.pop(next(iter(_SESSION_HISTORY)))
        _SESSION_HISTORY[session_id] = deque(maxlen=MAX_HISTORY_TURNS * 2)
    return _SESSION_HISTORY[session_id]


def clear_session_history(session_id: str) -> None:
    _SESSION_HISTORY.pop(session_id, None)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def _build_system_prompt(context: dict) -> str:
    m = context.get("metrics", {})
    sources = ", ".join(context.get("sources", []))
    return f"""Voce e o CondoGuard Copiloto, assistente especializado em gestao operacional de condominios.

Ajude sindicos, administradores e moradores com:
- Financeiro: faturas, inadimplencia, cobranca, fluxo de caixa
- Operacional: alertas, incidentes, manutencao preventiva e corretiva
- Consumo: energia, agua, anomalias de telemetria
- Gestao de unidades: ocupacao, cadastros, fornecedores
- Relatorios e planos de acao taticos

DADOS OPERACIONAIS EM TEMPO REAL:
  Faturas vencidas   : {m.get('overdueInvoices', 0)}
  Faturas pendentes  : {m.get('pendingInvoices', 0)}
  Faturas pagas      : {m.get('paidInvoices', 0)}
  Alertas criticos   : {m.get('criticalAlerts', 0)}
  Alertas abertos    : {m.get('openAlerts', 0)}
  Unidades manutencao: {m.get('maintenanceUnits', 0)}
  Unidades ocupadas  : {m.get('occupiedUnits', 0)}
  Total de unidades  : {m.get('totalUnits', 0)}
  Fonte dos dados    : {sources}
  Snapshot em        : {context.get('generatedAt', '')}

DIRETRIZES:
1. Responda APENAS sobre gestao de condominios. Para temas fora do escopo recuse de forma educada e breve.
2. Baseie respostas nos dados acima — cite numeros reais quando relevante.
3. Seja objetivo e profissional em portugues brasileiro. Maximo 3 paragrafos curtos.
4. Quando houver alertas criticos ou faturas vencidas, destaque e priorize essas informacoes.
5. Respostas devem ser acionaveis: sugira proximos passos concretos.
6. Nao invente dados que nao estejam no contexto fornecido."""


# ---------------------------------------------------------------------------
# Rule-based fallback (when Gemini is unavailable)
# ---------------------------------------------------------------------------

def _rule_based_response(intent_id: str, context: dict) -> str:
    m = context.get("metrics", {})
    overdue = m.get("overdueInvoices", 0)
    pending = m.get("pendingInvoices", 0)
    critical = m.get("criticalAlerts", 0)
    maintenance = m.get("maintenanceUnits", 0)

    if intent_id == "financial_priorities":
        return (
            f"Prioridade financeira: {overdue} faturas vencidas e {pending} pendentes. "
            "Recomendo acao imediata nas vencidas e abertura de trilha de cobranca para pendentes."
        )
    if intent_id == "critical_alerts":
        return (
            f"Alertas criticos ativos: {critical}. "
            "Acione equipe de manutencao, registre responsavel e prazo para cada evento."
        )
    if intent_id == "action_plan":
        return (
            f"Plano de acao 24h: "
            f"(1) resolver {critical} alertas criticos, "
            f"(2) iniciar cobranca em {overdue} faturas vencidas, "
            f"(3) revisar {maintenance} unidades em manutencao."
        )
    if intent_id == "consumption_anomalies":
        return (
            f"Consumo: {critical} eventos criticos podem impactar telemetria. "
            f"Priorize inspecao nas {maintenance} unidades em manutencao."
        )
    return (
        f"Resumo operacional: {overdue} faturas vencidas, {pending} pendentes, "
        f"{critical} alertas criticos, {maintenance} unidades em manutencao."
    )


# ---------------------------------------------------------------------------
# Guardrails
# ---------------------------------------------------------------------------

def _guardrails(message: str, classification: dict) -> dict:
    normalized = (message or "").lower()
    if any(term in normalized for term in _OUT_OF_SCOPE_TERMS):
        return {
            "blocked": True,
            "reason": "OUT_OF_SCOPE",
            "policyVersion": "s5-03.v1",
            "message": "Esse assunto esta fora do escopo do condominio. Posso ajudar com faturas, alertas, consumo ou gestao.",
        }
    # With Gemini active, let the model handle low-confidence messages
    if classification["confidence"] == "low" and not settings.gemini_api_key:
        return {
            "blocked": True,
            "reason": "LOW_CONFIDENCE",
            "policyVersion": "s5-03.v1",
            "message": "Nao entendi bem a pergunta. Reformule com contexto de alertas, consumo, faturas ou gestao.",
        }
    return {"blocked": False, "reason": None, "policyVersion": "s5-03.v1", "message": None}


# ---------------------------------------------------------------------------
# Gemini API call (sync SDK run in thread pool)
# ---------------------------------------------------------------------------

def _sync_gemini_call(
    message: str,
    system_prompt: str,
    history_snapshot: list[dict[str, str]],
) -> str:
    import google.generativeai as genai  # lazy import

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system_prompt,
    )
    chat_history: list[dict[str, Any]] = [
        {"role": entry["role"], "parts": [entry["content"]]}
        for entry in history_snapshot
    ]
    chat = model.start_chat(history=chat_history)
    response = chat.send_message(message)
    return response.text.strip()


async def _call_gemini(
    message: str,
    system_prompt: str,
    history: deque[dict[str, str]],
) -> str:
    snapshot = list(history)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_gemini_call, message, system_prompt, snapshot)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _now_time() -> str:
    return datetime.now().strftime("%H:%M")


async def get_chat_bootstrap(condominium_id: int = 1) -> dict:
    catalog = get_chat_intent_catalog()
    ai_note = " Gemini AI ativo." if settings.gemini_api_key else ""

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
                f"Ola! Sou o CondoGuard Copiloto.{ai_note} "
                f"Contexto atual: {overdue_count} faturas vencidas e {critical_count} alertas criticos. "
                "Como posso ajudar?"
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
    welcome = seed.get("welcomeMessage", "Ola! Sou o CondoGuard Copiloto.") + ai_note
    return {
        **seed,
        "welcomeMessage": welcome,
        "catalogVersion": catalog["version"],
        "suggestions": list_intent_suggestions(3),
    }


async def ask_chat(
    message: str,
    condominium_id: int = 1,
    session_id: str | None = None,
) -> dict:
    classification = classify_intent(message)
    context = await build_chat_context(condominium_id)
    guardrails = _guardrails(message, classification)
    history = _get_history(session_id)
    ai_powered = False

    if guardrails["blocked"]:
        text = guardrails["message"]
    elif settings.gemini_api_key:
        try:
            system_prompt = _build_system_prompt(context)
            text = await _call_gemini(message, system_prompt, history)
            ai_powered = True
            history.append({"role": "user", "content": message})
            history.append({"role": "model", "content": text})
        except Exception as exc:
            _log.error("Gemini call failed (session=%s): %s", session_id, exc)
            record_api_fallback_metric("chat", "gemini_fallback_rules")
            text = _rule_based_response(classification["intentId"], context)
    else:
        text = _rule_based_response(classification["intentId"], context)

    return {
        "id": f"bot-{int(datetime.now().timestamp() * 1000)}",
        "role": "assistant",
        "text": text,
        "time": _now_time(),
        "intentId": classification["intentId"],
        "confidence": classification["confidence"],
        "promptCatalogVersion": classification["catalogVersion"],
        "sources": context["sources"],
        "aiPowered": ai_powered,
        "limitations": (
            "Resposta gerada por IA com base no contexto operacional atual."
            if ai_powered
            else "Resposta automatica baseada em regras; confirme casos criticos com o responsavel tecnico."
        ),
        "guardrails": {
            "blocked": guardrails["blocked"],
            "reason": guardrails["reason"],
            "policyVersion": guardrails["policyVersion"],
        },
    }
