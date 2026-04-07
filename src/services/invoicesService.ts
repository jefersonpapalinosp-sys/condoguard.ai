import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { ApiError, requestJson } from './http';
import { getInvoicesData, type InvoicesData } from './mockApi';
import { getAccessToken } from './authTokenStore';
import { notifyUnauthorized } from './authEvents';

const MODULE_NAME = 'invoices';

type InvoiceSortBy = 'dueDate' | 'amount' | 'unit' | 'resident' | 'reference' | 'status';
type SortOrder = 'asc' | 'desc';

export type InvoiceListQuery = {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'paid' | 'overdue';
  unit?: string;
  search?: string;
  sortBy?: InvoiceSortBy;
  sortOrder?: SortOrder;
};

export type InvoicesApiResponse = InvoicesData & {
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    status: 'pending' | 'paid' | 'overdue' | null;
    unit: string | null;
    search: string | null;
  };
  sort?: {
    sortBy: InvoiceSortBy;
    sortOrder: SortOrder;
  };
};

function buildQuery(params: InvoiceListQuery = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status) query.set('status', params.status);
  if (params.unit) query.set('unit', params.unit);
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export async function fetchInvoicesData(params: InvoiceListQuery = {}): Promise<InvoicesApiResponse> {
  try {
    const response = await requestJson<InvoicesApiResponse>(`/api/invoices${buildQuery(params)}`);
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Faturas', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar faturas.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Faturas', message: 'API indisponivel (fallback mock ativo)' });
    return getInvoicesData();
  }
}

export async function exportInvoicesCsv(params: InvoiceListQuery = {}): Promise<Blob> {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!base) {
    throw new ApiError('VITE_API_BASE_URL nao configurada.');
  }
  const path = `/api/invoices/export.csv${buildQuery(params)}`;
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base).toString();
  const token = getAccessToken();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      notifyUnauthorized();
      throw new ApiError('HTTP 401', 401);
    }
    if (response.status === 403) {
      throw new ApiError('Acesso negado. Voce nao tem permissao para exportar faturas.', 403);
    }
    throw new ApiError(`Falha ao exportar CSV (${response.status}).`, response.status);
  }

  return response.blob();
}

export async function markInvoiceAsPaid(invoiceId: string) {
  const safeId = encodeURIComponent(invoiceId);
  return requestJson<{ item: InvoicesData['items'][number] }>(`/api/invoices/${safeId}/pay`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}
