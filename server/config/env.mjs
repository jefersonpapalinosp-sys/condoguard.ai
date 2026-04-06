export function getServerConfig() {
  const defaultAllowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'dev').toLowerCase();
  const allowOracleSeedFallback = (process.env.ALLOW_ORACLE_SEED_FALLBACK || (appEnv === 'dev' || appEnv === 'hml' ? 'true' : 'false'))
    .toLowerCase() === 'true';
  const enableDemoAuth = (process.env.ENABLE_DEMO_AUTH || (appEnv === 'dev' ? 'true' : 'false')).toLowerCase() === 'true';
  const authProvider = (process.env.AUTH_PROVIDER || 'local_jwt').toLowerCase();
  const oidcAllowedAlgs = (process.env.OIDC_ALLOWED_ALGS || 'RS256')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const oidcIssuer = process.env.OIDC_ISSUER || '';
  const oidcAudience = process.env.OIDC_AUDIENCE || '';
  const oidcJwksUrl = process.env.OIDC_JWKS_URL || '';
  const oidcConfigured = Boolean(oidcIssuer && oidcAudience && oidcJwksUrl);
  const securityAuditLogPath = process.env.SECURITY_AUDIT_LOG_PATH || 'logs/security-audit.log';
  const securityAuditPersistEnabled = (process.env.SECURITY_AUDIT_PERSIST_ENABLED || 'false').toLowerCase() === 'true';
  const authPasswordLoginEnabled = (process.env.AUTH_PASSWORD_LOGIN_ENABLED || (authProvider === 'local_jwt' || appEnv === 'dev' ? 'true' : 'false'))
    .toLowerCase() === 'true';
  const observabilityLatencyP95WarnMs = Number(process.env.OBS_ALERT_P95_LATENCY_MS || 1200);
  const observabilityErrorRateWarnPct = Number(process.env.OBS_ALERT_ERROR_RATE_PCT || 5);
  const observabilityFallbackWarnCount = Number(process.env.OBS_ALERT_FALLBACK_COUNT || 3);
  const observabilityAlertChannel = process.env.OBS_ALERT_CHANNEL || 'log';
  const observabilityWebhookUrl = process.env.OBS_ALERT_WEBHOOK_URL || '';
  const observabilityWebhookTimeoutMs = Number(process.env.OBS_ALERT_WEBHOOK_TIMEOUT_MS || 5000);

  return {
    appEnv,
    port: Number(process.env.PORT || 4000),
    dbDialect: (process.env.DB_DIALECT || 'mock').toLowerCase(),
    allowOracleSeedFallback,
    enableDemoAuth,
    authProvider,
    authPasswordLoginEnabled,
    jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    corsAllowedOrigins: configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins,
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
    loginRateLimitMax: Number(process.env.RATE_LIMIT_LOGIN_MAX || 20),
    securityAuditLogEnabled: (process.env.SECURITY_AUDIT_LOG_ENABLED || 'true').toLowerCase() === 'true',
    securityAuditPersistEnabled,
    securityAuditLogPath,
    oidc: {
      issuer: oidcIssuer,
      audience: oidcAudience,
      jwksUrl: oidcJwksUrl,
      roleClaim: process.env.OIDC_ROLE_CLAIM || 'roles',
      tenantClaim: process.env.OIDC_TENANT_CLAIM || 'condominium_id',
      allowedAlgs: oidcAllowedAlgs,
      isConfigured: oidcConfigured,
    },
    oracle: {
      user: process.env.ORACLE_USER || '',
      password: process.env.ORACLE_PASSWORD || '',
      connectString: process.env.ORACLE_CONNECT_STRING || '',
      poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
      poolMax: Number(process.env.ORACLE_POOL_MAX || 8),
    },
    observability: {
      thresholds: {
        latencyP95WarnMs: Number.isFinite(observabilityLatencyP95WarnMs) ? observabilityLatencyP95WarnMs : 1200,
        errorRateWarnPct: Number.isFinite(observabilityErrorRateWarnPct) ? observabilityErrorRateWarnPct : 5,
        fallbackWarnCount: Number.isFinite(observabilityFallbackWarnCount) ? observabilityFallbackWarnCount : 3,
      },
      alertChannel: observabilityAlertChannel,
      webhookUrl: observabilityWebhookUrl,
      webhookTimeoutMs: Number.isFinite(observabilityWebhookTimeoutMs) ? observabilityWebhookTimeoutMs : 5000,
    },
  };
}
