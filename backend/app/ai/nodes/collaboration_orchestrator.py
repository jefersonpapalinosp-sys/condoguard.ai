"""
Collaboration orchestrator node.

Runs multiple specialist agents for multi-domain questions and synthesizes
one consolidated answer.
"""
from __future__ import annotations

import asyncio
import logging

from app.ai.fallback import rule_based_response
from app.ai.graph_state import AgentState
from app.ai.nodes.agents.alerts_agent import alerts_agent_node
from app.ai.nodes.agents.consumption_agent import consumption_agent_node
from app.ai.nodes.agents.financial_agent import financial_agent_node
from app.ai.nodes.agents.general_agent import general_agent_node
from app.ai.nodes.agents.maintenance_agent import maintenance_agent_node
from app.ai.prompts import resolve_domain
from app.observability.metrics_store import record_api_fallback_metric

_log = logging.getLogger(__name__)

ORCHESTRATOR_NAME = "Orquestrador Multiagente"

DOMAIN_HANDLERS = {
    "financial": financial_agent_node,
    "alerts": alerts_agent_node,
    "consumption": consumption_agent_node,
    "maintenance": maintenance_agent_node,
    "general": general_agent_node,
}


def _build_collaboration_text(contributors: list[dict]) -> str:
    lines = ["Analise multiagente consolidada:"]
    for item in contributors:
        name = item.get("agentName", "Agente")
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        lines.append(f"- {name}: {text}")

    if len(lines) == 1:
        return "Nao foi possivel consolidar respostas especializadas no momento."
    return "\n".join(lines)


def _select_domains(route: dict) -> list[str]:
    raw_domains = route.get("multiDomains") or []
    selected: list[str] = []
    for raw in raw_domains:
        normalized = resolve_domain(str(raw))
        if normalized not in selected:
            selected.append(normalized)

    if not selected:
        selected = [resolve_domain(str(route.get("domain", "general")))]

    # Keep fan-out bounded for latency/cost control.
    return selected[:3]


async def collaboration_orchestrator_node(state: AgentState) -> dict:
    route = state.get("route") or {}
    domains = _select_domains(route)

    tasks = []
    for domain in domains:
        handler = DOMAIN_HANDLERS.get(domain, general_agent_node)
        scoped_route = dict(route)
        scoped_route["domain"] = domain
        scoped_state = {**state, "route": scoped_route}
        tasks.append(handler(scoped_state))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    contributors: list[dict] = []
    ai_powered = False

    for domain, result in zip(domains, results, strict=False):
        if isinstance(result, Exception):
            _log.error("multiagent contributor failed for domain=%s: %s", domain, result)
            record_api_fallback_metric("chat", "multiagent_agent_error")
            contributors.append(
                {
                    "domain": domain,
                    "agentName": f"Agente {domain}",
                    "aiPowered": False,
                    "text": rule_based_response(state.get("classification", {}).get("intentId", "general_overview"), state.get("context", {})),
                }
            )
            continue

        contributor_name = result.get("agent_name") or f"Agente {domain}"
        contributor_text = result.get("agent_response") or ""
        contributor_ai = bool(result.get("ai_powered"))
        ai_powered = ai_powered or contributor_ai
        contributors.append(
            {
                "domain": domain,
                "agentName": contributor_name,
                "aiPowered": contributor_ai,
                "text": contributor_text,
            }
        )

    final_text = _build_collaboration_text(contributors)
    collaboration_meta = {
        "enabled": True,
        "domains": domains,
        "contributors": [
            {
                "domain": item["domain"],
                "agentName": item["agentName"],
                "aiPowered": item["aiPowered"],
            }
            for item in contributors
        ],
    }

    return {
        "agent_response": final_text,
        "agent_name": ORCHESTRATOR_NAME,
        "ai_powered": ai_powered,
        "collaboration": collaboration_meta,
    }
