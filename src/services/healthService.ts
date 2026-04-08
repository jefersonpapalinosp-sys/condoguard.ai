import { requestJson } from './http';

export type OidcReadiness = {
  ready: boolean;
  missingConfig: string[];
  issues: string[];
};

export type HealthResponse = {
  ok: boolean;
  service: string;
  env: string;
  dialect: string;
  authProvider: string;
  authPasswordLoginEnabled: boolean;
  oidcConfigured: boolean;
  oidcReadiness: OidcReadiness;
  dbStatus: string;
  poolStatus: string;
  latencyMs: number | null;
  errorSummary: string | null;
  timestamp: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/health');
}
