from __future__ import annotations

from typing import Any


def build_chat_action_plan(route: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    metrics = context.get("metrics", {})
    action = str(route.get("action") or "general_overview")

    if action == "invoice_mark_paid":
        return {
            "goal": "Regularizar inadimplencia sem executar operacao sem validacao humana.",
            "steps": [
                "Identificar a fatura pelo id informado.",
                "Validar se a fatura ainda nao foi quitada.",
                "Solicitar confirmacao antes de marcar como paga.",
            ],
            "nextBestPrompts": [
                "Pagar a fatura inv-5.",
                "Listar faturas vencidas.",
            ],
            "kpis": {
                "pendingInvoices": metrics.get("pendingInvoices"),
                "overdueInvoices": metrics.get("overdueInvoices"),
            },
        }

    if action == "alert_mark_read":
        return {
            "goal": "Fechar ruido operacional e manter rastreabilidade dos incidentes.",
            "steps": [
                "Localizar o alerta no contexto atual.",
                "Solicitar confirmacao para marcar como lido.",
                "Registrar acao com auditoria de usuario.",
            ],
            "nextBestPrompts": [
                "Marcar alerta a9 como lido.",
                "Listar alertas criticos ativos.",
            ],
            "kpis": {
                "criticalAlerts": metrics.get("criticalAlerts"),
                "openAlerts": metrics.get("openAlerts"),
            },
        }

    if action in {"contract_renew", "contract_close"}:
        verb = "renovar" if action == "contract_renew" else "encerrar"
        return {
            "goal": f"Executar acao contratual ({verb}) com controle de risco e aprovacao explicita.",
            "steps": [
                "Localizar contrato alvo por id.",
                "Avaliar status atual e proximidade de vencimento.",
                "Solicitar confirmacao antes da alteracao.",
            ],
            "nextBestPrompts": [
                "Renovar contrato ct2.",
                "Listar contratos vencendo em 90 dias.",
            ],
        }

    if action == "contracts_adjustments_overview":
        return {
            "goal": "Antecipar impacto de reajustes nos custos mensais.",
            "steps": [
                "Consolidar contratos com reajuste previsto.",
                "Comparar valor atual e projetado.",
                "Priorizar contratos com maior impacto financeiro.",
            ],
        }

    if action == "contracts_expiring_overview":
        return {
            "goal": "Reduzir risco de descontinuidade de servicos por vencimento.",
            "steps": [
                "Separar contratos vencidos e em janela 30/60/90 dias.",
                "Sinalizar contratos sem status de renovacao.",
                "Priorizar decisoes de renovacao ou encerramento.",
            ],
        }

    return {
        "goal": "Responder com contexto operacional consolidado do condominio.",
        "steps": [
            "Coletar metricas de financeiro, alertas e operacao.",
            "Gerar leitura executiva objetiva.",
            "Sugerir proximas perguntas de alto valor.",
        ],
        "kpis": {
            "overdueInvoices": metrics.get("overdueInvoices"),
            "criticalAlerts": metrics.get("criticalAlerts"),
            "maintenanceUnits": metrics.get("maintenanceUnits"),
        },
    }
