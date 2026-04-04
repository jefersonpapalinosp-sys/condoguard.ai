import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';

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

export async function getAlertsData() {
  const { dbDialect } = getServerConfig();

  if (dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(`
        select
          alert_id,
          data_detectada,
          tipo_anomalia,
          descricao_anomalia,
          gravidade
        from mart.vw_alerts_operational
        order by data_detectada desc
        fetch first 50 rows only
      `);

      if (rows) {
        const items = rows.map((row) => ({
          id: String(row.ALERT_ID),
          severity: mapSeverity(row.GRAVIDADE),
          title: String(row.TIPO_ANOMALIA || 'anomalia detectada').replaceAll('_', ' '),
          description: String(row.DESCRICAO_ANOMALIA || 'Anomalia detectada automaticamente').slice(0, 240),
          time: formatRelative(row.DATA_DETECTADA),
        }));

        return { activeCount: items.length, items };
      }
    } catch {
      // fallback below
    }
  }

  return readSeedJson('alerts.json');
}
