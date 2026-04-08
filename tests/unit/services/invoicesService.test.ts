import type { InvoicesData } from '../../../src/services/mockApi';

vi.mock('../../../src/services/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/http')>();
  return {
    ...actual,
    requestJson: vi.fn(),
  };
});

vi.mock('../../../src/services/mockApi', () => ({
  getInvoicesData: vi.fn(),
}));

vi.mock('../../../src/services/apiStatus', () => ({
  notifyApiFallback: vi.fn(),
  setModuleDataSource: vi.fn(),
}));

vi.mock('../../../src/services/authTokenStore', () => ({
  getAccessToken: vi.fn(),
}));

vi.mock('../../../src/services/authEvents', () => ({
  notifyUnauthorized: vi.fn(),
}));

describe('invoicesService.exportInvoicesCsv', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('requests csv with auth header and returns blob', async () => {
    const csvBlob = new Blob(['id,unit\n1,A-101'], { type: 'text/csv' });
    const { getAccessToken } = await import('../../../src/services/authTokenStore');
    const { exportInvoicesCsv } = await import('../../../src/services/invoicesService');

    vi.mocked(getAccessToken).mockReturnValue('token-123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => csvBlob,
    } as unknown as Response);

    const result = await exportInvoicesCsv({ status: 'pending', page: 2, pageSize: 10 });
    expect(result).toBe(csvBlob);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices/export.csv?page=2&pageSize=10&status=pending'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('notifies unauthorized on 401 and throws', async () => {
    const { getAccessToken } = await import('../../../src/services/authTokenStore');
    const { notifyUnauthorized } = await import('../../../src/services/authEvents');
    const { exportInvoicesCsv } = await import('../../../src/services/invoicesService');

    vi.mocked(getAccessToken).mockReturnValue('token-123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      blob: async () => new Blob(),
    } as unknown as Response);

    await expect(exportInvoicesCsv()).rejects.toThrow(/HTTP 401/i);
    expect(notifyUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('throws forbidden message on 403', async () => {
    const { getAccessToken } = await import('../../../src/services/authTokenStore');
    const { exportInvoicesCsv } = await import('../../../src/services/invoicesService');

    vi.mocked(getAccessToken).mockReturnValue('token-123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      blob: async () => new Blob(),
    } as unknown as Response);

    await expect(exportInvoicesCsv()).rejects.toThrow(/Acesso negado/i);
  });

  it('throws generic message for non-401/403 export errors', async () => {
    const { getAccessToken } = await import('../../../src/services/authTokenStore');
    const { exportInvoicesCsv } = await import('../../../src/services/invoicesService');

    vi.mocked(getAccessToken).mockReturnValue('token-123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      blob: async () => new Blob(),
    } as unknown as Response);

    await expect(exportInvoicesCsv()).rejects.toThrow(/Falha ao exportar CSV \(500\)/i);
  });

  it('requests csv without Authorization header when token is missing', async () => {
    const csvBlob = new Blob(['id,unit\n1,A-101'], { type: 'text/csv' });
    const { getAccessToken } = await import('../../../src/services/authTokenStore');
    const { exportInvoicesCsv } = await import('../../../src/services/invoicesService');

    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => csvBlob,
    } as unknown as Response);

    await exportInvoicesCsv();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it('throws when VITE_API_BASE_URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const { exportInvoicesCsv } = await import('../../../src/services/invoicesService');
    await expect(exportInvoicesCsv()).rejects.toThrow(/VITE_API_BASE_URL nao configurada/i);
  });
});

describe('invoicesService.markInvoiceAsPaid', () => {
  it('encodes id and issues PATCH request', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { markInvoiceAsPaid } = await import('../../../src/services/invoicesService');
    vi.mocked(requestJson).mockResolvedValue({
      item: { id: 'inv-1', unit: 'A-1', resident: 'Teste', reference: 'Abr/2026', dueDate: '2026-04-01', amount: 10, status: 'paid' },
    });

    await markInvoiceAsPaid('inv/1');
    expect(requestJson).toHaveBeenCalledWith('/api/invoices/inv%2F1/pay', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  });
});

