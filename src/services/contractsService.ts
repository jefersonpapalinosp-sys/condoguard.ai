import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getContractsData, type ContractsData } from './mockApi';

const MODULE_NAME = 'contracts';

export async function fetchContractsData(): Promise<ContractsData> {
  try {
    const response = await requestJson<ContractsData>('/api/contracts');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Contratos', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar contratos.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Contratos', message: 'API indisponivel (fallback mock ativo)' });
    return getContractsData();
  }
}
