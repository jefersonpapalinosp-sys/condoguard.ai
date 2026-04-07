import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';

const MODULE_NAME = 'observability';

export type ObservabilityMetricsResponse = {
  generatedAt: string;
  startedAt: string;
  counters: {
    totalRequests: number;
    totalErrors: number;
    errorRatePct: number;
  };
  latency: {
    avgMs: number;
    p95Ms: number;
    maxMs: number;
    samples: number;
  };
  statusClasses: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
    other: number;
  };
  topRoutes: Array<{
    route: string;
    requests: number;
    errors: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
  }>;
  errorCodes: Array<{
    code: string;
    count: number;
  }>;
};

export async function fetchObservabilityMetrics(routeLimit = 10, codeLimit = 10): Promise<ObservabilityMetricsResponse> {
  try {
    const response = await requestJson<ObservabilityMetricsResponse>(
      `/api/observability/metrics?routeLimit=${Math.max(1, routeLimit)}&codeLimit=${Math.max(1, codeLimit)}`,
    );
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Observabilidade', message: 'API indisponivel' });
    throw new Error('Falha ao carregar observabilidade.');
  }
}
