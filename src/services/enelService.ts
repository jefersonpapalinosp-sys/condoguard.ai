import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';

const MODULE_NAME = 'enel';

export type EnelRunStatus = 'processing' | 'completed' | 'completed_with_errors' | 'failed';

export type EnelRunSummary = {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
};

export type EnelRun = {
  runId: string;
  provider: string;
  source: string;
  status: EnelRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  requestedBy: string;
  summary: EnelRunSummary;
  errorSummary?: string;
};

export type EnelRunItem = {
  index: number;
  result: 'imported' | 'skipped' | 'failed';
  reason: string;
  invoiceId: string | null;
  businessKey: string;
  externalHash: string;
  externalReference: string;
  raw: Record<string, unknown>;
};

export type EnelRunDetail = EnelRun & { items: EnelRunItem[] };

export type EnelInvoiceInput = {
  unit: string;
  resident?: string;
  reference?: string;
  dueDate: string;
  amount: number;
  status?: 'pending' | 'paid' | 'overdue';
  externalReference?: string;
};

export type EnelRunsResponse = {
  items: EnelRun[];
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

export async function createEnelRun(payload: {
  source?: string;
  notes?: string;
  items: EnelInvoiceInput[];
}): Promise<EnelRunDetail> {
  try {
    const response = await requestJson<{ run: EnelRunDetail }>('/api/integrations/enel/runs', {
      method: 'POST',
      body: JSON.stringify({ source: 'manual_assisted', ...payload }),
    });
    setModuleDataSource(MODULE_NAME, 'api');
    return response.run;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Enel', message: 'Falha ao criar importacao Enel' });
    throw new Error('Falha ao processar importacao Enel.');
  }
}

export async function fetchEnelRuns(params: {
  page?: number;
  pageSize?: number;
  status?: EnelRunStatus;
} = {}): Promise<EnelRunsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  try {
    const response = await requestJson<EnelRunsResponse>(`/api/integrations/enel/runs${qs ? `?${qs}` : ''}`);
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Enel', message: 'Falha ao buscar historico Enel' });
    throw new Error('Falha ao carregar historico de importacoes.');
  }
}

export async function fetchEnelRunDetail(runId: string): Promise<EnelRunDetail> {
  try {
    const response = await requestJson<{ run: EnelRunDetail }>(
      `/api/integrations/enel/runs/${encodeURIComponent(runId)}`,
    );
    setModuleDataSource(MODULE_NAME, 'api');
    return response.run;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Enel', message: 'Falha ao buscar detalhes do run Enel' });
    throw new Error('Falha ao carregar detalhes da importacao.');
  }
}
