import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';

function toISODate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function getInvoicesData(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();

  if (dbDialect === 'oracle') {
    try {
      const rows = await runOracleQuery(`
        select
          fatura_id,
          condominio_id,
          unidade,
          morador,
          referencia,
          vencimento,
          amount,
          status
        from mart.vw_financial_invoices
        where condominio_id = :condominiumId
        fetch first 200 rows only
      `, { condominiumId });

      if (rows) {
        return {
          items: rows.map((row) => ({
            id: String(row.FATURA_ID),
            condominiumId: Number(row.CONDOMINIO_ID || 0) || null,
            unit: row.UNIDADE,
            resident: row.MORADOR,
            reference: row.REFERENCIA,
            dueDate: toISODate(row.VENCIMENTO),
            amount: Number(row.AMOUNT || 0),
            status: String(row.STATUS || 'pending').toLowerCase(),
          })),
        };
      }
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
    }
  }

  const seed = readSeedJson('invoices.json');
  return {
    items: seed.items
      .map((item) => ({ ...item, condominiumId: 1 }))
      .filter((item) => item.condominiumId === condominiumId),
  };
}
