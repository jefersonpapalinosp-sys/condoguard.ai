import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';

function toISODate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function getInvoicesData() {
  const { dbDialect } = getServerConfig();

  if (dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(`
        select
          fatura_id,
          unidade,
          morador,
          referencia,
          vencimento,
          amount,
          status
        from mart.vw_financial_invoices
        fetch first 200 rows only
      `);

      if (rows) {
        return {
          items: rows.map((row) => ({
            id: String(row.FATURA_ID),
            unit: row.UNIDADE,
            resident: row.MORADOR,
            reference: row.REFERENCIA,
            dueDate: toISODate(row.VENCIMENTO),
            amount: Number(row.AMOUNT || 0),
            status: String(row.STATUS || 'pending').toLowerCase(),
          })),
        };
      }
    } catch {
      // fallback below
    }
  }

  return readSeedJson('invoices.json');
}
