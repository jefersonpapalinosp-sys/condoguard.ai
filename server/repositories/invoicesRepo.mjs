import { readSeedJson } from '../utils/seedLoader.mjs';
import { runOracleQuery } from '../db/oracleClient.mjs';
import { getServerConfig } from '../config/env.mjs';
import { createOracleUnavailableError } from '../errors/oracleErrors.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INVOICE_STATUS_FILE = path.join(__dirname, '..', 'data', 'invoices_status_state.json');

function toISODate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

async function readInvoiceStatusState() {
  try {
    const raw = await readFile(INVOICE_STATUS_FILE, 'utf-8');
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

async function writeInvoiceStatusState(state) {
  await writeFile(INVOICE_STATUS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function applyInvoiceStatusState(items, condominiumId, state) {
  const tenantKey = String(condominiumId);
  const tenantState = state?.[tenantKey] || {};

  return items.map((item) => {
    const statusState = tenantState[String(item.id)] || null;
    if (!statusState) {
      return item;
    }

    return {
      ...item,
      status: statusState.status || item.status,
      paidAt: statusState.paidAt || null,
      paidBy: statusState.paidBy || null,
    };
  });
}

export async function getInvoicesData(condominiumId = 1) {
  const { dbDialect, allowOracleSeedFallback } = getServerConfig();
  const statusState = await readInvoiceStatusState();

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
        const baseItems = rows.map((row) => ({
          id: String(row.FATURA_ID),
          condominiumId: Number(row.CONDOMINIO_ID || 0) || null,
          unit: row.UNIDADE,
          resident: row.MORADOR,
          reference: row.REFERENCIA,
          dueDate: toISODate(row.VENCIMENTO),
          amount: Number(row.AMOUNT || 0),
          status: String(row.STATUS || 'pending').toLowerCase(),
        }));
        const items = applyInvoiceStatusState(baseItems, condominiumId, statusState);

        return {
          items,
        };
      }
    } catch (error) {
      if (!allowOracleSeedFallback) {
        throw createOracleUnavailableError(error);
      }
    }
  }

  const seed = readSeedJson('invoices.json');
  const baseItems = seed.items
    .map((item) => ({ ...item, condominiumId: 1 }))
    .filter((item) => item.condominiumId === condominiumId);
  const items = applyInvoiceStatusState(baseItems, condominiumId, statusState);

  return {
    items,
  };
}

export async function markInvoiceAsPaid(condominiumId = 1, invoiceId, actorSub = null) {
  const payload = await getInvoicesData(condominiumId);
  const exists = payload.items.some((item) => String(item.id) === String(invoiceId));
  if (!exists) {
    return null;
  }

  const state = await readInvoiceStatusState();
  const tenantKey = String(condominiumId);
  state[tenantKey] = state[tenantKey] || {};
  state[tenantKey][String(invoiceId)] = {
    status: 'paid',
    paidAt: new Date().toISOString(),
    paidBy: actorSub || null,
  };

  await writeInvoiceStatusState(state);

  const refreshed = await getInvoicesData(condominiumId);
  return refreshed.items.find((item) => String(item.id) === String(invoiceId)) || null;
}
