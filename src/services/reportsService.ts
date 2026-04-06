import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getReportsData, type ReportsData } from './mockApi';

const MODULE_NAME = 'reports';

export async function fetchReportsData(): Promise<ReportsData> {
  try {
    const response = await requestJson<ReportsData>('/api/reports');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Relatorios', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar relatorios.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Relatorios', message: 'API indisponivel (fallback mock ativo)' });
    return getReportsData();
  }
}
