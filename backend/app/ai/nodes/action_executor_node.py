"""
action_executor_node — executes transactional actions requested via chat.

Supported actions:
  - invoice_mark_paid   → marks an invoice as paid
  - alert_mark_read     → marks an alert as read
  - contract_renew      → initiates contract renewal
"""
from __future__ import annotations

import logging

from app.ai.graph_state import AgentState

_log = logging.getLogger(__name__)

_ACTION_LABELS = {
    "invoice_mark_paid": "Fatura marcada como paga",
    "alert_mark_read": "Alerta marcado como lido",
    "contract_renew": "Renovacao de contrato iniciada",
}


def _missing_entity_response(action: str, entity_key: str) -> dict:
    entity_hints = {
        "invoiceId": "o ID da fatura (ex: inv-001)",
        "alertId": "o ID do alerta (ex: a1)",
        "contractId": "o ID do contrato (ex: ct1)",
    }
    hint = entity_hints.get(entity_key, "o identificador necessario")
    return {
        "type": action,
        "status": "missing_entity",
        "entity": None,
        "message": f"Para executar esta acao, informe {hint}.",
    }


async def action_executor_node(state: AgentState) -> dict:
    route = state.get("route") or {}
    action = route.get("action", "")
    entities = route.get("entities") or {}
    condominium_id = state.get("condominium_id", 1)

    # Resolve the actor from session_id if available (best-effort)
    actor_sub = state.get("session_id") or None

    try:
        if action == "invoice_mark_paid":
            invoice_id = entities.get("invoiceId")
            if not invoice_id:
                return {"action_result": _missing_entity_response(action, "invoiceId"), "ai_powered": False}

            from app.repositories.invoices_repo import mark_invoice_as_paid  # noqa: PLC0415
            result = await mark_invoice_as_paid(condominium_id, invoice_id, actor_sub)
            if result:
                return {
                    "action_result": {
                        "type": action,
                        "status": "success",
                        "entity": invoice_id,
                        "message": f"Fatura {invoice_id} marcada como paga com sucesso.",
                        "data": result,
                    },
                    "ai_powered": False,
                    "agent_name": "Agente Financeiro",
                    "agent_response": f"✅ Fatura {invoice_id} marcada como paga.",
                }
            return {
                "action_result": {
                    "type": action,
                    "status": "not_found",
                    "entity": invoice_id,
                    "message": f"Fatura {invoice_id} nao encontrada ou ja esta paga.",
                },
                "ai_powered": False,
                "agent_name": "Agente Financeiro",
                "agent_response": f"Nao foi possivel encontrar a fatura {invoice_id}.",
            }

        if action == "alert_mark_read":
            alert_id = entities.get("alertId")
            if not alert_id:
                return {"action_result": _missing_entity_response(action, "alertId"), "ai_powered": False}

            from app.repositories.alerts_repo import mark_alert_as_read  # noqa: PLC0415
            result = await mark_alert_as_read(condominium_id, alert_id, actor_sub)
            if result:
                return {
                    "action_result": {
                        "type": action,
                        "status": "success",
                        "entity": alert_id,
                        "message": f"Alerta {alert_id} marcado como lido.",
                        "data": result,
                    },
                    "ai_powered": False,
                    "agent_name": "Agente de Alertas",
                    "agent_response": f"✅ Alerta {alert_id} marcado como lido.",
                }
            return {
                "action_result": {
                    "type": action,
                    "status": "not_found",
                    "entity": alert_id,
                    "message": f"Alerta {alert_id} nao encontrado.",
                },
                "ai_powered": False,
                "agent_name": "Agente de Alertas",
                "agent_response": f"Nao foi possivel encontrar o alerta {alert_id}.",
            }

        if action == "contract_renew":
            contract_id = entities.get("contractId")
            if not contract_id:
                return {"action_result": _missing_entity_response(action, "contractId"), "ai_powered": False}

            from app.repositories.contracts_management_repo import renew_contract_data  # noqa: PLC0415
            result = await renew_contract_data(condominium_id, contract_id, actor_sub)
            if result:
                return {
                    "action_result": {
                        "type": action,
                        "status": "success",
                        "entity": contract_id,
                        "message": f"Renovacao do contrato {contract_id} iniciada com sucesso.",
                        "data": {"renewalStatus": result.get("renewalStatus")},
                    },
                    "ai_powered": False,
                    "agent_name": "Agente de Gestao",
                    "agent_response": f"✅ Renovacao do contrato {contract_id} iniciada.",
                }
            return {
                "action_result": {
                    "type": action,
                    "status": "not_found",
                    "entity": contract_id,
                    "message": f"Contrato {contract_id} nao encontrado.",
                },
                "ai_powered": False,
                "agent_name": "Agente de Gestao",
                "agent_response": f"Nao foi possivel encontrar o contrato {contract_id}.",
            }

    except Exception as exc:
        _log.error("action_executor falhou para action=%s: %s", action, exc)
        return {
            "action_result": {
                "type": action,
                "status": "error",
                "entity": None,
                "message": "Erro interno ao executar a acao. Tente novamente.",
            },
            "ai_powered": False,
            "agent_response": "Ocorreu um erro ao executar a acao solicitada.",
        }

    # Fallback — unknown transactional action
    return {
        "action_result": {
            "type": action,
            "status": "unsupported",
            "entity": None,
            "message": f"Acao '{action}' nao suportada por ferramentas de execucao.",
        },
        "ai_powered": False,
    }
