import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';
import { recordApiFallbackMetric } from '../observability/metricsStore.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ALERT_READS_FILE = path.join(__dirname, '..', 'data', 'alerts_reads_state.json');

function formatRelative(dateValue) {
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return 'recentemente';
  const diffHours = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 3600000));
  if (diffHours < 1) return 'agora';
  if (diffHours < 24) return `${diffHours} h atras`;
  return `${Math.floor(diffHours / 24)} d atras`;
}

function mapSeverity(level) {
  const g = String(level || '').toLowerCase();
  if (g === 'alta' || g === 'critica') return 'critical';
  if (g === 'media') return 'warning';
  return 'info';
}

function normalizeAlertText(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw || raw === '[object Object]') {
      return fallback;
    }

    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const candidate = parsed.description || parsed.descricao || parsed.message || parsed.mensagem || parsed.title || parsed.titulo;
          if (candidate) {
            return String(candidate).slice(0, 240);
          }
        }
      } catch {}
    }

    return raw.slice(0, 240);
  }

  if (typeof value === 'object') {
    const candidate = value.description || value.descricao || value.message || value.mensagem || value.title || value.titulo;
    if (candidate) {
      return String(candidate).slice(0, 240);
    }
    return fallback;
  }

  const scalar = String(value).trim();
  if (!scalar || scalar === '[object Object]') {
    return fallback;
  }
  return scalar.slice(0, 240);
}

async function readReadsState() {
  try {
    const raw = await readFile(ALERT_READS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch (error) {
    if (String(error?.code || '') === 'ENOENT') {
      return {};
    }
    return {};
  }
}

async function writeReadsState(state) {
  await writeFile(ALERT_READS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function applyReadState(items, condominiumId, readsState) {
  const tenantKey = String(condominiumId);
  const tenantState = readsState?.[tenantKey] || {};

  return items.map((item) => {
    const readState = tenantState[String(item.id)] || null;
    const read = Boolean(readState?.read);
    const readAt = readState?.readAt || null;
    const readBy = readState?.readBy || null;
    return {
      ...item,
      status: read ? 'read' : 'active',
      read,
      readAt,
      readBy,
    };
  });
}

export async function getAlertsData(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();
  const readsState = await readReadsState();

  if (dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(`
        select
          alert_id,
          condominio_id,
          data_detectada,
          tipo_anomalia,
          descricao_anomalia,
          gravidade
        from mart.vw_alerts_operational
        where condominio_id = :condominiumId
        order by data_detectada desc
        fetch first 50 rows only
      `, { condominiumId });

      if (rows) {
        const baseItems = rows.map((row) => ({
          id: String(row.ALERT_ID),
          condominiumId: Number(row.CONDOMINIO_ID || 0) || null,
          severity: mapSeverity(row.GRAVIDADE),
          title: normalizeAlertText(row.TIPO_ANOMALIA, 'anomalia detectada').replaceAll('_', ' '),
          description: normalizeAlertText(row.DESCRICAO_ANOMALIA, 'Anomalia detectada automaticamente'),
          time: formatRelative(row.DATA_DETECTADA),
        }));
        const items = applyReadState(baseItems, condominiumId, readsState);

        return { activeCount: items.filter((item) => item.status === 'active').length, items };
      }
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
      recordApiFallbackMetric('alerts', 'oracle_fallback_seed');
    }
  }

  const seed = readSeedJson('alerts.json');
  const baseItems = seed.items
    .map((item) => ({ ...item, condominiumId: 1 }))
    .filter((item) => item.condominiumId === condominiumId);
  const items = applyReadState(baseItems, condominiumId, readsState);
  return { activeCount: items.filter((item) => item.status === 'active').length, items };
}

export async function markAlertAsRead(condominiumId = 1, alertId, actorSub = null) {
  const payload = await getAlertsData(condominiumId);
  const exists = payload.items.some((item) => String(item.id) === String(alertId));
  if (!exists) {
    return null;
  }

  const state = await readReadsState();
  const tenantKey = String(condominiumId);
  state[tenantKey] = state[tenantKey] || {};
  state[tenantKey][String(alertId)] = {
    read: true,
    readAt: new Date().toISOString(),
    readBy: actorSub || null,
  };
  await writeReadsState(state);

  const refreshed = await getAlertsData(condominiumId);
  return refreshed.items.find((item) => String(item.id) === String(alertId)) || null;
}
