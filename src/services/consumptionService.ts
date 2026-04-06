import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getConsumptionData, type ConsumptionData } from './mockApi';

const MODULE_NAME = 'consumption';

export async function fetchConsumptionData(): Promise<ConsumptionData> {
  try {
    const response = await requestJson<ConsumptionData>('/api/consumption');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Consumo', message: 'API indisponivel' });
    return getConsumptionData();
  }
}

