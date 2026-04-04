import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getServerConfig } from './config/env.mjs';
import { closeOraclePool, getOraclePool } from './db/oracleClient.mjs';
import { getAlertsData } from './repositories/alertsRepo.mjs';
import { getChatBootstrap, askChat } from './repositories/chatRepo.mjs';
import { getInvoicesData } from './repositories/invoicesRepo.mjs';
import { getManagementUnitsData } from './repositories/managementRepo.mjs';

const INVOICE_STATUSES = ['pending', 'paid', 'overdue'];
const ALERT_SEVERITIES = ['critical', 'warning', 'info'];
const MANAGEMENT_STATUSES = ['occupied', 'vacant', 'maintenance'];
const MANAGEMENT_BLOCKS = ['A', 'B', 'C'];
const AUTH_ROLES = ['admin', 'sindico', 'morador'];

const DEMO_USERS = new Map([
  ['admin@condoguard.ai', { password: 'password123', role: 'admin' }],
  ['sindico@condoguard.ai', { password: 'password123', role: 'sindico' }],
  ['morador@condoguard.ai', { password: 'password123', role: 'morador' }],
]);

class ApiRequestError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function parsePositiveInt(value, fallback, field) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiRequestError(400, 'INVALID_QUERY_PARAM', `${field} deve ser inteiro positivo.`, {
      field,
      value: String(value),
    });
  }

  return parsed;
}

function parseEnum(value, allowed, field) {
  if (value == null || value === '') {
    return undefined;
  }

  const normalized = String(value).toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new ApiRequestError(400, 'INVALID_ENUM_VALUE', `${field} invalido.`, {
      field,
      allowed,
      value: normalized,
    });
  }

  return normalized;
}

function paginate(list, page, pageSize) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    data: list.slice(start, start + pageSize),
    meta: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrevious: safePage > 1,
    },
  };
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function logSecurityEvent(config, event, req, details = {}) {
  if (!config.securityAuditLogEnabled) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    event,
    method: req?.method || null,
    path: req?.path || null,
    ip: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
    ...details,
  };

  console.info(`[security] ${JSON.stringify(payload)}`);
}

function applyCorsAllowList(config) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) {
      return next();
    }

    if (!config.corsAllowedOrigins.includes(origin)) {
      logSecurityEvent(config, 'cors_denied', req, { origin });
      return next(new ApiRequestError(403, 'CORS_DENIED', 'Origem nao permitida por CORS.', { origin }));
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  };
}

function decodeBearerToken(authorizationHeader) {
  const value = String(authorizationHeader || '');
  if (!value.startsWith('Bearer ')) {
    return null;
  }
  return value.slice(7).trim() || null;
}

function requireAuth(config) {
  return (req, _res, next) => {
    try {
      const token = decodeBearerToken(req.headers.authorization);
      if (!token) {
        logSecurityEvent(config, 'auth_missing_token', req);
        throw new ApiRequestError(401, 'AUTH_REQUIRED', 'Token de autenticacao ausente.');
      }

      const payload = jwt.verify(token, config.jwtSecret);
      if (!payload || typeof payload !== 'object') {
        logSecurityEvent(config, 'auth_invalid_token_payload', req);
        throw new ApiRequestError(401, 'INVALID_TOKEN', 'Token invalido.');
      }

      const role = String(payload.role || '').toLowerCase();
      if (!AUTH_ROLES.includes(role)) {
        logSecurityEvent(config, 'auth_invalid_token_role', req, { role });
        throw new ApiRequestError(401, 'INVALID_TOKEN_ROLE', 'Role de token invalida.');
      }

      req.auth = {
        sub: String(payload.sub || ''),
        role,
      };
      next();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return next(error);
      }

      if (error?.name === 'TokenExpiredError') {
        logSecurityEvent(config, 'auth_token_expired', req);
        return next(new ApiRequestError(401, 'TOKEN_EXPIRED', 'Sessao expirada.'));
      }

      logSecurityEvent(config, 'auth_invalid_token_signature', req);
      return next(new ApiRequestError(401, 'INVALID_TOKEN', 'Token invalido.'));
    }
  };
}

function requireRole(config, allowedRoles) {
  return (req, _res, next) => {
    const role = req.auth?.role;
    if (!role || !allowedRoles.includes(role)) {
      logSecurityEvent(config, 'auth_forbidden_role', req, { role: role || null, allowedRoles });
      return next(new ApiRequestError(403, 'FORBIDDEN', 'Sem permissao para este recurso.', { allowedRoles }));
    }
    return next();
  };
}

