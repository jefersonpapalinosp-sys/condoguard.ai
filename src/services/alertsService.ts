import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getAlertsData, type AlertsData } from './mockApi';

const MODULE_NAME = 'alerts';

export async function fetchAlertsData(): Promise<AlertsData> {
  try {
    const response = await requestJson<AlertsData>('/api/alerts');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Alertas', message: 'API indisponivel' });
    return getAlertsData();
  }
}
