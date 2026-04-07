from __future__ import annotations

from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.errors import ApiRequestError
from app.core.errors import create_oracle_unavailable_error
from app.db.oracle_client import run_oracle_query
from app.observability.metrics_store import record_api_fallback_metric
from app.repositories.alerts_repo import get_alerts_data, mark_alert_as_read
from app.repositories.cadastros_repo import list_cadastros
from app.repositories.chat_intents_repo import classify_intent, get_chat_intent_catalog, list_intent_suggestions
from app.repositories.chat_pending_repo import cancel_pending_action, create_pending_action, take_pending_action
from app.repositories.contracts_management_repo import (
    close_contract_data,
    get_contract_detail_data,
    get_contracts_adjustments_data,
    get_contracts_expiring_data,
    get_contracts_list_data,
    list_contract_documents_data,
    renew_contract_data,
)
from app.repositories.invoices_repo import get_invoices_data, mark_invoice_as_paid
from app.services.chat_action_planner import build_chat_action_plan
from app.services.chat_agent_router import route_chat_message
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


def _guardrails(message: str, classification: dict, route: dict[str, Any]) -> dict[str, Any]:
    normalized = (message or "").lower()
    out_of_scope = ["futebol", "jogo", "receita", "culinaria", "filme", "serie", "celebridade", "astrologia", "loteria", "piada"]
    if any(term in normalized for term in out_of_scope):
        return {
            "blocked": True,
            "reason": "OUT_OF_SCOPE",
            "policyVersion": "s5-03.v1",
            "message": "Pergunta fora do escopo operacional do condominio.",
        }
    if classification["confidence"] == "low" and route.get("confidence") == "low":
        return {
            "blocked": True,
            "reason": "LOW_CONFIDENCE",
            "policyVersion": "s5-03.v1",
            "message": "Confianca insuficiente para responder com seguranca. Reformule com contexto de alertas, consumo, faturas ou gestao.",
        }
    return {"blocked": False, "reason": None, "policyVersion": "s5-03.v1", "message": None}


def _confidence_from(classification: dict[str, Any], route: dict[str, Any]) -> str:
    ranking = {"low": 1, "medium": 2, "high": 3}
    c = str(classification.get("confidence") or "low")
    r = str(route.get("confidence") or "low")
    return c if ranking.get(c, 1) >= ranking.get(r, 1) else r


def _assistant_payload(
    text: str,
    classification: dict[str, Any],
    route: dict[str, Any],
    context: dict[str, Any],
    guardrails: dict[str, Any],
    plan: dict[str, Any] | None = None,
    pending_action: dict[str, Any] | None = None,
    follow_ups: list[str] | None = None,
) -> dict[str, Any]:
    payload = {
        "id": f"bot-{int(datetime.now().timestamp() * 1000)}",
        "role": "assistant",
        "text": text,
        "time": _now_time(),
        "intentId": classification["intentId"],
        "confidence": _confidence_from(classification, route),
        "promptCatalogVersion": classification["catalogVersion"],
        "sources": context["sources"],
        "limitations": "Resposta automatica com base no contexto operacional atual; confirme casos criticos com responsavel tecnico.",
        "guardrails": {
            "blocked": guardrails["blocked"],
            "reason": guardrails["reason"],
            "policyVersion": guardrails["policyVersion"],
        },
        "agent": {
            "domain": route.get("domain"),
            "action": route.get("action"),
            "mode": route.get("mode"),
            "confidence": route.get("confidence"),
            "entities": route.get("entities"),
        },
    }
    if plan:
        payload["agentPlan"] = plan
    if pending_action:
        payload["pendingAction"] = {
            "id": pending_action["id"],
            "actionType": pending_action["actionType"],
            "targetId": pending_action["targetId"],
            "targetLabel": pending_action["targetLabel"],
            "confirmationPrompt": pending_action["confirmationPrompt"],
            "expiresAt": pending_action["expiresAt"],
        }
    if follow_ups:
        payload["followUps"] = follow_ups
    return payload


