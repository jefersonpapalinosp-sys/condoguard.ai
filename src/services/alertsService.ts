import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { requestJson } from './http';
import { getAlertsData, type AlertsData } from './mockApi';

const MODULE_NAME = 'alerts';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'read';
type AlertSortBy = 'severity' | 'title' | 'time' | 'status' | 'readAt';
type SortOrder = 'asc' | 'desc';

export type AlertsListQuery = {
  page?: number;
  pageSize?: number;
  severity?: AlertSeverity;
  status?: AlertStatus;
  search?: string;
  sortBy?: AlertSortBy;
  sortOrder?: SortOrder;
};

export type AlertsApiResponse = AlertsData & {
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    severity: AlertSeverity | null;
    status: AlertStatus | null;
    search: string | null;
  };
  sort?: {
    sortBy: AlertSortBy;
    sortOrder: SortOrder;
  };
};

function buildQuery(params: AlertsListQuery = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.severity) query.set('severity', params.severity);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export async function fetchAlertsData(params: AlertsListQuery = {}): Promise<AlertsApiResponse> {
  try {
    const response = await requestJson<AlertsApiResponse>(`/api/alerts${buildQuery(params)}`);
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Alertas', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar alertas.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Alertas', message: 'API indisponivel (fallback mock ativo)' });
    return getAlertsData();
  }
}

export async function markAlertAsRead(alertId: string) {
  const safeId = encodeURIComponent(alertId);
  return requestJson<{ item: AlertsData['items'][number] }>(`/api/alerts/${safeId}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}
