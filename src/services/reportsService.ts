import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { isMockFallbackEnabled } from './fallbackPolicy';
import { ApiError, requestJson } from './http';
import { getReportsData, type ReportsData } from './mockApi';
import { getAccessToken } from './authTokenStore';
import { notifyUnauthorized } from './authEvents';

const MODULE_NAME = 'reports';

export type ReportType = 'financeiro' | 'operacional' | 'contratos';

export type ReportSection = {
  title: string;
  data: Array<{ label: string; value: string }>;
};

export type ReportsApiResponse = ReportsData & {
  type: ReportType;
  period: { from: string; to: string };
  generatedAt: string;
  executiveTitle: string;
  executiveSummary: string;
  sections: ReportSection[];
};

export type ReportParams = {
  type?: ReportType;
  from?: string;
  to?: string;
};

function buildQuery(params: ReportParams): string {
  const q: string[] = [];
  if (params.type) q.push(`type=${encodeURIComponent(params.type)}`);
  if (params.from) q.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) q.push(`to=${encodeURIComponent(params.to)}`);
  return q.length ? `?${q.join('&')}` : '';
}

export async function fetchReportsData(params: ReportParams = {}): Promise<ReportsApiResponse> {
  try {
    const response = await requestJson<ReportsApiResponse>(`/api/reports${buildQuery(params)}`);
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    if (!isMockFallbackEnabled()) {
      setModuleDataSource(MODULE_NAME, 'unknown');
      notifyApiFallback({ module: 'Relatorios', message: 'API indisponivel (fallback mock desativado)' });
      throw new Error('Falha ao carregar relatorios.');
    }
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Relatorios', message: 'API indisponivel (fallback mock ativo)' });
    const mock = getReportsData();
    return {
      ...mock,
      type: params.type ?? 'financeiro',
      period: { from: params.from ?? '', to: params.to ?? '' },
      generatedAt: new Date().toISOString(),
      sections: [],
    } as unknown as ReportsApiResponse;
  }
}

export async function exportReportsCsv(params: ReportParams = {}): Promise<Blob> {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!base) {
    throw new ApiError('VITE_API_BASE_URL nao configurada.');
  }
  const path = `/api/reports/export.csv${buildQuery(params)}`;
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
      throw new ApiError('Acesso negado. Voce nao tem permissao para exportar relatorios.', 403);
    }
    throw new ApiError(`Falha ao exportar CSV (${response.status}).`, response.status);
  }

  return response.blob();
}
