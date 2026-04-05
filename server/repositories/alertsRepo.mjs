import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';

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
  }

  return String(value).slice(0, 240) || fallback;
}

export async function getAlertsData(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();

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
        const items = rows.map((row) => ({
          id: String(row.ALERT_ID),
          condominiumId: Number(row.CONDOMINIO_ID || 0) || null,
          severity: mapSeverity(row.GRAVIDADE),
          title: normalizeAlertText(row.TIPO_ANOMALIA, 'anomalia detectada').replaceAll('_', ' '),
          description: normalizeAlertText(row.DESCRICAO_ANOMALIA, 'Anomalia detectada automaticamente'),
          time: formatRelative(row.DATA_DETECTADA),
        }));

        return { activeCount: items.length, items };
      }
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
    }
  }

  const seed = readSeedJson('alerts.json');
  const items = seed.items
    .map((item) => ({ ...item, condominiumId: 1 }))
    .filter((item) => item.condominiumId === condominiumId);
  return { activeCount: items.length, items };
}
