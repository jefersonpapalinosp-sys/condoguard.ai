// @vitest-environment node
import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { mkdir, rm } from 'node:fs/promises';

const testAuditLogPath = path.resolve(process.cwd(), 'logs', 'test-security-audit-api.log');
const invoiceStatePath = path.resolve(process.cwd(), 'server', 'data', 'invoices_status_state.json');

const config = {
  appEnv: 'dev',
  port: 4000,
  dbDialect: 'mock',
  allowOracleSeedFallback: true,
  jwtSecret: 'test-secret',
  jwtExpiresIn: '1h',
  corsAllowedOrigins: ['http://localhost:3000'],
  rateLimitWindowMs: 60_000,
  rateLimitMax: 200,
  loginRateLimitMax: 50,
  securityAuditLogEnabled: true,
  securityAuditPersistEnabled: true,
  securityAuditLogPath: testAuditLogPath,
  oracle: {
    user: '',
    password: '',
    connectString: '',
    poolMin: 1,
    poolMax: 8,
  },
};

async function loginAndGetToken(
  app: any,
  credentials: { email: string; password: string } = {
    email: 'admin@condoguard.ai',
    password: 'password123',
  },
) {
  const response = await request(app).post('/api/auth/login').send({
    email: credentials.email,
    password: credentials.password,
  });

  expect(response.status).toBe(200);
  return response.body.token as string;
}

