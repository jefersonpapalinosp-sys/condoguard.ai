"""
Rule-based fallback responses used when the LLM is unavailable.

These responses use the full context detail (actual item lists) so they remain
useful and specific even without the LLM.
"""
from __future__ import annotations

import unicodedata


def _norm(text: str) -> str:
    text = (text or "").lower().strip()
    text = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def _fmt_invoice(inv: dict) -> str:
    amount = float(inv.get("amount") or 0)
    return (
        f"  • Unidade {inv.get('unit','?')} — {inv.get('resident','N/A')} — "
        f"R$ {amount:.2f} (venc. {inv.get('dueDate','?')})"
    )


def _fmt_alert(a: dict) -> str:
    desc = (a.get("description") or "").strip()
    base = f"  • {a.get('title','Alerta')} ({a.get('time','?')})"
    return f"{base}: {desc[:80]}" if desc else base


def _fmt_unit(u: dict) -> str:
    return f"  • {u.get('unitCode','?')} — {u.get('resident','N/A')} — Andar {u.get('floor','?')}"


def rule_based_response(intent_id: str, context: dict, question: str = "") -> str:
    """
    Generate a smart, contextual response from live operational data
    when the LLM is unavailable.
    """
    m = context.get("metrics", {})
    detail = context.get("detail", {})
    q = _norm(question)

    overdue = m.get("overdueInvoices", 0)
    pending = m.get("pendingInvoices", 0)
    paid = m.get("paidInvoices", 0)
    critical = m.get("criticalAlerts", 0)
    warning = m.get("warningAlerts", 0)
    open_alerts = m.get("openAlerts", 0)
    maintenance = m.get("maintenanceUnits", 0)
    occupied = m.get("occupiedUnits", 0)
    total_units = m.get("totalUnits", 0)

    # ── Detect intent from question text when intent_id is generic ──────────
    if intent_id == "general_overview" and q:
        if any(kw in q for kw in ["fatura", "vencid", "pendente", "inadimpl", "pagamento", "cobran"]):
            intent_id = "invoices_overview"
        elif any(kw in q for kw in ["alerta", "critico", "incidente", "urgente", "risco"]):
            intent_id = "critical_alerts"
        elif any(kw in q for kw in ["manutencao", "unidade", "ocupad", "status", "gestao"]):
            intent_id = "maintenance_overview"
        elif any(kw in q for kw in ["consumo", "energia", "agua", "telemetria"]):
            intent_id = "consumption_overview"
        elif any(kw in q for kw in ["ola", "oi", "bom dia", "boa tarde", "boa noite", "teste", "tudo bem", "tudo bom", "como vai"]):
            intent_id = "greeting"
        elif any(kw in q for kw in ["contrato", "fornecedor", "reajuste", "prestador"]):
            intent_id = "contracts_overview"
        elif any(kw in q for kw in ["resumo", "geral", "visao", "situacao", "como esta"]):
            intent_id = "action_plan"

    # ── Greeting / test message ──────────────────────────────────────────────
    if intent_id == "greeting":
        lines = [
            "Ola! Sou o Atlas Assist, seu assistente de gestao condominial.",
            f"Situacao atual: {overdue} faturas vencidas, {critical} alertas criticos, "
            f"{maintenance} unidades em manutencao.",
            "\nPosso ajudar com faturas, alertas, consumo, contratos e gestao de unidades. "
            "O que deseja consultar?",
        ]
        return "\n".join(lines)

    # ── Financial / Invoices ────────────────────────────────────────────────
    if intent_id in ("financial_priorities", "invoices_overview", "invoice_mark_paid"):
        lines = [f"Faturas: {overdue} vencidas, {pending} pendentes, {paid} pagas."]
        overdue_items = detail.get("overdueInvoices", [])
        if overdue_items:
            lines.append("\nFaturas vencidas:")
            lines.extend(_fmt_invoice(i) for i in overdue_items)
        pending_items = detail.get("pendingInvoices", [])
        if pending_items and not overdue_items:
            lines.append("\nFaturas pendentes (proximas):")
            lines.extend(_fmt_invoice(i) for i in pending_items[:3])
        if overdue:
            lines.append(f"\nAcao recomendada: iniciar cobranca nas {overdue} faturas vencidas.")
        elif not overdue and not pending:
            lines.append("\nNenhuma fatura vencida ou pendente. Situacao financeira em dia.")
        return "\n".join(lines)

    # ── Alerts ───────────────────────────────────────────────────────────────
    if intent_id in ("critical_alerts", "alerts_overview", "alert_mark_read"):
        lines = [f"Alertas: {critical} criticos, {warning} avisos, {open_alerts} abertos no total."]
        critical_items = detail.get("criticalAlerts", [])
        if critical_items:
            lines.append("\nAlertas criticos ativos:")
            lines.extend(_fmt_alert(a) for a in critical_items)
        warning_items = detail.get("warningAlerts", [])
        if warning_items and not critical_items:
            lines.append("\nAvisos ativos:")
            lines.extend(_fmt_alert(a) for a in warning_items[:3])
        if critical:
            lines.append(f"\nAcao recomendada: acionar equipe de manutencao para os {critical} alertas criticos.")
        elif not open_alerts:
            lines.append("\nNenhum alerta aberto. Operacao estavel.")
        return "\n".join(lines)

    # ── Contracts ────────────────────────────────────────────────────────────
    if intent_id == "contracts_overview":
        lines = ["Gestao de contratos disponivel no modulo Contratos."]
        lines.append("Acesse a aba Contratos para ver fornecedores, reajustes proximos e contratos de alto risco.")
        return "\n".join(lines)

    # ── Maintenance / Management ─────────────────────────────────────────────
    if intent_id in ("maintenance_overview", "cadastros_overview"):
        lines = [
            f"Unidades: {total_units} total, {occupied} ocupadas, {maintenance} em manutencao."
        ]
        maint_items = detail.get("maintenanceUnits", [])
        if maint_items:
            lines.append("\nUnidades em manutencao:")
            lines.extend(_fmt_unit(u) for u in maint_items)
        if maintenance:
            lines.append(f"\nVerifique prazo de conclusao das {maintenance} unidades em manutencao.")
        return "\n".join(lines)

    # ── Consumption ──────────────────────────────────────────────────────────
    if intent_id in ("consumption_overview", "consumption_anomalies"):
        lines = ["Dados de consumo e telemetria disponiveis no modulo Consumo."]
        if critical:
            lines.append(
                f"{critical} alertas criticos podem impactar leituras de consumo. "
                "Verifique anomalias nas unidades afetadas."
            )
        if not critical:
            lines.append(
                "Acesse o modulo Consumo para ver graficos de energia, agua e gas "
                "com comparativo de metas por unidade."
            )
        return "\n".join(lines)

    # ── Action plan ──────────────────────────────────────────────────────────
    if intent_id == "action_plan":
        lines = ["Resumo e plano de acao prioritario:"]
        priority = 1
        if critical:
            lines.append(f"{priority}. Resolver {critical} alertas criticos — acionar manutencao imediatamente.")
            priority += 1
        if overdue:
            lines.append(f"{priority}. Cobrar {overdue} faturas vencidas — notificar moradores.")
            priority += 1
        if maintenance:
            lines.append(f"{priority}. Revisar {maintenance} unidades em manutencao — verificar prazo de conclusao.")
            priority += 1
        if warning:
            lines.append(f"{priority}. Monitorar {warning} alertas de aviso antes que se tornem criticos.")
        if priority == 1:
            lines.append("Nenhuma acao urgente identificada. Operacao normal.")
        return "\n".join(lines)

    # ── Default: comprehensive summary ──────────────────────────────────────
    lines = ["Resumo operacional do condominio:"]
    if overdue:
        lines.append(f"  • {overdue} faturas vencidas (cobranca necessaria)")
    if pending:
        lines.append(f"  • {pending} faturas pendentes")
    if paid:
        lines.append(f"  • {paid} faturas pagas")
    if critical:
        lines.append(f"  • {critical} alertas criticos (atencao imediata)")
    if warning:
        lines.append(f"  • {warning} alertas de aviso")
    if maintenance:
        lines.append(f"  • {maintenance} unidades em manutencao")
    lines.append(f"\nTotal de unidades: {total_units} ({occupied} ocupadas).")
    lines.append(
        "Consulte faturas, alertas, consumo ou gestao de unidades para detalhes especificos."
    )
    return "\n".join(lines)
