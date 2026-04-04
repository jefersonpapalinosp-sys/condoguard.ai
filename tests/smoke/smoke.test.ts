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

describe('Smoke tests', () => {
  it('keeps critical routes up', async () => {
    const { createApp } = await import('../../server/index.mjs');
    const app = createApp(config);

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@condoguard.ai',
      password: 'password123',
    });
    const token = login.body.token as string;

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);

    const securedTargets = ['/api/invoices', '/api/management/units', '/api/alerts', '/api/chat/bootstrap'];
    for (const route of securedTargets) {
      const response = await request(app).get(route).set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
    }
  });
});