def _pick_invoice_target(items: list[dict[str, Any]], entities: dict[str, Any]) -> dict[str, Any] | None:
    invoice_id = str(entities.get("invoiceId") or "").strip().lower()
    unit = str(entities.get("unit") or "").strip().upper()

    if invoice_id:
        return next((item for item in items if str(item.get("id") or "").lower() == invoice_id), None)

    if unit:
        unit_items = [item for item in items if str(item.get("unit") or "").upper() == unit]
        overdue = next((item for item in unit_items if item.get("status") == "overdue"), None)
        if overdue:
            return overdue
        pending = next((item for item in unit_items if item.get("status") == "pending"), None)
        if pending:
            return pending

    overdue = next((item for item in items if item.get("status") == "overdue"), None)
    if overdue:
        return overdue
    return next((item for item in items if item.get("status") == "pending"), None)


def _pick_alert_target(items: list[dict[str, Any]], entities: dict[str, Any]) -> dict[str, Any] | None:
    alert_id = str(entities.get("alertId") or "").strip().lower()
    if alert_id:
        return next((item for item in items if str(item.get("id") or "").lower() == alert_id), None)

    critical = next((item for item in items if item.get("status") == "active" and item.get("severity") == "critical"), None)
    if critical:
        return critical
    return next((item for item in items if item.get("status") == "active"), None)


async def _pick_contract_target(condominium_id: int, route: dict[str, Any]) -> dict[str, Any] | None:
    contract_id = str(route.get("entities", {}).get("contractId") or "").strip().lower()
    if contract_id:
        details = await get_contract_detail_data(condominium_id, contract_id)
        return details["item"] if details else None

    expiring = await get_contracts_expiring_data(condominium_id)
    expired_group = expiring.get("groups", {}).get("expired", [])
    in30_group = expiring.get("groups", {}).get("in30Days", [])
    if expired_group:
        return expired_group[0]
    if in30_group:
        return in30_group[0]

    listing = await get_contracts_list_data(
        condominium_id,
        {"page": 1, "pageSize": 1, "sortBy": "monthlyValue", "sortOrder": "desc"},
    )
    items = listing.get("items", [])
    if items:
        return items[0]
    return None


def _top_ids(items: list[dict[str, Any]], limit: int = 3) -> str:
    return ", ".join(str(item.get("id")) for item in items[:limit]) if items else "sem itens elegiveis"


