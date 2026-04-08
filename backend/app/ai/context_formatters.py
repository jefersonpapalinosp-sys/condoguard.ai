"""
Context formatting helpers shared between chat_repo.py and agent nodes.
"""
from __future__ import annotations


def format_metrics_block(context: dict) -> str:
    m = context.get("metrics", {})
    sources = ", ".join(context.get("sources", []))
    return (
        f"Faturas vencidas   : {m.get('overdueInvoices', 0)}\n"
        f"Faturas pendentes  : {m.get('pendingInvoices', 0)}\n"
        f"Faturas pagas      : {m.get('paidInvoices', 0)}\n"
        f"Alertas criticos   : {m.get('criticalAlerts', 0)}\n"
        f"Alertas warning    : {m.get('warningAlerts', 0)}\n"
        f"Alertas abertos    : {m.get('openAlerts', 0)}\n"
        f"Unidades manutencao: {m.get('maintenanceUnits', 0)}\n"
        f"Unidades ocupadas  : {m.get('occupiedUnits', 0)}\n"
        f"Total de unidades  : {m.get('totalUnits', 0)}\n"
        f"Fonte dos dados    : {sources}\n"
        f"Snapshot em        : {context.get('generatedAt', '')}"
    )


def _fmt_invoice(inv: dict) -> str:
    amount = float(inv.get("amount") or 0)
    return (
        f"  • Unidade {inv.get('unit','?')} | {inv.get('resident','N/A')} | "
        f"R$ {amount:.2f} | Venc. {inv.get('dueDate','?')} | Ref. {inv.get('reference','?')}"
    )


def _fmt_alert(a: dict) -> str:
    desc = (a.get("description") or "").strip()[:100]
    base = f"  • [{a.get('severity','?').upper()}] {a.get('title','Alerta')} ({a.get('time','?')})"
    return f"{base}\n    {desc}" if desc else base


def _fmt_unit(u: dict) -> str:
    return f"  • {u.get('unitCode','?')} | {u.get('resident','N/A')} | Andar {u.get('floor','?')}"


def format_context_block(context: dict, domain: str) -> str:
    """Return a domain-relevant detail string with real item data for injection into the agent prompt."""
    m = context.get("metrics", {})
    detail = context.get("detail", {})

    if domain == "financial":
        lines = [
            f"Financeiro: {m.get('overdueInvoices',0)} faturas vencidas, "
            f"{m.get('pendingInvoices',0)} pendentes, {m.get('paidInvoices',0)} pagas."
        ]
        if detail.get("overdueInvoices"):
            lines.append("Faturas vencidas (top 5):")
            lines.extend(_fmt_invoice(i) for i in detail["overdueInvoices"])
        if detail.get("pendingInvoices"):
            lines.append("Faturas pendentes (top 5):")
            lines.extend(_fmt_invoice(i) for i in detail["pendingInvoices"])
        return "\n".join(lines)

    if domain == "alerts":
        lines = [
            f"Alertas: {m.get('criticalAlerts',0)} criticos, "
            f"{m.get('warningAlerts',0)} warnings, {m.get('openAlerts',0)} abertos."
        ]
        if detail.get("criticalAlerts"):
            lines.append("Alertas criticos ativos:")
            lines.extend(_fmt_alert(a) for a in detail["criticalAlerts"])
        if detail.get("warningAlerts"):
            lines.append("Alertas de aviso:")
            lines.extend(_fmt_alert(a) for a in detail["warningAlerts"])
        return "\n".join(lines)

    if domain in ("maintenance", "cadastros"):
        lines = [
            f"Unidades: {m.get('totalUnits',0)} total, "
            f"{m.get('occupiedUnits',0)} ocupadas, {m.get('maintenanceUnits',0)} em manutencao."
        ]
        if detail.get("maintenanceUnits"):
            lines.append("Unidades em manutencao:")
            lines.extend(_fmt_unit(u) for u in detail["maintenanceUnits"])
        return "\n".join(lines)

    # General — include all relevant detail
    lines = [
        f"Resumo: {m.get('overdueInvoices',0)} faturas vencidas, "
        f"{m.get('criticalAlerts',0)} alertas criticos, "
        f"{m.get('maintenanceUnits',0)} unidades em manutencao, "
        f"{m.get('totalUnits',0)} unidades no total."
    ]
    for inv in detail.get("overdueInvoices", [])[:3]:
        lines.append(f"Fatura vencida: {_fmt_invoice(inv).strip()}")
    for a in detail.get("criticalAlerts", [])[:3]:
        lines.append(f"Alerta critico: {_fmt_alert(a).strip()}")
    for u in detail.get("maintenanceUnits", [])[:2]:
        lines.append(f"Em manutencao: {_fmt_unit(u).strip()}")
    return "\n".join(lines)


def format_rag_context(rag_docs: list[dict]) -> str:
    """Format retrieved RAG documents for injection into the prompt."""
    if not rag_docs:
        return "Nenhuma referencia adicional disponivel."
    parts = []
    for i, doc in enumerate(rag_docs, 1):
        source = doc.get("source", "knowledge_base")
        content = doc.get("content", "")
        parts.append(f"[{i}] Fonte: {source}\n{content}")
    return "\n\n".join(parts)


def format_rag_sources(rag_docs: list[dict]) -> list[str]:
    """Return a deduplicated list of source names from RAG docs."""
    seen: set[str] = set()
    result = []
    for doc in rag_docs:
        src = doc.get("source", "")
        if src and src not in seen:
            seen.add(src)
            result.append(src)
    return result
