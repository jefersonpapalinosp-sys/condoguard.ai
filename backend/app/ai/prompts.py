"""
ChatPromptTemplate definitions — one per agent domain, all in PT-BR.

Variables injected into each template:
  {metrics_block}   — formatted KPI summary string
  {context_block}   — domain-relevant detail (invoices, alerts, etc.)
  {rag_context}     — retrieved knowledge-base chunks (Sprint 3+; defaults to empty)
  {history}         — MessagesPlaceholder for conversation memory
  {question}        — the user's current message
"""
from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

_BASE_DIRECTIVES = """
DIRETRIZES:
1. Responda APENAS sobre gestao de condominios. Para temas fora do escopo recuse de forma educada e breve.
2. Baseie respostas nos dados acima — cite numeros reais quando relevante.
3. Seja objetivo e profissional em portugues brasileiro. Maximo 3 paragrafos curtos.
4. Quando houver alertas criticos ou faturas vencidas, destaque e priorize.
5. Respostas devem ser acionaveis: sugira proximos passos concretos.
6. Nao invente dados que nao estejam no contexto fornecido.
{rag_section}"""

_RAG_SECTION = """
REFERENCIAS DA BASE DE CONHECIMENTO:
{rag_context}"""

_METRICS_SECTION = """
DADOS OPERACIONAIS EM TEMPO REAL:
{metrics_block}

CONTEXTO DETALHADO:
{context_block}"""


def _build_system(persona: str) -> str:
    return (
        persona
        + _METRICS_SECTION
        + _BASE_DIRECTIVES.format(rag_section=_RAG_SECTION)
    )


FINANCIAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente Financeiro do CondoGuard, especialista em gestao financeira de condominios.\n"
        "Seu foco: faturas, inadimplencia, cobrancas, fluxo de caixa e relatorios financeiros.\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

ALERTS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente de Alertas Operacionais do CondoGuard, especialista em gestao de incidentes e riscos.\n"
        "Seu foco: alertas criticos, incidentes, manutencao corretiva e gestao de riscos operacionais.\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

CONSUMPTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente de Consumo e Telemetria do CondoGuard, especialista em analise de consumo.\n"
        "Seu foco: energia, agua, anomalias de telemetria, metas de consumo e eficiencia energetica.\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

MAINTENANCE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente de Gestao e Manutencao do CondoGuard, especialista em unidades e contratos.\n"
        "Seu foco: manutencao preventiva, gestao de unidades, contratos com fornecedores e cadastros.\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

GENERAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o CondoGuard Copiloto, assistente geral especializado em gestao de condominios.\n"
        "Ajude sindicos, administradores e moradores com financeiro, alertas, consumo e gestao.\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

DOMAIN_PROMPTS: dict[str, ChatPromptTemplate] = {
    "financial": FINANCIAL_PROMPT,
    "alerts": ALERTS_PROMPT,
    "consumption": CONSUMPTION_PROMPT,
    "maintenance": MAINTENANCE_PROMPT,
    "general": GENERAL_PROMPT,
}

# Maps the domain strings from chat_agent_router to prompt keys
DOMAIN_ROUTER_MAP: dict[str, str] = {
    "financeiro": "financial",
    "financial": "financial",
    "alertas": "alerts",
    "alerts": "alerts",
    "consumo": "consumption",
    "consumption": "consumption",
    "contratos": "maintenance",
    "cadastros": "maintenance",
    "maintenance": "maintenance",
    "geral": "general",
    "general": "general",
}


def resolve_domain(raw_domain: str) -> str:
    """Normalize router domain string to a prompt key."""
    return DOMAIN_ROUTER_MAP.get(raw_domain, "general")