async def _informational_text(action: str, context: dict[str, Any], condominium_id: int, route: dict[str, Any], fallback_intent_id: str) -> tuple[str, list[str] | None]:
    metrics = context["metrics"]
    if action == "invoices_overview":
        invoices = await get_invoices_data(condominium_id)
        items = invoices.get("items", [])
        pending = len([item for item in items if item.get("status") == "pending"])
        overdue = len([item for item in items if item.get("status") == "overdue"])
        paid = len([item for item in items if item.get("status") == "paid"])
        unit = str(route.get("entities", {}).get("unit") or "").strip().upper()
        if unit:
            by_unit = [item for item in items if str(item.get("unit") or "").upper() == unit]
            if by_unit:
                pending_u = len([item for item in by_unit if item.get("status") == "pending"])
                overdue_u = len([item for item in by_unit if item.get("status") == "overdue"])
                return (
                    f"Financeiro da unidade {unit}: {overdue_u} vencidas e {pending_u} pendentes. "
                    f"No condominio inteiro temos {overdue} vencidas, {pending} pendentes e {paid} pagas.",
                    ["Pagar a fatura inv-5.", "Listar faturas vencidas por bloco."],
                )
        return (
            f"Resumo financeiro: {overdue} faturas vencidas, {pending} pendentes e {paid} pagas.",
            ["Pagar a fatura inv-5.", "Quais unidades concentram maior inadimplencia?"],
        )

    if action == "alerts_overview":
        alerts = await get_alerts_data(condominium_id)
        items = alerts.get("items", [])
        open_items = [item for item in items if item.get("status") == "active"]
        critical = [item for item in open_items if item.get("severity") == "critical"]
        preview = ", ".join(str(item.get("id")) for item in critical[:3]) if critical else "sem alertas criticos ativos"
        return (
            f"Alertas operacionais: {len(open_items)} ativos, sendo {len(critical)} criticos. "
            f"Ids criticos prioritarios: {preview}.",
            ["Marcar alerta a9 como lido.", "Listar somente alertas criticos ativos."],
        )

    if action == "contracts_expiring_overview":
        expiring = await get_contracts_expiring_data(condominium_id)
        summary = expiring.get("summary", {})
        return (
            f"Vencimentos contratuais: {summary.get('expired', 0)} vencidos, "
            f"{summary.get('in30Days', 0)} em 30 dias, {summary.get('in60Days', 0)} em 60 dias e "
            f"{summary.get('in90Days', 0)} em 90 dias.",
            ["Renovar contrato ct2.", "Encerrar contrato ct1."],
        )

    if action == "contracts_adjustments_overview":
        adjustments = await get_contracts_adjustments_data(condominium_id)
        summary = adjustments.get("summary", {})
        return (
            f"Reajustes previstos: {summary.get('upcomingAdjustments', 0)} contratos com impacto estimado "
            f"de {summary.get('estimatedImpact', 'R$ 0,00')}.",
            ["Simular reajuste dos contratos de risco alto.", "Mostrar top contratos por impacto de reajuste."],
        )

    if action == "contracts_documents_overview":
        documents = await list_contract_documents_data(condominium_id)
        total = len(documents.get("items", []))
        return (
            f"Gestao documental: {total} documentos vinculados a contratos neste condominio.",
            ["Abrir lista de documentos em /contracts/documentos.", "Anexar documento ao contrato ct1."],
        )

    if action == "contracts_overview":
        expiring = await get_contracts_expiring_data(condominium_id)
        adjustments = await get_contracts_adjustments_data(condominium_id)
        summary = expiring.get("summary", {})
        return (
            f"Visao de contratos: {summary.get('expired', 0)} vencidos, {summary.get('in30Days', 0)} vencendo em ate 30 dias "
            f"e {adjustments.get('summary', {}).get('upcomingAdjustments', 0)} reajustes previstos.",
            ["Listar contratos vencendo em 30 dias.", "Mostrar reajustes previstos."],
        )

    if action == "cadastros_overview":
        cadastros = await list_cadastros(condominium_id)
        items = cadastros.get("items", [])
        pending = len([item for item in items if item.get("status") == "pending"])
        by_type = {}
        for item in items:
            tipo = str(item.get("tipo") or "outros")
            by_type[tipo] = by_type.get(tipo, 0) + 1
        resume = ", ".join(f"{tipo}: {qtd}" for tipo, qtd in sorted(by_type.items()))
        return (
            f"Cadastros gerais: {len(items)} registros ({resume}). Pendentes de revisao: {pending}.",
            ["Listar apenas cadastros pendentes.", "Mostrar fornecedores ativos."],
        )

    if action == "consumption_overview":
        return (
            f"Consumo e operacao: {metrics['maintenanceUnits']} unidades em manutencao, "
            f"{metrics['criticalAlerts']} alertas criticos e {metrics['occupiedUnits']} unidades ocupadas.",
            ["Existe anomalia de consumo por bloco?", "Quais unidades estao em manutencao?"],
        )

    return _build_intent_response(fallback_intent_id, context), ["Gerar plano de acao de 24h.", "Listar alertas criticos."]


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


