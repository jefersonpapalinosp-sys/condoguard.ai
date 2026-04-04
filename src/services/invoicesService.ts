import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getInvoicesData, type InvoicesData } from './mockApi';

const MODULE_NAME = 'invoices';

export async function fetchInvoicesData(): Promise<InvoicesData> {
  try {
    const response = await requestJson<InvoicesData>('/api/invoices');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Faturas', message: 'API indisponivel' });
    return getInvoicesData();
  }
}
