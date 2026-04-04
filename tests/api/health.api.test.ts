// @vitest-environment node
import request from 'supertest';

type ServerConfig = {
  port: number;
  dbDialect: 'mock' | 'oracle';
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
  port: 4000,
  dbDialect: 'mock',
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
        dialect: 'mock',
        dbStatus: 'seed',
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
  });
});
