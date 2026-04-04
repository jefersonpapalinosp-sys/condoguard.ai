// @vitest-environment node
import request from 'supertest';

const config = {
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

async function loginAndGetToken(app: any) {
  const response = await request(app).post('/api/auth/login').send({
    email: 'admin@condoguard.ai',
    password: 'password123',
  });

  expect(response.status).toBe(200);
  return response.body.token as string;
}

describe('API endpoints', () => {
  it('serves invoices, management, alerts and chat bootstrap', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const [invoices, management, alerts, chat] = await Promise.all([
      request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/management/units').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/chat/bootstrap').set('Authorization', `Bearer ${token}`),
    ]);

    expect(invoices.status).toBe(200);
    expect(management.status).toBe(200);
    expect(alerts.status).toBe(200);
    expect(chat.status).toBe(200);

    expect(Array.isArray(invoices.body.items)).toBe(true);
    expect(Array.isArray(management.body.units)).toBe(true);
    expect(Array.isArray(alerts.body.items)).toBe(true);
    expect(Array.isArray(chat.body.suggestions)).toBe(true);
    expect(invoices.body.meta).toEqual(
      expect.objectContaining({
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );
  });

  it('accepts chat message POST', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const response = await request(app).post('/api/chat/message').set('Authorization', `Bearer ${token}`).send({ message: 'Resumo de alertas' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        role: 'assistant',
        text: expect.any(String),
      }),
    );
  });

  it('supports pagination and filters in list endpoints', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const invoices = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`).query({ status: 'pending', page: 1, pageSize: 1 });
    expect(invoices.status).toBe(200);
    expect(invoices.body.items.length).toBeLessThanOrEqual(1);
    expect(invoices.body.filters.status).toBe('pending');

    const alerts = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`).query({ severity: 'critical', page: 1, pageSize: 2 });
    expect(alerts.status).toBe(200);
    expect(alerts.body.filters.severity).toBe('critical');

    const management = await request(app).get('/api/management/units').set('Authorization', `Bearer ${token}`).query({ block: 'A', status: 'occupied' });
    expect(management.status).toBe(200);
    expect(management.body.filters.block).toBe('A');
    expect(management.body.filters.status).toBe('occupied');
  });

  it('returns standardized 400 error for invalid enum/filter values', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const badEnum = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`).query({ status: 'invalid-status' });
    expect(badEnum.status).toBe(400);
    expect(badEnum.body.error).toEqual(
      expect.objectContaining({
        code: 'INVALID_ENUM_VALUE',
        message: expect.any(String),
        details: expect.objectContaining({
          field: 'status',
        }),
      }),
    );

    const badPage = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`).query({ page: 0 });
    expect(badPage.status).toBe(400);
    expect(badPage.body.error.code).toBe('INVALID_QUERY_PARAM');
  });

  it('enforces 401 and 403 controls', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const noToken = await request(app).get('/api/invoices');
    expect(noToken.status).toBe(401);
    expect(noToken.body.error.code).toBe('AUTH_REQUIRED');

    const moradorLogin = await request(app).post('/api/auth/login').send({
      email: 'morador@condoguard.ai',
      password: 'password123',
    });
    const moradorToken = moradorLogin.body.token as string;
    const forbidden = await request(app).get('/api/invoices').set('Authorization', `Bearer ${moradorToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  it('sets security headers and enforces CORS allowlist', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['x-content-type-options']).toBeDefined();
    expect(allowed.headers['x-frame-options']).toBeDefined();

    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('CORS_DENIED');
  });

  it('returns 429 when API rate limit is exceeded', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const strictApp = createApp({
      ...config,
      rateLimitWindowMs: 60_000,
      rateLimitMax: 1,
    });

    const first = await request(strictApp).get('/api/health');
    expect(first.status).toBe(200);

    const second = await request(strictApp).get('/api/alerts');
    expect([401, 429]).toContain(second.status);

    const third = await request(strictApp).get('/api/invoices');
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });
});
