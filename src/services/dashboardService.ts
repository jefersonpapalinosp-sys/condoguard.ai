import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getDashboardData, type DashboardData } from './mockApi';

const MODULE_NAME = 'dashboard';

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await requestJson<DashboardData>('/api/dashboard');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Dashboard', message: 'API indisponivel' });
    return getDashboardData();
  }
}

