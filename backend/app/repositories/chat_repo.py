from __future__ import annotations

from datetime import datetime

from app.core.config import settings
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.chat_intents_repo import classify_intent, get_chat_intent_catalog, list_intent_suggestions
from app.services.chat_context_service import build_chat_context
from app.utils.seed_loader import read_seed_json


def _now_time() -> str:
    return datetime.now().strftime("%H:%M")


def _build_intent_response(intent_id: str, context: dict) -> str:
    m = context["metrics"]
    if intent_id == "financial_priorities":
        return f"Prioridade financeira: {m['overdueInvoices']} faturas vencidas e {m['pendingInvoices']} pendentes. Recomendo acao imediata nas vencidas e trilha de cobranca para pendentes."
    if intent_id == "critical_alerts":
        return f"Alertas criticos ativos: {m['criticalAlerts']}. Recomendo validar causa raiz, acionar manutencao e registrar responsavel por cada evento."
    if intent_id == "action_plan":
        return f"Plano de acao 24h: (1) tratar {m['criticalAlerts']} alertas criticos, (2) reduzir {m['overdueInvoices']} vencidas, (3) revisar {m['maintenanceUnits']} unidades em manutencao."
    if intent_id == "consumption_anomalies":
        return f"Visao de consumo: {m['criticalAlerts']} eventos criticos podem impactar telemetria. Priorize unidades em manutencao ({m['maintenanceUnits']}) para reduzir risco de anomalia."
    return f"Resumo atual: {m['overdueInvoices']} vencidas, {m['pendingInvoices']} pendentes, {m['criticalAlerts']} alertas criticos e {m['maintenanceUnits']} unidades em manutencao."


def _guardrails(message: str, classification: dict) -> dict:
    normalized = (message or "").lower()
    out_of_scope = ["futebol", "jogo", "receita", "culinaria", "filme", "serie", "celebridade", "astrologia", "loteria", "piada"]
    if any(term in normalized for term in out_of_scope):
        return {
            "blocked": True,
            "reason": "OUT_OF_SCOPE",
            "policyVersion": "s5-03.v1",
            "message": "Pergunta fora do escopo operacional do condominio.",
        }
    if classification["confidence"] == "low":
        return {
            "blocked": True,
            "reason": "LOW_CONFIDENCE",
            "policyVersion": "s5-03.v1",
            "message": "Confianca insuficiente para responder com seguranca. Reformule com contexto de alertas, consumo, faturas ou gestao.",
        }
    return {"blocked": False, "reason": None, "policyVersion": "s5-03.v1", "message": None}


async def get_chat_bootstrap(condominium_id: int = 1) -> dict:
    catalog = get_chat_intent_catalog()

    if settings.db_dialect == "oracle":
        try:
            overdue_rows = await run_oracle_query(
                """
                select count(1) as TOTAL
                from mart.vw_financial_invoices
                where lower(status) = 'overdue'
                  and condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )
            alerts_rows = await run_oracle_query(
                """
                select count(1) as TOTAL
                from mart.vw_alerts_operational
                where lower(gravidade) in ('alta', 'critica')
                  and condominio_id = :condominiumId
                """,
                {"condominiumId": condominium_id},
            )
            overdue_count = int((overdue_rows or [{}])[0].get("TOTAL") or 0)
            critical_count = int((alerts_rows or [{}])[0].get("TOTAL") or 0)
            return {
                "welcomeMessage": f"Contexto Oracle carregado: {overdue_count} faturas vencidas e {critical_count} alertas criticos.",
                "catalogVersion": catalog["version"],
                "suggestions": list_intent_suggestions(3),
            }
        except Exception as exc:
            if not settings.allow_oracle_seed_fallback:
                raise create_oracle_unavailable_error(exc)
            record_api_fallback_metric("chat", "oracle_fallback_seed")

    seed = read_seed_json("chat_bootstrap.json")
    return {**seed, "catalogVersion": catalog["version"], "suggestions": list_intent_suggestions(3)}


async def ask_chat(message: str, condominium_id: int = 1) -> dict:
    classification = classify_intent(message)
    context = await build_chat_context(condominium_id)
    guardrails = _guardrails(message, classification)
    text = guardrails["message"] if guardrails["blocked"] else _build_intent_response(classification["intentId"], context)
    return {
        "id": f"bot-{int(datetime.now().timestamp() * 1000)}",
        "role": "assistant",
        "text": text,
        "time": _now_time(),
        "intentId": classification["intentId"],
        "confidence": classification["confidence"],
        "promptCatalogVersion": classification["catalogVersion"],
        "sources": context["sources"],
        "limitations": "Resposta automatica com base no contexto operacional atual; confirme casos criticos com responsavel tecnico.",
        "guardrails": {
            "blocked": guardrails["blocked"],
            "reason": guardrails["reason"],
            "policyVersion": guardrails["policyVersion"],
        },
    }