export function createApp(config = getServerConfig()) {
  const baseConfig = getServerConfig();
  const resolvedConfig = {
    ...baseConfig,
    ...config,
    oracle: {
      ...baseConfig.oracle,
      ...(config?.oracle || {}),
    },
  };
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(applyCorsAllowList(resolvedConfig));

  const apiLimiter = rateLimit({
    windowMs: resolvedConfig.rateLimitWindowMs,
    max: resolvedConfig.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health',
    handler: (req, _res, next) => {
      logSecurityEvent(resolvedConfig, 'rate_limit_exceeded', req, { scope: 'api' });
      next(new ApiRequestError(429, 'RATE_LIMITED', 'Muitas requisicoes. Tente novamente em instantes.'));
    },
  });

  const loginLimiter = rateLimit({
    windowMs: resolvedConfig.rateLimitWindowMs,
    max: resolvedConfig.loginRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, _res, next) => {
      logSecurityEvent(resolvedConfig, 'rate_limit_exceeded', req, { scope: 'login' });
      next(new ApiRequestError(429, 'RATE_LIMITED', 'Muitas tentativas de login. Aguarde e tente novamente.'));
    },
  });

  app.use('/api', apiLimiter);

  app.get('/api/health', asyncRoute(async (_, res) => {
    let dbStatus = 'seed';

    if (resolvedConfig.dbDialect === 'oracle') {
      try {
        const pool = await getOraclePool();
        dbStatus = pool ? 'oracle_pool_ok' : 'oracle_disabled';
      } catch {
        dbStatus = 'oracle_error_fallback_seed';
      }
    }

    res.json({
      ok: true,
      service: 'condoguard-api',
      dialect: resolvedConfig.dbDialect,
      dbStatus,
      timestamp: new Date().toISOString(),
    });
  }));

  app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

    if (!email || !password) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campos email e password sao obrigatorios.', {
        fields: ['email', 'password'],
      });
    }

    const account = DEMO_USERS.get(email);
    if (!account || account.password !== password) {
      logSecurityEvent(resolvedConfig, 'auth_login_failed', req, { email });
      throw new ApiRequestError(401, 'INVALID_CREDENTIALS', 'Credenciais invalidas.');
    }

    const token = jwt.sign(
      {
        sub: email,
        role: account.role,
      },
      resolvedConfig.jwtSecret,
      { expiresIn: resolvedConfig.jwtExpiresIn },
    );
    const decoded = jwt.decode(token);
    const expiresAt = typeof decoded === 'object' && decoded?.exp ? Number(decoded.exp) * 1000 : Date.now() + 3600_000;

    res.json({
      token,
      role: account.role,
      expiresAt,
    });
    logSecurityEvent(resolvedConfig, 'auth_login_success', req, { email, role: account.role });
  }));

  app.get('/api/invoices', requireAuth(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const payload = await getInvoicesData();
    const status = parseEnum(req.query.status, INVOICE_STATUSES, 'status');
    const unit = req.query.unit ? String(req.query.unit).trim().toLowerCase() : undefined;
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');

    const filtered = payload.items.filter((item) => {
      const statusOk = status ? item.status === status : true;
      const unitOk = unit ? item.unit.toLowerCase().includes(unit) : true;
      return statusOk && unitOk;
    });
    const { data, meta } = paginate(filtered, page, pageSize);

    res.json({
      items: data,
      meta,
      filters: {
        status: status ?? null,
        unit: unit ?? null,
      },
    });
  }));

  app.get('/api/management/units', requireAuth(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const payload = await getManagementUnitsData();
    const status = parseEnum(req.query.status, MANAGEMENT_STATUSES, 'status');
    const block = parseEnum(req.query.block, MANAGEMENT_BLOCKS.map((v) => v.toLowerCase()), 'block');
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');

    const filtered = payload.units.filter((item) => {
      const statusOk = status ? item.status === status : true;
      const blockOk = block ? item.block.toLowerCase() === block : true;
      return statusOk && blockOk;
    });
    const { data, meta } = paginate(filtered, page, pageSize);

    res.json({
      units: data,
      meta,
      filters: {
        status: status ?? null,
        block: block ? block.toUpperCase() : null,
      },
    });
  }));

  app.get('/api/chat/bootstrap', requireAuth(resolvedConfig), asyncRoute(async (_, res) => {
    const payload = await getChatBootstrap();
    res.json(payload);
  }));

  app.get('/api/alerts', requireAuth(resolvedConfig), asyncRoute(async (req, res) => {
    const payload = await getAlertsData();
    const severity = parseEnum(req.query.severity, ALERT_SEVERITIES, 'severity');
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');
    const filtered = payload.items.filter((item) => (severity ? item.severity === severity : true));
    const { data, meta } = paginate(filtered, page, pageSize);

    res.json({
      activeCount: filtered.length,
      items: data,
      meta,
      filters: {
        severity: severity ?? null,
      },
    });
  }));

  app.post('/api/chat/message', requireAuth(resolvedConfig), asyncRoute(async (req, res) => {
    const message = String(req.body?.message ?? '').trim();
    if (!message) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo message e obrigatorio.', {
        field: 'message',
      });
    }

    const payload = await askChat(message);
    res.json(payload);
  }));

  app.use((error, _req, res, _next) => {
    const status = Number(error?.status || 500);
    const code = String(error?.code || 'INTERNAL_ERROR');
    const message = status >= 500 ? 'Erro interno no servidor.' : String(error?.message || 'Erro na requisicao.');
    const details = error?.details ?? null;

    res.status(status).json({
      error: {
        code,
        message,
        details,
      },
    });

    if (status >= 400) {
      logSecurityEvent(resolvedConfig, 'api_error_response', _req, { status, code });
    }
  });

  return app;
}

export function startServer(config = getServerConfig()) {
  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`CondoGuard API running on http://localhost:${config.port} (${config.dbDialect})`);
  });

  return {
    app,
    server,
    async shutdown(exit = true) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
      await closeOraclePool();
      if (exit) {
        process.exit(0);
      }
    },
  };
}