describe('invoicesService.createInvoiceData', () => {
  it('creates invoice and returns created item', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { createInvoiceData } = await import('../../../src/services/invoicesService');
    const createdItem = {
      id: 'inv-10',
      unit: 'A-10',
      resident: 'Maria Teste',
      reference: 'Mai/2026',
      dueDate: '2026-05-10',
      amount: 312.55,
      status: 'pending' as const,
    };

    vi.mocked(requestJson).mockResolvedValue({ item: createdItem });

    const payload = {
      unit: 'A-10',
      resident: 'Maria Teste',
      reference: 'Mai/2026',
      dueDate: '2026-05-10',
      amount: 312.55,
      status: 'pending' as const,
    };

    const result = await createInvoiceData(payload);

    expect(result).toEqual(createdItem);
    expect(requestJson).toHaveBeenCalledWith('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('invoicesService.updateInvoiceData', () => {
  it('updates invoice by id and returns updated item', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { updateInvoiceData } = await import('../../../src/services/invoicesService');
    const updatedItem = {
      id: 'inv-20',
      unit: 'B-20',
      resident: 'Joao Atualizado',
      reference: 'Jun/2026',
      dueDate: '2026-06-20',
      amount: 499.9,
      status: 'paid' as const,
    };

    vi.mocked(requestJson).mockResolvedValue({ item: updatedItem });

    const payload = {
      amount: 499.9,
      resident: 'Joao Atualizado',
    };

    const result = await updateInvoiceData('inv/20', payload);

    expect(result).toEqual(updatedItem);
    expect(requestJson).toHaveBeenCalledWith('/api/invoices/inv%2F20', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});

describe('invoicesService.fetchInvoicesData', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv('VITE_ENABLE_MOCK_FALLBACK', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns API response and marks source as api', async () => {
    const apiPayload: InvoicesData = {
      items: [{ id: 'x', unit: 'A-1', resident: 'Teste', reference: 'Abr/2026', dueDate: '2026-04-01', amount: 10, status: 'pending' }],
    };

    const { requestJson } = await import('../../../src/services/http');
    const { setModuleDataSource, notifyApiFallback } = await import('../../../src/services/apiStatus');
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');

    vi.mocked(requestJson).mockResolvedValue(apiPayload);

    const result = await fetchInvoicesData();

    expect(result).toEqual(apiPayload);
    expect(setModuleDataSource).toHaveBeenCalledWith('invoices', 'api');
    expect(notifyApiFallback).not.toHaveBeenCalled();
  });

  it('builds query params for list filters and sorting', async () => {
    const { requestJson } = await import('../../../src/services/http');
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');

    vi.mocked(requestJson).mockResolvedValue({ items: [] });

    await fetchInvoicesData({
      page: 2,
      pageSize: 10,
      status: 'pending',
      unit: 'A-101',
      search: 'mar',
      sortBy: 'dueDate',
      sortOrder: 'asc',
    });

    expect(requestJson).toHaveBeenCalledWith(
      expect.stringContaining('/api/invoices?page=2&pageSize=10&status=pending&unit=A-101&search=mar&sortBy=dueDate&sortOrder=asc'),
    );
  });

  it('falls back to mock, emits toast and marks source as mock', async () => {
    const fallbackPayload: InvoicesData = {
      items: [{ id: 'm', unit: 'B-2', resident: 'Fallback', reference: 'Abr/2026', dueDate: '2026-04-02', amount: 20, status: 'paid' }],
    };

    const { requestJson } = await import('../../../src/services/http');
    const { getInvoicesData } = await import('../../../src/services/mockApi');
    const { setModuleDataSource, notifyApiFallback } = await import('../../../src/services/apiStatus');
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');

    vi.mocked(requestJson).mockRejectedValue(new Error('network'));
    vi.mocked(getInvoicesData).mockResolvedValue(fallbackPayload);

    const result = await fetchInvoicesData();

    expect(result).toEqual(fallbackPayload);
    expect(setModuleDataSource).toHaveBeenCalledWith('invoices', 'mock');
    expect(notifyApiFallback).toHaveBeenCalledWith({
      module: 'Faturas',
      message: 'API indisponivel (fallback mock ativo)',
    });
  });

  it('throws when fallback is disabled and marks source as unknown', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK_FALLBACK', 'false');

    const { requestJson } = await import('../../../src/services/http');
    const { getInvoicesData } = await import('../../../src/services/mockApi');
    const { setModuleDataSource, notifyApiFallback } = await import('../../../src/services/apiStatus');
    const { fetchInvoicesData } = await import('../../../src/services/invoicesService');

    vi.mocked(requestJson).mockRejectedValue(new Error('network'));
    vi.mocked(getInvoicesData).mockResolvedValue({ items: [] });

    await expect(fetchInvoicesData()).rejects.toThrow(/Falha ao carregar faturas/i);
    expect(setModuleDataSource).toHaveBeenCalledWith('invoices', 'unknown');
    expect(notifyApiFallback).toHaveBeenCalledWith({
      module: 'Faturas',
      message: 'API indisponivel (fallback mock desativado)',
    });
    expect(getInvoicesData).not.toHaveBeenCalled();
  });
});
