import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getManagementData } from './mockApi';

const MODULE_NAME = 'management';

type UnitStatus = 'occupied' | 'vacant' | 'maintenance';
type UnitSortBy = 'block' | 'unit' | 'resident' | 'status' | 'lastUpdate';
type SortOrder = 'asc' | 'desc';

export type ManagementListQuery = {
  page?: number;
  pageSize?: number;
  status?: UnitStatus;
  block?: 'A' | 'B' | 'C';
  search?: string;
  sortBy?: UnitSortBy;
  sortOrder?: SortOrder;
};

type ManagementUnitItem = Awaited<ReturnType<typeof getManagementData>>['units'][number];

export type ManagementApiResponse = {
  items?: ManagementUnitItem[];
  units: ManagementUnitItem[];
  indicators?: {
    occupancy: {
      totalUnits: number;
      occupiedCount: number;
      occupancyRate: number;
    };
    delinquency: {
      delinquencyUnits: number;
      occupiedUnits: number;
      delinquencyRate: number;
    };
    pending: {
      maintenanceCount: number;
      cadastrosPending: number;
      pendingCount: number;
    };
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    status: UnitStatus | null;
    block: 'A' | 'B' | 'C' | null;
    search: string | null;
  };
  sort?: {
    sortBy: UnitSortBy;
    sortOrder: SortOrder;
  };
};

function buildQuery(params: ManagementListQuery = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status) query.set('status', params.status);
  if (params.block) query.set('block', params.block);
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export async function fetchManagementData(params: ManagementListQuery = {}): Promise<ManagementApiResponse> {
  try {
    const response = await requestJson<ManagementApiResponse>(`/api/management/units${buildQuery(params)}`);
    setModuleDataSource(MODULE_NAME, 'api');
    const units = response.items ?? response.units ?? [];
    return {
      items: units,
      units,
      indicators: response.indicators,
      meta: response.meta,
      filters: response.filters,
      sort: response.sort,
    };
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Gestao', message: 'API indisponivel' });
    const fallback = await getManagementData();
    return { items: fallback.units, units: fallback.units };
  }
}
