import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';

const MODULE_NAME = 'settings';

export type SettingsData = {
  generatedAt: string;
  tenant: {
    condominiumId: number;
  };
  platform: {
    environment: string;
    dbDialect: 'oracle' | 'mock';
    authProvider: string;
    oidcConfigured: boolean;
    allowOracleSeedFallback: boolean;
    authPasswordLoginEnabled: boolean;
  };
  security: {
    rateLimitWindowMs: number;
    rateLimitMax: number;
    loginRateLimitMax: number;
    securityAuditEnabled: boolean;
    securityAuditPersistEnabled: boolean;
  };
  observability: {
    channel: string;
    thresholds: {
      latencyP95WarnMs: number;
      errorRateWarnPct: number;
      fallbackWarnCount: number;
    };
    fallbackEventsTotal: number;
  };
};

export async function fetchSettingsData(): Promise<SettingsData> {
  try {
    const response = await requestJson<SettingsData>('/api/settings');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'unknown');
    notifyApiFallback({ module: 'Configuracoes', message: 'API indisponivel' });
    throw new Error('Falha ao carregar configuracoes.');
  }
}
