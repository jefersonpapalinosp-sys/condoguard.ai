import type { InvoicesData } from '../../../src/services/mockApi';

vi.mock('../../../src/services/http', () => ({
  requestJson: vi.fn(),
}));

vi.mock('../../../src/services/mockApi', () => ({
  getInvoicesData: vi.fn(),
}));

vi.mock('../../../src/services/apiStatus', () => ({
  notifyApiFallback: vi.fn(),
  setModuleDataSource: vi.fn(),
}));

describe('invoicesService.fetchInvoicesData', () => {
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
      message: 'API indisponivel',
    });
  });
});

