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
        f"Alertas abertos    : {m.get('openAlerts', 0)}\n"
        f"Unidades manutencao: {m.get('maintenanceUnits', 0)}\n"
        f"Unidades ocupadas  : {m.get('occupiedUnits', 0)}\n"
        f"Total de unidades  : {m.get('totalUnits', 0)}\n"
        f"Fonte dos dados    : {sources}\n"
        f"Snapshot em        : {context.get('generatedAt', '')}"
    )


def format_context_block(context: dict, domain: str) -> str:
    """Return a domain-relevant detail string for injection into the agent prompt."""
    m = context.get("metrics", {})
    if domain == "financial":
        return (
            f"Resumo financeiro: {m.get('overdueInvoices', 0)} faturas vencidas, "
            f"{m.get('pendingInvoices', 0)} pendentes, {m.get('paidInvoices', 0)} pagas."
        )
    if domain == "alerts":
        return (
            f"Resumo de alertas: {m.get('criticalAlerts', 0)} criticos, "
            f"{m.get('openAlerts', 0)} abertos no total."
        )
    if domain in ("maintenance", "cadastros"):
        return (
            f"Resumo de unidades: {m.get('totalUnits', 0)} unidades, "
            f"{m.get('occupiedUnits', 0)} ocupadas, {m.get('maintenanceUnits', 0)} em manutencao."
        )
    return (
        f"Resumo geral: {m.get('overdueInvoices', 0)} faturas vencidas, "
        f"{m.get('criticalAlerts', 0)} alertas criticos, "
        f"{m.get('maintenanceUnits', 0)} unidades em manutencao."
    )


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
