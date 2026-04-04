// @vitest-environment node
import request from 'supertest';
import { z } from 'zod';
import { healthResponseFixture, invoicesResponseFixture } from '../fixtures/apiContractFixtures';

const healthSchema = z.object({
  ok: z.boolean(),
  service: z.literal('condoguard-api'),
  dialect: z.enum(['mock', 'oracle']),
  dbStatus: z.string(),
  timestamp: z.string(),
});

const invoiceSchema = z.object({
  id: z.string(),
  unit: z.string(),
  resident: z.string(),
  reference: z.string(),
  dueDate: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'paid', 'overdue']),
});

const invoicesSchema = z.object({
  items: z.array(invoiceSchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  filters: z.object({
    status: z.enum(['pending', 'paid', 'overdue']).nullable(),
    unit: z.string().nullable(),
  }),
});

const alertsSchema = z.object({
  activeCount: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(['critical', 'warning', 'info']),
      title: z.string(),
      description: z.string(),
      time: z.string(),
    }),
  ),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  filters: z.object({
    severity: z.enum(['critical', 'warning', 'info']).nullable(),
  }),
});

const managementSchema = z.object({
  units: z.array(
    z.object({
      id: z.string(),
      block: z.string(),
      unit: z.string(),
      resident: z.string(),
      status: z.enum(['occupied', 'vacant', 'maintenance']),
      lastUpdate: z.string(),
    }),
  ),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  filters: z.object({
    status: z.enum(['occupied', 'vacant', 'maintenance']).nullable(),
    block: z.enum(['A', 'B', 'C']).nullable(),
  }),
});

const chatBootstrapSchema = z.object({
  welcomeMessage: z.string(),
  suggestions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      prompt: z.string(),
    }),
  ),
});

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});

const appConfig = {
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

describe('API contracts', () => {
  async function loginAndGetToken(app: any) {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'password123',
    });
    expect(response.status).toBe(200);
    return response.body.token as string;
  }

  it('keeps local fixtures valid against contract schemas', () => {
    expect(() => healthSchema.parse(healthResponseFixture)).not.toThrow();
    expect(() => invoicesSchema.parse(invoicesResponseFixture)).not.toThrow();
  });

  it('validates health endpoint contract', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const response = await request(createApp(appConfig)).get('/api/health');

    expect(() => healthSchema.parse(response.body)).not.toThrow();
  });

  it('validates business endpoints contracts', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(appConfig);
    const token = await loginAndGetToken(app);

    const [invoices, alerts, management, chat] = await Promise.all([
      request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/management/units').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/chat/bootstrap').set('Authorization', `Bearer ${token}`),
    ]);

    expect(() => invoicesSchema.parse(invoices.body)).not.toThrow();
    expect(() => alertsSchema.parse(alerts.body)).not.toThrow();
    expect(() => managementSchema.parse(management.body)).not.toThrow();
    expect(() => chatBootstrapSchema.parse(chat.body)).not.toThrow();
  });

  it('validates contracts for filters/pagination and standardized errors', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(appConfig);
    const token = await loginAndGetToken(app);

    const invoices = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`).query({ status: 'pending', page: 1, pageSize: 2 });
    const alerts = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`).query({ severity: 'critical', page: 1, pageSize: 2 });
    const management = await request(app).get('/api/management/units').set('Authorization', `Bearer ${token}`).query({ block: 'A', status: 'occupied', page: 1, pageSize: 2 });
    const invalidEnum = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`).query({ status: 'foo' });
    const invalidPage = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`).query({ page: 0 });

    expect(() => invoicesSchema.parse(invoices.body)).not.toThrow();
    expect(() => alertsSchema.parse(alerts.body)).not.toThrow();
    expect(() => managementSchema.parse(management.body)).not.toThrow();
    expect(() => errorSchema.parse(invalidEnum.body)).not.toThrow();
    expect(() => errorSchema.parse(invalidPage.body)).not.toThrow();
  });
});
