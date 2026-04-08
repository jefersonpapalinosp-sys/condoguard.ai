"""
Rule-based fallback responses used when the LLM is unavailable.
"""
from __future__ import annotations


def rule_based_response(intent_id: str, context: dict) -> str:
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
