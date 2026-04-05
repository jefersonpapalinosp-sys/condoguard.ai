// @vitest-environment node
import request from 'supertest';

type ServerConfig = {
  appEnv: string;
  port: number;
  dbDialect: 'mock' | 'oracle';
  allowOracleSeedFallback: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsAllowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  loginRateLimitMax: number;
  securityAuditLogEnabled: boolean;
  oracle: {
    user: string;
    password: string;
    connectString: string;
    poolMin: number;
    poolMax: number;
  };
};

const baseConfig: ServerConfig = {
  appEnv: 'hml',
  port: 4000,
  dbDialect: 'mock',
  allowOracleSeedFallback: true,
  jwtSecret: 'test-secret',
  jwtExpiresIn: '1h',
  corsAllowedOrigins: ['http://localhost:3000'],
  rateLimitWindowMs: 60_000,
  rateLimitMax: 200,
  loginRateLimitMax: 50,
  securityAuditLogEnabled: false,
  oracle: {
    user: '',
    password: '',
    connectString: '',
    poolMin: 1,
    poolMax: 8,
  },
};

describe('/api/health', () => {
  it('returns seed status in mock dialect', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp({ ...baseConfig, dbDialect: 'mock' });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        service: 'condoguard-api',
        env: 'hml',
        dialect: 'mock',
        dbStatus: 'seed',
        poolStatus: 'not_applicable',
        latencyMs: null,
        errorSummary: null,
      }),
    );
  });

  it('returns oracle_pool_ok when Oracle pool is available', async () => {
    vi.resetModules();
    vi.doMock('../../server/db/oracleClient.mjs', () => ({
      getOraclePool: vi.fn().mockResolvedValue({ id: 'pool' }),
      closeOraclePool: vi.fn().mockResolvedValue(undefined),
    }));

    const { createApp } = await import('../../server/index.mjs');
    const app = createApp({ ...baseConfig, dbDialect: 'oracle' });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.dbStatus).toBe('oracle_pool_ok');
    expect(response.body.poolStatus).toBe('active');
    expect(typeof response.body.latencyMs).toBe('number');
    expect(response.body.errorSummary).toBeNull();
  });

  it('returns fallback status when Oracle pool fails', async () => {
    vi.resetModules();
    vi.doMock('../../server/db/oracleClient.mjs', () => ({
      getOraclePool: vi.fn().mockRejectedValue(new Error('oracle down')),
      closeOraclePool: vi.fn().mockResolvedValue(undefined),
    }));

    const { createApp } = await import('../../server/index.mjs');
    const app = createApp({ ...baseConfig, dbDialect: 'oracle' });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.dbStatus).toBe('oracle_error_fallback_seed');
    expect(response.body.poolStatus).toBe('error');
    expect(typeof response.body.latencyMs).toBe('number');
    expect(response.body.errorSummary).toContain('oracle down');
  });

  it('returns no-fallback status in prod when Oracle pool fails', async () => {
    vi.resetModules();
    vi.doMock('../../server/db/oracleClient.mjs', () => ({
      getOraclePool: vi.fn().mockRejectedValue(new Error('oracle down')),
      closeOraclePool: vi.fn().mockResolvedValue(undefined),
    }));

    const { createApp } = await import('../../server/index.mjs');
    const app = createApp({
      ...baseConfig,
      appEnv: 'prod',
      allowOracleSeedFallback: false,
      dbDialect: 'oracle',
    });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.dbStatus).toBe('oracle_error_no_fallback');
    expect(response.body.poolStatus).toBe('error');
  });
});
