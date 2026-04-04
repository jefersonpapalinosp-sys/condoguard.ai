import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getManagementData, type ManagementData } from './mockApi';

const MODULE_NAME = 'management';

export async function fetchManagementData(): Promise<ManagementData> {
  try {
    const response = await requestJson<ManagementData>('/api/management/units');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Gestao', message: 'API indisponivel' });
    return getManagementData();
  }
}
