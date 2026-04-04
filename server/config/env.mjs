export function getServerConfig() {
  const defaultAllowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: Number(process.env.PORT || 4000),
    dbDialect: (process.env.DB_DIALECT || 'mock').toLowerCase(),
    jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    corsAllowedOrigins: configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins,
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
    loginRateLimitMax: Number(process.env.RATE_LIMIT_LOGIN_MAX || 20),
    securityAuditLogEnabled: (process.env.SECURITY_AUDIT_LOG_ENABLED || 'true').toLowerCase() === 'true',
    oracle: {
      user: process.env.ORACLE_USER || '',
      password: process.env.ORACLE_PASSWORD || '',
      connectString: process.env.ORACLE_CONNECT_STRING || '',
      poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
      poolMax: Number(process.env.ORACLE_POOL_MAX || 8),
    },
  };
}
