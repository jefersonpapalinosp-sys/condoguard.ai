import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';
import { recordApiFallbackMetric } from '../observability/metricsStore.mjs';

export async function getManagementUnitsData(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();

  if (dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(`
        select
          condominio_id,
          unidade_id,
          bloco,
          numero_unidade,
          morador,
          status,
          updated_at
        from mart.vw_management_units
        where condominio_id = :condominiumId
        fetch first 300 rows only
      `, { condominiumId });

      if (rows) {
        return {
          units: rows.map((row) => ({
            id: `u-${row.UNIDADE_ID}`,
            condominiumId: Number(row.CONDOMINIO_ID || 0) || null,
            block: row.BLOCO,
            unit: row.NUMERO_UNIDADE,
            resident: row.MORADOR,
            status: String(row.STATUS || 'vacant').toLowerCase(),
            lastUpdate: 'Agora',
          })),
        };
      }
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
      recordApiFallbackMetric('management', 'oracle_fallback_seed');
    }
  }

  const seed = readSeedJson('management_units.json');
  return {
    units: seed.units
      .map((item) => ({ ...item, condominiumId: 1 }))
      .filter((item) => item.condominiumId === condominiumId),
  };
}
