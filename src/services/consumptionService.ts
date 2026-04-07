import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getConsumptionData, type ConsumptionData } from './mockApi';

const MODULE_NAME = 'consumption';

export async function fetchConsumptionData(): Promise<ConsumptionData> {
  try {
    const response = await requestJson<ConsumptionData>('/api/consumption');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Consumo', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar consumo.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Consumo', message: 'API indisponivel (fallback mock ativo)' });
    return getConsumptionData();
  }
}
