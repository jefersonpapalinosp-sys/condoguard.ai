import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export async function getChatBootstrap(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();

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
        suggestions: [
          {
            id: 'oracle-finance',
            label: 'Resumo financeiro',
            prompt: 'Quais as principais prioridades financeiras com base no Oracle?',
          },
          {
            id: 'oracle-alerts',
            label: 'Alertas criticos',
            prompt: 'Liste os alertas criticos e recomendacoes operacionais.',
          },
          {
            id: 'oracle-action-plan',
            label: 'Plano de acao',
            prompt: 'Monte um plano de acao com foco em inadimplencia e risco operacional.',
          },
        ],
      };
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
    }
  }

  return readSeedJson('chat_bootstrap.json');
}

export async function askChat(message) {
  const m = String(message || '').toLowerCase();
  let text = 'Posso aprofundar esse ponto com dados financeiros, operacionais e de consumo.';

  if (m.includes('alerta')) text = 'Temos alertas criticos pendentes no momento.';
  if (m.includes('consumo')) text = 'Consumo medio abaixo da meta no periodo atual.';
  if (m.includes('fatura') || m.includes('inadimpl')) text = 'Existem faturas pendentes e vencidas para revisao.';

  return {
    id: `bot-${Date.now()}`,
    role: 'assistant',
    text,
    time: nowTime(),
  };
}
