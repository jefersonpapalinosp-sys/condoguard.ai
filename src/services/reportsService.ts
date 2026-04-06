import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getReportsData, type ReportsData } from './mockApi';

const MODULE_NAME = 'reports';

export async function fetchReportsData(): Promise<ReportsData> {
  try {
    const response = await requestJson<ReportsData>('/api/reports');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Relatorios', message: 'API indisponivel' });
    return getReportsData();
  }
}

