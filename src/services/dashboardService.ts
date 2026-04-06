import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getDashboardData, type DashboardData } from './mockApi';

const MODULE_NAME = 'dashboard';

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await requestJson<DashboardData>('/api/dashboard');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Dashboard', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar dashboard.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Dashboard', message: 'API indisponivel (fallback mock ativo)' });
    return getDashboardData();
  }
}
