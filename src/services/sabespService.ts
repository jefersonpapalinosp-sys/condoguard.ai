import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';

const MODULE_NAME = 'sabesp';

export type SabespRunStatus = 'processing' | 'completed' | 'completed_with_errors' | 'failed';

export type SabespRunSummary = {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
};

export type SabespRun = {
  runId: string;
  provider: string;
  source: string;
  status: SabespRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  requestedBy: string;
  summary: SabespRunSummary;
  errorSummary?: string;
};

export type SabespRunItem = {
  index: number;
  result: 'imported' | 'skipped' | 'failed';
  reason: string;
  recordId: string | null;
  businessKey: string;
  externalHash: string;
  externalReference: string;
  raw: Record<string, unknown>;
};

export type SabespRunDetail = SabespRun & { items: SabespRunItem[] };

export type SabespConsumptionInput = {
  unit: string;
  resident?: string;
  reference?: string;
  readingDate: string;
  dueDate: string;
  consumptionM3: number;
  amount: number;
  status?: 'pending' | 'paid' | 'overdue';
  externalReference?: string;
};

export type SabespRunsResponse = {
  items: SabespRun[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: { status: string | null };
};

export async function createSabespRun(payload: {
  source?: string;
  notes?: string;
  items: SabespConsumptionInput[];
}): Promise<SabespRunDetail> {
  try {
    const response = await requestJson<{ run: SabespRunDetail }>('/api/integrations/sabesp/runs', {
      method: 'POST',
      body: JSON.stringify({ source: 'manual_assisted', ...payload }),
    });
    setModuleDataSource(MODULE_NAME, 'api');
    return response.run;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Sabesp', message: 'Falha ao criar importacao Sabesp' });
    throw new Error('Falha ao processar importacao Sabesp.');
  }
}

export async function fetchSabespRuns(params: {
  page?: number;
  pageSize?: number;
  status?: SabespRunStatus;
} = {}): Promise<SabespRunsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  try {
    const response = await requestJson<SabespRunsResponse>(`/api/integrations/sabesp/runs${qs ? `?${qs}` : ''}`);
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Sabesp', message: 'Falha ao buscar historico Sabesp' });
    throw new Error('Falha ao carregar historico de importacoes.');
  }
}

export async function fetchSabespRunDetail(runId: string): Promise<SabespRunDetail> {
  try {
    const response = await requestJson<{ run: SabespRunDetail }>(
      `/api/integrations/sabesp/runs/${encodeURIComponent(runId)}`,
    );
    setModuleDataSource(MODULE_NAME, 'api');
    return response.run;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Sabesp', message: 'Falha ao buscar detalhes do run Sabesp' });
    throw new Error('Falha ao carregar detalhes da importacao.');
  }
}
