// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const oracleConfig = {
  appEnv: 'hml',
  dbDialect: 'oracle',
  allowOracleSeedFallback: false,
};

function setupBaseMocks(runOracleQuery: ReturnType<typeof vi.fn>) {
  vi.doMock('../../../server/config/env.mjs', () => ({
    getServerConfig: () => oracleConfig,
  }));
  vi.doMock('../../../server/db/oracleClient.mjs', () => ({
    runOracleQuery,
  }));
}

describe('Oracle repositories tenant scope regression', () => {
  it('invoices query enforces condominium_id SQL filter and bind', async () => {
    vi.resetModules();
    const runOracleQuery = vi.fn().mockResolvedValue([]);
    setupBaseMocks(runOracleQuery);

    const { getInvoicesData } = await import('../../../server/repositories/invoicesRepo.mjs');
    await getInvoicesData(42);

    expect(runOracleQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = runOracleQuery.mock.calls[0];
    expect(String(sql).toLowerCase()).toContain('where condominio_id = :condominiumid');
    expect(params).toEqual(expect.objectContaining({ condominiumId: 42 }));
  });

  it('management query enforces condominium_id SQL filter and bind', async () => {
    vi.resetModules();
    const runOracleQuery = vi.fn().mockResolvedValue([]);
    setupBaseMocks(runOracleQuery);

    const { getManagementUnitsData } = await import('../../../server/repositories/managementRepo.mjs');
    await getManagementUnitsData(77);

    expect(runOracleQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = runOracleQuery.mock.calls[0];
    expect(String(sql).toLowerCase()).toContain('where condominio_id = :condominiumid');
    expect(params).toEqual(expect.objectContaining({ condominiumId: 77 }));
  });

  it('alerts query enforces condominium_id SQL filter and bind', async () => {
    vi.resetModules();
    const runOracleQuery = vi.fn().mockResolvedValue([]);
    setupBaseMocks(runOracleQuery);

    const { getAlertsData } = await import('../../../server/repositories/alertsRepo.mjs');
    await getAlertsData(9);

    expect(runOracleQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = runOracleQuery.mock.calls[0];
    expect(String(sql).toLowerCase()).toContain('where condominio_id = :condominiumid');
    expect(params).toEqual(expect.objectContaining({ condominiumId: 9 }));
  });

  it('chat bootstrap queries enforce condominium_id bind in both Oracle reads', async () => {
    vi.resetModules();
    const runOracleQuery = vi
      .fn()
      .mockResolvedValueOnce([{ TOTAL: 5 }])
      .mockResolvedValueOnce([{ TOTAL: 2 }]);
    setupBaseMocks(runOracleQuery);

    const { getChatBootstrap } = await import('../../../server/repositories/chatRepo.mjs');
    await getChatBootstrap(15);

    expect(runOracleQuery).toHaveBeenCalledTimes(2);
    const [sql1, params1] = runOracleQuery.mock.calls[0];
    const [sql2, params2] = runOracleQuery.mock.calls[1];
    expect(String(sql1).toLowerCase()).toContain('condominio_id = :condominiumid');
    expect(String(sql2).toLowerCase()).toContain('condominio_id = :condominiumid');
    expect(params1).toEqual(expect.objectContaining({ condominiumId: 15 }));
    expect(params2).toEqual(expect.objectContaining({ condominiumId: 15 }));
  });
});
