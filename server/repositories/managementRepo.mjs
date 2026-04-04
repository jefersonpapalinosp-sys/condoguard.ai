import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';

export async function getManagementUnitsData() {
  const { dbDialect } = getServerConfig();

  if (dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(`
        select
          unidade_id,
          bloco,
          numero_unidade,
          morador,
          status,
          updated_at
        from mart.vw_management_units
        fetch first 300 rows only
      `);

      if (rows) {
        return {
          units: rows.map((row) => ({
            id: `u-${row.UNIDADE_ID}`,
            block: row.BLOCO,
            unit: row.NUMERO_UNIDADE,
            resident: row.MORADOR,
            status: String(row.STATUS || 'vacant').toLowerCase(),
            lastUpdate: 'Agora',
          })),
        };
      }
    } catch {
      // fallback below
    }
  }

  return readSeedJson('management_units.json');
}