describe('API endpoints', () => {
  beforeEach(async () => {
    await mkdir(path.dirname(testAuditLogPath), { recursive: true });
    await rm(testAuditLogPath, { force: true });
    await rm(invoiceStatePath, { force: true });
  });

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

  it('exports invoices CSV with active filters', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const response = await request(app)
      .get('/api/invoices/export.csv')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'pending', sortBy: 'amount', sortOrder: 'desc' });

    expect(response.status).toBe(200);
    expect(String(response.headers['content-type'] || '')).toContain('text/csv');
    expect(String(response.text || '')).toContain('"id","condominiumId","unit","resident","reference","dueDate","amount","status"');
  });

  it('marks invoice as paid and returns updated item', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const list = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`).query({ status: 'pending', page: 1, pageSize: 1 });
    expect(list.status).toBe(200);
    const firstId = list.body.items?.[0]?.id;
    expect(firstId).toBeTruthy();

    const mark = await request(app).patch(`/api/invoices/${firstId}/pay`).set('Authorization', `Bearer ${token}`).send({});
    expect(mark.status).toBe(200);
    expect(mark.body.item.status).toBe('paid');

    const paidList = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`).query({ status: 'paid' });
    expect(paidList.status).toBe(200);
    expect(paidList.body.items.some((item: { id: string }) => item.id === firstId)).toBe(true);
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
        intentId: expect.any(String),
        confidence: expect.stringMatching(/^(low|medium|high)$/),
        promptCatalogVersion: expect.any(String),
        guardrails: expect.objectContaining({
          blocked: expect.any(Boolean),
          policyVersion: expect.any(String),
        }),
      }),
    );
    expect([null, 'OUT_OF_SCOPE', 'LOW_CONFIDENCE']).toContain(response.body.guardrails?.reason ?? null);
  });

  it('blocks out-of-scope chat message by guardrails', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const response = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Me conte uma piada de futebol' });

    expect(response.status).toBe(200);
    expect(response.body.guardrails).toEqual(
      expect.objectContaining({
        blocked: true,
        reason: 'OUT_OF_SCOPE',
        policyVersion: expect.any(String),
      }),
    );
    expect(String(response.body.text || '')).toMatch(/fora do escopo/i);
  });

  it('returns versioned chat intents catalog', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const response = await request(app).get('/api/chat/intents').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        version: expect.any(String),
        intents: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            label: expect.any(String),
            promptTemplate: expect.any(String),
          }),
        ]),
      }),
    );
  });

  it('returns structured chat context for current condominium', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const response = await request(app).get('/api/chat/context').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        condominiumId: expect.any(Number),
        generatedAt: expect.any(String),
        dataSource: expect.stringMatching(/^(mock|oracle)$/),
        metrics: expect.objectContaining({
          pendingInvoices: expect.any(Number),
          overdueInvoices: expect.any(Number),
          paidInvoices: expect.any(Number),
          criticalAlerts: expect.any(Number),
          openAlerts: expect.any(Number),
          maintenanceUnits: expect.any(Number),
          occupiedUnits: expect.any(Number),
          totalUnits: expect.any(Number),
        }),
        sources: expect.arrayContaining([expect.any(String)]),
      }),
    );
  });

  it('registers chat telemetry for message, fallback and satisfaction', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const first = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Resumo financeiro do condominio' });
    expect(first.status).toBe(200);

    const blocked = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Me conte uma piada de futebol' });
    expect(blocked.status).toBe(200);
    expect(blocked.body.guardrails?.blocked).toBe(true);

    const feedback = await request(app)
      .post('/api/chat/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ messageId: first.body.id, rating: 'up' });
    expect(feedback.status).toBe(201);
    expect(feedback.body.ok).toBe(true);

    const telemetry = await request(app)
      .get('/api/chat/telemetry')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 10 });
    expect(telemetry.status).toBe(200);
    expect(telemetry.body).toEqual(
      expect.objectContaining({
        condominiumId: 1,
        counters: expect.objectContaining({
          messages: 2,
          fallback: 1,
          blocked: 1,
          outOfScope: 1,
        }),
        satisfaction: expect.objectContaining({
          total: 1,
          positive: 1,
          negative: 0,
        }),
      }),
    );
    expect(Array.isArray(telemetry.body.recentEvents)).toBe(true);
    expect(telemetry.body.recentEvents.length).toBeGreaterThan(0);
  });

  it('allows telemetry only for admin/sindico and blocks morador', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const adminToken = await loginAndGetToken(app, { email: 'admin@condoguard.ai', password: 'password123' });
    const sindicoToken = await loginAndGetToken(app, { email: 'sindico@condoguard.ai', password: 'password123' });
    const moradorToken = await loginAndGetToken(app, { email: 'morador@condoguard.ai', password: 'password123' });

    const adminTelemetry = await request(app).get('/api/chat/telemetry').set('Authorization', `Bearer ${adminToken}`);
    const sindicoTelemetry = await request(app).get('/api/chat/telemetry').set('Authorization', `Bearer ${sindicoToken}`);
    const moradorTelemetry = await request(app).get('/api/chat/telemetry').set('Authorization', `Bearer ${moradorToken}`);

    expect(adminTelemetry.status).toBe(200);
    expect(sindicoTelemetry.status).toBe(200);
    expect(moradorTelemetry.status).toBe(403);
    expect(moradorTelemetry.body.error.code).toBe('FORBIDDEN');
  });

  it('validates payload for chat feedback endpoint', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const missingMessageId = await request(app)
      .post('/api/chat/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 'up' });
    expect(missingMessageId.status).toBe(400);
    expect(missingMessageId.body.error.code).toBe('INVALID_BODY');

    const invalidRating = await request(app)
      .post('/api/chat/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ messageId: 'bot-1', rating: 'maybe' });
    expect(invalidRating.status).toBe(400);
    expect(invalidRating.body.error.code).toBe('INVALID_BODY');

    const longComment = await request(app)
      .post('/api/chat/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ messageId: 'bot-1', rating: 'up', comment: 'x'.repeat(501) });
    expect(longComment.status).toBe(400);
    expect(longComment.body.error.code).toBe('INVALID_BODY');
  });

  it('exposes observability metrics for admin and blocks non-admin role', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const adminToken = await loginAndGetToken(app, { email: 'admin@condoguard.ai', password: 'password123' });
    const moradorToken = await loginAndGetToken(app, { email: 'morador@condoguard.ai', password: 'password123' });

    await request(app).get('/api/health');
    await request(app).get('/api/invoices').set('Authorization', `Bearer ${adminToken}`);
    await request(app).get('/api/invoices').set('Authorization', `Bearer ${moradorToken}`);

    const adminMetrics = await request(app)
      .get('/api/observability/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ routeLimit: 5, codeLimit: 5 });
    expect(adminMetrics.status).toBe(200);
    expect(adminMetrics.body).toEqual(
      expect.objectContaining({
        counters: expect.objectContaining({
          totalRequests: expect.any(Number),
          totalErrors: expect.any(Number),
          errorRatePct: expect.any(Number),
        }),
        latency: expect.objectContaining({
          avgMs: expect.any(Number),
          p95Ms: expect.any(Number),
          maxMs: expect.any(Number),
          samples: expect.any(Number),
        }),
        statusClasses: expect.objectContaining({
          '2xx': expect.any(Number),
          '4xx': expect.any(Number),
        }),
        topRoutes: expect.any(Array),
        errorCodes: expect.any(Array),
      }),
    );
    expect(adminMetrics.body.topRoutes.length).toBeGreaterThan(0);

    const forbidden = await request(app)
      .get('/api/observability/metrics')
      .set('Authorization', `Bearer ${moradorToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
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
    expect(management.body.indicators).toEqual(
      expect.objectContaining({
        occupancy: expect.objectContaining({
          occupancyRate: expect.any(Number),
        }),
        delinquency: expect.objectContaining({
          delinquencyRate: expect.any(Number),
        }),
        pending: expect.objectContaining({
          pendingCount: expect.any(Number),
        }),
      }),
    );
  });

  it('marks alert as read and returns updated item', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const token = await loginAndGetToken(app);

    const list = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`).query({ page: 1, pageSize: 1 });
    expect(list.status).toBe(200);
    const firstId = list.body.items?.[0]?.id;
    expect(firstId).toBeTruthy();

    const mark = await request(app).patch(`/api/alerts/${firstId}/read`).set('Authorization', `Bearer ${token}`).send({});
    expect(mark.status).toBe(200);
    expect(mark.body.item.status).toBe('read');
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

  it('validates login payload format and size', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const invalidEmail = await request(app).post('/api/auth/login').send({
      email: 'admin-condoguard.ai',
      password: 'password123',
    });
    expect(invalidEmail.status).toBe(400);
    expect(invalidEmail.body.error.code).toBe('INVALID_BODY');

    const longPassword = await request(app).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'x'.repeat(129),
    });
    expect(longPassword.status).toBe(400);
    expect(longPassword.body.error.code).toBe('INVALID_BODY');
  });

  it('disables password login when external auth provider is required', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp({
      ...config,
      appEnv: 'hml',
      authProvider: 'oidc_jwks',
      authPasswordLoginEnabled: false,
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'password123',
    });

    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe('AUTH_EXTERNAL_PROVIDER_REQUIRED');
  });

  it('enforces RBAC matrix for admin, sindico and morador', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const adminToken = await loginAndGetToken(app, { email: 'admin@condoguard.ai', password: 'password123' });
    const sindicoToken = await loginAndGetToken(app, { email: 'sindico@condoguard.ai', password: 'password123' });
    const moradorToken = await loginAndGetToken(app, { email: 'morador@condoguard.ai', password: 'password123' });

    const [adminInvoices, adminManagement, adminAlerts, adminChat] = await Promise.all([
      request(app).get('/api/invoices').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/management/units').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/alerts').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/chat/bootstrap').set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(adminInvoices.status).toBe(200);
    expect(adminManagement.status).toBe(200);
    expect(adminAlerts.status).toBe(200);
    expect(adminChat.status).toBe(200);

    const [sindicoInvoices, sindicoManagement, sindicoAlerts, sindicoChat] = await Promise.all([
      request(app).get('/api/invoices').set('Authorization', `Bearer ${sindicoToken}`),
      request(app).get('/api/management/units').set('Authorization', `Bearer ${sindicoToken}`),
      request(app).get('/api/alerts').set('Authorization', `Bearer ${sindicoToken}`),
      request(app).get('/api/chat/bootstrap').set('Authorization', `Bearer ${sindicoToken}`),
    ]);
    expect(sindicoInvoices.status).toBe(200);
    expect(sindicoManagement.status).toBe(200);
    expect(sindicoAlerts.status).toBe(200);
    expect(sindicoChat.status).toBe(200);

    const [moradorInvoices, moradorManagement, moradorAlerts, moradorChat] = await Promise.all([
      request(app).get('/api/invoices').set('Authorization', `Bearer ${moradorToken}`),
      request(app).get('/api/management/units').set('Authorization', `Bearer ${moradorToken}`),
      request(app).get('/api/alerts').set('Authorization', `Bearer ${moradorToken}`),
      request(app).get('/api/chat/bootstrap').set('Authorization', `Bearer ${moradorToken}`),
    ]);
    expect(moradorInvoices.status).toBe(403);
    expect(moradorManagement.status).toBe(403);
    expect(moradorAlerts.status).toBe(200);
    expect(moradorChat.status).toBe(200);
  });

  it('enforces tenant scope and avoids cross-tenant data leakage in listings', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const tenant2AdminToken = jwt.sign(
      { sub: 'admin@condoguard.ai', role: 'admin', condominium_id: 2 },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    const [invoices, management, alerts] = await Promise.all([
      request(app).get('/api/invoices').set('Authorization', `Bearer ${tenant2AdminToken}`),
      request(app).get('/api/management/units').set('Authorization', `Bearer ${tenant2AdminToken}`),
      request(app).get('/api/alerts').set('Authorization', `Bearer ${tenant2AdminToken}`),
    ]);

    expect(invoices.status).toBe(200);
    expect(management.status).toBe(200);
    expect(alerts.status).toBe(200);
    expect(invoices.body.items).toEqual([]);
    expect(management.body.units).toEqual([]);
    expect(alerts.body.items).toEqual([]);
  });

  it('rejects protected routes when token has no condominium scope', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const noTenantToken = jwt.sign(
      { sub: 'admin@condoguard.ai', role: 'admin' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    const response = await request(app).get('/api/invoices').set('Authorization', `Bearer ${noTenantToken}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TENANT_SCOPE');
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

  it('returns 429 when login rate limit is exceeded on /api/auth/login', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const strictApp = createApp({
      ...config,
      rateLimitWindowMs: 60_000,
      rateLimitMax: 100,
      loginRateLimitMax: 2,
    });

    const first = await request(strictApp).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'wrong-pass',
    });
    const second = await request(strictApp).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'wrong-pass',
    });
    const third = await request(strictApp).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'wrong-pass',
    });

    expect([400, 401]).toContain(first.status);
    expect([400, 401]).toContain(second.status);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });

  it('fails explicitly in prod when Oracle is unavailable and fallback is disabled', async () => {
    const previousDbDialect = process.env.DB_DIALECT;
    const previousAppEnv = process.env.APP_ENV;
    const previousFallback = process.env.ALLOW_ORACLE_SEED_FALLBACK;
    try {
      process.env.DB_DIALECT = 'oracle';
      process.env.APP_ENV = 'prod';
      process.env.ALLOW_ORACLE_SEED_FALLBACK = 'false';

      vi.resetModules();
      vi.doMock('../../server/db/oracleClient.mjs', () => ({
        getOraclePool: vi.fn().mockRejectedValue(new Error('oracle down')),
        runOracleQuery: vi.fn().mockRejectedValue(new Error('oracle down')),
        closeOraclePool: vi.fn().mockResolvedValue(undefined),
      }));

      const { createApp } = await import('../../server/index.mjs');
      const app = createApp({
        ...config,
        appEnv: 'prod',
        dbDialect: 'oracle',
        allowOracleSeedFallback: false,
        enableDemoAuth: true,
      });
      const token = await loginAndGetToken(app);

      const invoices = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`);
      expect(invoices.status).toBe(503);
      expect(invoices.body.error.code).toBe('ORACLE_UNAVAILABLE');
    } finally {
      process.env.DB_DIALECT = previousDbDialect;
      process.env.APP_ENV = previousAppEnv;
      process.env.ALLOW_ORACLE_SEED_FALLBACK = previousFallback;
    }
  });

  it('allows admin to query audit trail and blocks morador', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const adminToken = await loginAndGetToken(app, { email: 'admin@condoguard.ai', password: 'password123' });
    const moradorToken = await loginAndGetToken(app, { email: 'morador@condoguard.ai', password: 'password123' });

    const forbidden = await request(app).get('/api/security/audit').set('Authorization', `Bearer ${moradorToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const audit = await request(app)
      .get('/api/security/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ event: 'auth_login_success', limit: 50 });

    expect(audit.status).toBe(200);
    expect(Array.isArray(audit.body.items)).toBe(true);
    expect(audit.body.items.length).toBeGreaterThan(0);
    expect(audit.body.items[0]).toEqual(
      expect.objectContaining({
        event: 'auth_login_success',
      }),
    );
  });

  it('validates payload and date range for audit query and chat message', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);
    const adminToken = await loginAndGetToken(app, { email: 'admin@condoguard.ai', password: 'password123' });

    const invalidDate = await request(app)
      .get('/api/security/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ from: 'not-a-date' });
    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body.error.code).toBe('INVALID_QUERY_PARAM');

    const invertedRange = await request(app)
      .get('/api/security/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ from: '2026-04-05T00:00:00.000Z', to: '2026-04-04T00:00:00.000Z' });
    expect(invertedRange.status).toBe(400);
    expect(invertedRange.body.error.code).toBe('INVALID_QUERY_PARAM');

    const longMessage = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'x'.repeat(2001) });
    expect(longMessage.status).toBe(400);
    expect(longMessage.body.error.code).toBe('INVALID_BODY');
  });
});
