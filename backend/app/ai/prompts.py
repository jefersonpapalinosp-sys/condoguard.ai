"""
ChatPromptTemplate definitions — one per agent domain, all in PT-BR.

Variables injected into each template:
  {metrics_block}   — formatted KPI summary string
  {context_block}   — domain-relevant detail with real item data
  {rag_context}     — retrieved knowledge-base chunks
  {history}         — MessagesPlaceholder for conversation memory
  {question}        — the user's current message
"""
from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

_BASE_DIRECTIVES = """
DIRETRIZES DE RESPOSTA:
1. Leia a pergunta do usuario com ATENCAO e responda DIRETAMENTE ao que foi solicitado.
2. Use os dados operacionais acima — cite numeros e detalhes reais quando relevante.
3. Se o usuario enviar saudacao ou mensagem de teste, apresente-se e mostre um resumo dos dados atuais.
4. Seja objetivo em portugues brasileiro. Maximo 4 paragrafos curtos. Use listas quando houver multiplos itens.
5. Quando houver alertas criticos ou faturas vencidas, DESTAQUE e PRIORIZE com sugestao de acao.
6. Respostas devem ser ACIONAVEIS: sugira proximos passos concretos e especificos.
7. Nao invente dados que nao estejam no contexto fornecido.
8. Nunca responda sobre assuntos fora de gestao condominial.
{rag_section}"""

_RAG_SECTION = """
BASE DE CONHECIMENTO RELEVANTE:
{rag_context}"""

_METRICS_SECTION = """
=== DADOS OPERACIONAIS EM TEMPO REAL ===
{metrics_block}

=== DETALHES DO DOMINIO ===
{context_block}
================================"""


def _build_system(persona: str) -> str:
    return (
        persona
        + _METRICS_SECTION
        + _BASE_DIRECTIVES.format(rag_section=_RAG_SECTION)
    )


FINANCIAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente Financeiro do CondoGuard, especialista em gestao financeira condominial.\n"
        "Dominio: faturas, inadimplencia, cobrancas, pagamentos, fluxo de caixa.\n"
        "Ao responder: identifique faturas vencidas por unidade, moradores inadimplentes e valores em aberto. "
        "Priorize acoes de cobranca para faturas vencidas ha mais tempo.\n\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

ALERTS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente de Alertas Operacionais do CondoGuard, especialista em incidentes e riscos.\n"
        "Dominio: alertas criticos, avisos, incidentes, manutencao corretiva, gestao de riscos.\n"
        "Ao responder: liste alertas criticos ativos por titulo e descricao, avalie urgencia e indique "
        "responsavel sugerido (manutencao, sindico, prestador externo).\n\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

CONSUMPTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente de Consumo e Telemetria do CondoGuard.\n"
        "Dominio: energia eletrica, agua, gas, anomalias de telemetria, eficiencia energetica.\n"
        "Ao responder: correlacione alertas criticos com possivel impacto no consumo, "
        "indique unidades que podem ter anomalias e sugira inspecoes tecnicas.\n\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

MAINTENANCE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o Agente de Gestao e Manutencao do CondoGuard.\n"
        "Dominio: manutencao preventiva e corretiva, gestao de unidades, contratos, cadastros.\n"
        "Ao responder: liste unidades em manutencao com detalhes, sugira prazo de resolucao "
        "e identifique impacto na ocupacao e nos contratos de servico.\n\n"
    )),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])

GENERAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _build_system(
        "Voce e o CondoGuard Copiloto, assistente inteligente de gestao condominial com IA.\n"
        "Voce auxilia sindicos, administradores e moradores em: financeiro, alertas, consumo, "
        "contratos, cadastros e gestao operacional.\n"
        "Ao responder:\n"
        "- Para saudacoes ou testes: apresente-se e resuma os indicadores mais importantes do condominio agora.\n"
        "- Para perguntas especificas: use os dados reais do contexto para responder com precisao.\n"
        "- Para perguntas amplas ('como esta o condominio?'): faca um diagnostico completo priorizando "
        "  situacoes que exigem atencao imediata.\n"
        "- Sempre termine com uma sugestao de acao concreta ou proxima pergunta util.\n\n"
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
