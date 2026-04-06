import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getContractsData, type ContractsData } from './mockApi';

const MODULE_NAME = 'contracts';

export async function fetchContractsData(): Promise<ContractsData> {
  try {
    const response = await requestJson<ContractsData>('/api/contracts');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Contratos', message: 'API indisponivel' });
    return getContractsData();
  }
}

