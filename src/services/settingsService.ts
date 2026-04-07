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

const SETTINGS_FALLBACK: SettingsData = {
  generatedAt: new Date().toISOString(),
  tenant: { condominiumId: 0 },
  platform: {
    environment: import.meta.env.VITE_APP_ENV ?? 'dev',
    dbDialect: 'mock',
    authProvider: 'local_jwt',
    oidcConfigured: false,
    allowOracleSeedFallback: false,
    authPasswordLoginEnabled: true,
  },
  security: {
    rateLimitWindowMs: 60000,
    rateLimitMax: 120,
    loginRateLimitMax: 20,
    securityAuditEnabled: false,
    securityAuditPersistEnabled: false,
  },
  observability: {
    channel: 'log',
    thresholds: { latencyP95WarnMs: 1200, errorRateWarnPct: 5, fallbackWarnCount: 3 },
    fallbackEventsTotal: 0,
  },
};

export async function fetchSettingsData(): Promise<SettingsData> {
  try {
    const response = await requestJson<SettingsData>('/api/settings');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Configuracoes', message: 'API indisponivel — exibindo valores padrao' });
    return SETTINGS_FALLBACK;
  }
}