async def ask_chat(message: str, condominium_id: int = 1, actor_sub: str | None = None) -> dict:
    classification = classify_intent(message)
    route = route_chat_message(message)
    context = await build_chat_context(condominium_id)
    guardrails = _guardrails(message, classification, route)
    plan = build_chat_action_plan(route, context)

    if guardrails["blocked"]:
        return _assistant_payload(guardrails["message"], classification, route, context, guardrails, plan=plan)

    action = str(route.get("action") or "general_overview")
    entities = route.get("entities", {})

    if action == "invoice_mark_paid":
        invoices = await get_invoices_data(condominium_id)
        invoice_items = invoices.get("items", [])
        target = _pick_invoice_target(invoice_items, entities)
        if not target:
            follow_ups = [f"Pagar a fatura {item.get('id')}." for item in invoice_items if item.get("status") in {"overdue", "pending"}][:3]
            text = (
                "Nao encontrei uma fatura elegivel para pagamento. "
                f"Informe o id exato (ex.: inv-5). Sugestoes: {_top_ids(invoice_items)}."
            )
            return _assistant_payload(text, classification, route, context, guardrails, plan=plan, follow_ups=follow_ups)

        if target.get("status") == "paid":
            text = f"A fatura {target.get('id')} ja consta como paga. Se quiser, eu listo apenas as pendentes e vencidas."
            return _assistant_payload(text, classification, route, context, guardrails, plan=plan, follow_ups=["Listar faturas vencidas."])

        pending = create_pending_action(
            condominium_id=condominium_id,
            action_type="invoice_mark_paid",
            target_id=str(target.get("id")),
            target_label=f"Fatura {target.get('id')} - unidade {target.get('unit')}",
            confirmation_prompt=f"Confirmar baixa da fatura {target.get('id')} no valor de R$ {float(target.get('amount') or 0):.2f}?",
            actor_sub=actor_sub,
            payload={"invoiceId": target.get("id"), "unit": target.get("unit")},
        )
        text = (
            f"Encontrei a {pending['targetLabel']}. "
            "Para manter rastreabilidade e controle, preciso da sua confirmacao antes de executar."
        )
        return _assistant_payload(text, classification, route, context, guardrails, plan=plan, pending_action=pending)

    if action == "alert_mark_read":
        alerts = await get_alerts_data(condominium_id)
        alert_items = alerts.get("items", [])
        target = _pick_alert_target(alert_items, entities)
        if not target:
            text = "Nao encontrei alerta ativo para marcar como lido. Tente informar o id (ex.: a9)."
            return _assistant_payload(text, classification, route, context, guardrails, plan=plan, follow_ups=["Listar alertas criticos ativos."])

        if target.get("status") == "read":
            text = f"O alerta {target.get('id')} ja esta marcado como lido."
            return _assistant_payload(text, classification, route, context, guardrails, plan=plan)

        pending = create_pending_action(
            condominium_id=condominium_id,
            action_type="alert_mark_read",
            target_id=str(target.get("id")),
            target_label=f"Alerta {target.get('id')} - {target.get('title')}",
            confirmation_prompt=f"Confirmar marcacao do alerta {target.get('id')} como lido?",
            actor_sub=actor_sub,
            payload={"alertId": target.get("id")},
        )
        text = "Alerta identificado. Posso marcar como lido assim que voce confirmar."
        return _assistant_payload(text, classification, route, context, guardrails, plan=plan, pending_action=pending)

    if action in {"contract_renew", "contract_close"}:
        target_contract = await _pick_contract_target(condominium_id, route)
        if not target_contract:
            text = "Nao consegui localizar um contrato alvo. Informe o id (ex.: ct2) para renovar ou encerrar."
            return _assistant_payload(text, classification, route, context, guardrails, plan=plan, follow_ups=["Renovar contrato ct2.", "Encerrar contrato ct1."])

        op_label = "renovacao" if action == "contract_renew" else "encerramento"
        pending = create_pending_action(
            condominium_id=condominium_id,
            action_type=action,
            target_id=str(target_contract.get("id")),
            target_label=f"Contrato {target_contract.get('id')} - {target_contract.get('supplier')}",
            confirmation_prompt=f"Confirmar {op_label} do contrato {target_contract.get('id')}?",
            actor_sub=actor_sub,
            payload={"contractId": target_contract.get("id")},
        )
        text = (
            f"Contrato alvo encontrado: {target_contract.get('id')} ({target_contract.get('supplier')}). "
            "Posso executar a acao apos sua confirmacao."
        )
        return _assistant_payload(text, classification, route, context, guardrails, plan=plan, pending_action=pending)

    text, follow_ups = await _informational_text(action, context, condominium_id, route, classification["intentId"])
    return _assistant_payload(text, classification, route, context, guardrails, plan=plan, follow_ups=follow_ups)


