import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';
import { classifyIntent, getChatIntentCatalog, listIntentSuggestions } from './chatIntentsRepo.mjs';
import { buildChatContext } from '../services/chatContextService.mjs';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function getChatBootstrap(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();
  const catalog = getChatIntentCatalog();

  if (dbDialect === 'oracle') {
    try {
      const [overdueRows, alertsRows] = await Promise.all([
        runOracleQuery(`
          select count(1) as TOTAL
          from mart.vw_financial_invoices
          where lower(status) = 'overdue'
            and condominio_id = :condominiumId
        `, { condominiumId }),
        runOracleQuery(`
          select count(1) as TOTAL
          from mart.vw_alerts_operational
          where lower(gravidade) in ('alta', 'critica')
            and condominio_id = :condominiumId
        `, { condominiumId }),
      ]);

      const overdueCount = Number(overdueRows?.[0]?.TOTAL || 0);
      const criticalAlertsCount = Number(alertsRows?.[0]?.TOTAL || 0);

      return {
        welcomeMessage: `Contexto Oracle carregado: ${overdueCount} faturas vencidas e ${criticalAlertsCount} alertas criticos.`,
        catalogVersion: catalog.version,
        suggestions: listIntentSuggestions(3),
      };
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
    }
  }

  const seed = readSeedJson('chat_bootstrap.json');
  return {
    ...seed,
    catalogVersion: catalog.version,
    suggestions: listIntentSuggestions(3),
  };
}

function buildIntentResponse(intentId, context) {
  if (intentId === 'financial_priorities') {
    return `Prioridade financeira: ${context.metrics.overdueInvoices} faturas vencidas e ${context.metrics.pendingInvoices} pendentes. Recomendo acao imediata nas vencidas e trilha de cobranca para pendentes.`;
  }
  if (intentId === 'critical_alerts') {
    return `Alertas criticos ativos: ${context.metrics.criticalAlerts}. Recomendo validar causa raiz, acionar manutencao e registrar responsavel por cada evento.`;
  }
  if (intentId === 'action_plan') {
    return `Plano de acao 24h: (1) tratar ${context.metrics.criticalAlerts} alertas criticos, (2) reduzir ${context.metrics.overdueInvoices} vencidas, (3) revisar ${context.metrics.maintenanceUnits} unidades em manutencao.`;
  }
  if (intentId === 'consumption_anomalies') {
    return `Visao de consumo: ${context.metrics.criticalAlerts} eventos criticos podem impactar telemetria. Priorize unidades em manutencao (${context.metrics.maintenanceUnits}) para reduzir risco de anomalia.`;
  }

  return `Resumo atual: ${context.metrics.overdueInvoices} vencidas, ${context.metrics.pendingInvoices} pendentes, ${context.metrics.criticalAlerts} alertas criticos e ${context.metrics.maintenanceUnits} unidades em manutencao.`;
}

function evaluateGuardrails(message, classification) {
  const normalized = normalizeText(message);
  const outOfScopeTerms = ['futebol', 'jogo', 'receita', 'culinaria', 'filme', 'serie', 'celebridade', 'astrologia', 'loteria', 'piada'];
  const outOfScopeDetected = outOfScopeTerms.some((term) => normalized.includes(term));

  if (outOfScopeDetected) {
    return {
      blocked: true,
      reason: 'OUT_OF_SCOPE',
      policyVersion: 's5-03.v1',
      confidence: classification.confidence,
      message: 'Pergunta fora do escopo operacional do condominio.',
    };
  }

  if (classification.confidence === 'low') {
    return {
      blocked: true,
      reason: 'LOW_CONFIDENCE',
      policyVersion: 's5-03.v1',
      confidence: classification.confidence,
      message: 'Confianca insuficiente para responder com seguranca. Reformule com contexto de alertas, consumo, faturas ou gestao.',
    };
  }

  return {
    blocked: false,
    reason: null,
    policyVersion: 's5-03.v1',
    confidence: classification.confidence,
    message: null,
  };
}

export async function askChat(message, condominiumId = 1) {
  const classification = classifyIntent(message);
  const context = await buildChatContext(condominiumId);
  const guardrails = evaluateGuardrails(message, classification);
  const text = guardrails.blocked
    ? guardrails.message
    : buildIntentResponse(classification.intentId, context);

  return {
    id: `bot-${Date.now()}`,
    role: 'assistant',
    text,
    time: nowTime(),
    intentId: classification.intentId,
    confidence: classification.confidence,
    promptCatalogVersion: classification.catalogVersion,
    sources: context.sources,
    limitations: 'Resposta automatica com base no contexto operacional atual; confirme casos criticos com responsavel tecnico.',
    guardrails: {
      blocked: guardrails.blocked,
      reason: guardrails.reason,
      policyVersion: guardrails.policyVersion,
    },
  };
}
