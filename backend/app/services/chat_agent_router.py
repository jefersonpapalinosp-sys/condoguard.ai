from __future__ import annotations

import re
import unicodedata
from typing import Any


ACTIONABLE_ACTIONS = {
    "invoice_mark_paid",
    "alert_mark_read",
    "contract_renew",
    "contract_close",
}


ACTION_TO_DOMAIN = {
    "invoice_mark_paid": "financeiro",
    "invoices_overview": "financeiro",
    "alert_mark_read": "alertas",
    "alerts_overview": "alertas",
    "consumption_overview": "consumo",
    "contract_renew": "contratos",
    "contract_close": "contratos",
    "contracts_overview": "contratos",
    "contracts_expiring_overview": "contratos",
    "contracts_adjustments_overview": "contratos",
    "contracts_documents_overview": "contratos",
    "cadastros_overview": "cadastros",
    "general_overview": "geral",
}


DOMAIN_KEYWORDS = {
    "financeiro": ["fatura", "inadimpl", "cobranca", "pagamento", "vencid"],
    "alertas": ["alerta", "incidente", "risco", "critico", "urgente"],
    "consumo": ["consumo", "energia", "agua", "telemetria", "anomalia"],
    "contratos": ["contrato", "fornecedor", "reajuste", "vencimento", "renovacao"],
    "cadastros": ["cadastro", "morador", "unidade", "fornecedor", "servico"],
}

MULTI_AGENT_CONJUNCTIONS = [
    " e ",
    "tambem",
    "alem",
    "junto",
    "ao mesmo tempo",
    "simultaneamente",
]


def _normalize(value: str) -> str:
    text = (value or "").lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text


def _has_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def _extract_first(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text)
    return match.group(0) if match else None


def _sorted_domains(domain_scores: dict[str, int]) -> list[str]:
    ranked = sorted(domain_scores.items(), key=lambda item: item[1], reverse=True)
    return [domain for domain, score in ranked if score > 0]


def _should_use_collaborative_mode(action: str, normalized: str, ranked_domains: list[str]) -> bool:
    if action in ACTIONABLE_ACTIONS or len(ranked_domains) < 2:
        return False
    # Require both a multi-domain signal and at least two keyword hits
    has_conjunction = any(marker in normalized for marker in MULTI_AGENT_CONJUNCTIONS)
    return has_conjunction


def route_chat_message(message: str) -> dict[str, Any]:
    normalized = _normalize(message)
    entities = {
        "invoiceId": _extract_first(r"\binv-\d+\b", normalized),
        "alertId": _extract_first(r"\ba\d+\b", normalized),
        "contractId": _extract_first(r"\b(?:ct\d+|ctr-[a-z0-9-]+|seed-\d+)\b", normalized),
        "unit": _extract_first(r"\b[a-z]-\d{2,4}\b", normalized),
    }

    if entities["unit"]:
        entities["unit"] = entities["unit"].upper()

    action = "general_overview"
    # Transactional actions — also handle cases where entity ID sits between keywords
    _inv_paid = (
        _has_any(normalized, ["pagar fatura", "quitar fatura", "baixar fatura", "marcar fatura como paga", "marcar fatura paga"])
        or ("fatura" in normalized and _has_any(normalized, ["como paga", "quitar", "baixar", "marcar paga"]))
        or bool(re.search(r"marcar.{0,30}fatura.{0,30}pag", normalized))
    )
    _alert_read = (
        _has_any(normalized, ["marcar alerta lido", "marcar alerta como lido", "resolver alerta", "fechar alerta"])
        or bool(re.search(r"marcar.{0,30}alerta.{0,30}lido", normalized))
    )
    if _inv_paid:
        action = "invoice_mark_paid"
    elif _alert_read:
        action = "alert_mark_read"
    elif _has_any(normalized, ["renovar contrato", "renovar o contrato", "renovacao do contrato", "renovacao contrato"]):
        action = "contract_renew"
    elif _has_any(normalized, ["encerrar contrato", "encerrar o contrato", "fechar contrato", "cancelar contrato"]):
        action = "contract_close"
    elif "reajuste" in normalized and "contrat" in normalized:
        action = "contracts_adjustments_overview"
    elif _has_any(normalized, ["vencimento", "vencer", "expira", "expirar"]) and "contrat" in normalized:
        action = "contracts_expiring_overview"
    elif "document" in normalized and "contrat" in normalized:
        action = "contracts_documents_overview"
    elif "contrat" in normalized:
        action = "contracts_overview"
    elif "cadastro" in normalized or "morador" in normalized or ("unidade" in normalized and "fatura" not in normalized):
        action = "cadastros_overview"
    elif "fatura" in normalized or "inadimpl" in normalized or "cobranca" in normalized:
        action = "invoices_overview"
    elif "alerta" in normalized or "incidente" in normalized or "risco" in normalized:
        action = "alerts_overview"
    elif "consumo" in normalized or "energia" in normalized or "agua" in normalized:
        action = "consumption_overview"

    domain_scores = {domain: sum(1 for term in terms if term in normalized) for domain, terms in DOMAIN_KEYWORDS.items()}
    detected_domain = max(domain_scores, key=domain_scores.get) if domain_scores else "geral"
    ranked_domains = _sorted_domains(domain_scores)
    primary_domain = ACTION_TO_DOMAIN.get(action) or (detected_domain if domain_scores.get(detected_domain, 0) > 0 else "geral")

    collaborative = _should_use_collaborative_mode(action, normalized, ranked_domains)
    if collaborative:
        multi_domains = ranked_domains[:3]
        if primary_domain not in multi_domains and primary_domain in DOMAIN_KEYWORDS:
            multi_domains = [primary_domain, *multi_domains]
        # keep deterministic order and limit fan-out for latency control
        deduped: list[str] = []
        for domain in multi_domains:
            if domain not in deduped:
                deduped.append(domain)
        multi_domains = deduped[:3]
    else:
        multi_domains = []

    required_entity = {
        "invoice_mark_paid": "invoiceId",
        "alert_mark_read": "alertId",
        "contract_renew": "contractId",
        "contract_close": "contractId",
    }.get(action)

    if action in ACTIONABLE_ACTIONS:
        confidence = "high" if required_entity and entities.get(required_entity) else "medium"
    elif action == "general_overview" and domain_scores.get(detected_domain, 0) == 0:
        confidence = "low"
    else:
        top_score = domain_scores.get(detected_domain, 0)
        if collaborative and len(multi_domains) >= 2:
            confidence = "high"
        else:
            confidence = "high" if top_score >= 3 else "medium"

    return {
        "domain": primary_domain,
        "action": action,
        "mode": "transactional" if action in ACTIONABLE_ACTIONS else ("collaborative" if collaborative else "analytical"),
        "confidence": confidence,
        "requiresConfirmation": action in ACTIONABLE_ACTIONS,
        "entities": entities,
        "multiDomains": multi_domains,
    }