async def resume_chat_action(
    pending_action_id: str,
    decision: str,
    condominium_id: int = 1,
    actor_sub: str | None = None,
) -> dict[str, Any]:
    decision_norm = str(decision or "").strip().lower()
    if decision_norm not in {"confirm", "cancel"}:
        raise ApiRequestError(400, "INVALID_BODY", "Decision deve ser confirm ou cancel.", {"field": "decision"})

    context = await build_chat_context(condominium_id)
    route = {
        "domain": "operacoes",
        "action": "resume_pending_action",
        "mode": "transactional",
        "confidence": "high",
        "entities": {},
    }
    classification = {"catalogVersion": "resume.v1", "intentId": "action_plan", "confidence": "high"}
    guardrails = {"blocked": False, "reason": None, "policyVersion": "s5-03.v1", "message": None}

    if decision_norm == "cancel":
        cancelled = cancel_pending_action(condominium_id, pending_action_id)
        if not cancelled:
            raise ApiRequestError(404, "NOT_FOUND", "Acao pendente nao encontrada ou expirada.")
        text = f"Acao cancelada com sucesso: {cancelled['actionType']} em {cancelled['targetLabel']}."
        return _assistant_payload(text, classification, route, context, guardrails)

    pending = take_pending_action(condominium_id, pending_action_id)
    if not pending:
        raise ApiRequestError(404, "NOT_FOUND", "Acao pendente nao encontrada ou expirada.")

    action_type = str(pending.get("actionType") or "")
    target_id = str(pending.get("targetId") or "")

    if action_type == "invoice_mark_paid":
        updated = await mark_invoice_as_paid(condominium_id, target_id, actor_sub)
        if not updated:
            raise ApiRequestError(404, "NOT_FOUND", "Fatura alvo nao encontrada para confirmar acao.")
        text = (
            f"Baixa concluida: fatura {updated.get('id')} marcada como {updated.get('status')} "
            f"para unidade {updated.get('unit')}."
        )
        return _assistant_payload(text, classification, route, context, guardrails)

    if action_type == "alert_mark_read":
        updated = await mark_alert_as_read(condominium_id, target_id, actor_sub)
        if not updated:
            raise ApiRequestError(404, "NOT_FOUND", "Alerta alvo nao encontrado para confirmar acao.")
        text = f"Alerta {updated.get('id')} marcado como lido com sucesso."
        return _assistant_payload(text, classification, route, context, guardrails)

    if action_type == "contract_renew":
        updated = await renew_contract_data(condominium_id, target_id, actor_sub)
        if not updated:
            raise ApiRequestError(404, "NOT_FOUND", "Contrato alvo nao encontrado para renovacao.")
        text = f"Contrato {updated.get('id')} renovado. Novo vencimento: {updated.get('endDate')}."
        return _assistant_payload(text, classification, route, context, guardrails)

    if action_type == "contract_close":
        updated = await close_contract_data(condominium_id, target_id, actor_sub)
        if not updated:
            raise ApiRequestError(404, "NOT_FOUND", "Contrato alvo nao encontrado para encerramento.")
        text = f"Contrato {updated.get('id')} encerrado com sucesso."
        return _assistant_payload(text, classification, route, context, guardrails)

    raise ApiRequestError(400, "INVALID_BODY", "Tipo de acao pendente nao suportado.", {"actionType": action_type})
