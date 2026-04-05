import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getServerConfig } from './config/env.mjs';
import { closeOraclePool, getOraclePool } from './db/oracleClient.mjs';
import { summarizeOracleError } from './errors/oracleErrors.mjs';
import { verifyAccessToken } from './auth/authProvider.mjs';
import { persistSecurityEvent } from './audit/securityAudit.mjs';
import { querySecurityAuditEvents } from './audit/querySecurityAudit.mjs';
import { getAlertsData } from './repositories/alertsRepo.mjs';
import { getChatBootstrap, askChat } from './repositories/chatRepo.mjs';
import { getInvoicesData } from './repositories/invoicesRepo.mjs';
import { getManagementUnitsData } from './repositories/managementRepo.mjs';
import { listCadastros, createCadastro, updateCadastroStatus } from './repositories/cadastrosRepo.mjs';
import { findAccountForLogin } from './repositories/authRepo.mjs';

const INVOICE_STATUSES = ['pending', 'paid', 'overdue'];
const ALERT_SEVERITIES = ['critical', 'warning', 'info'];
const MANAGEMENT_STATUSES = ['occupied', 'vacant', 'maintenance'];
const MANAGEMENT_BLOCKS = ['A', 'B', 'C'];
const CADASTRO_TYPES = ['unidade', 'morador', 'fornecedor', 'servico'];
const CADASTRO_STATUSES = ['active', 'pending', 'inactive'];
const AUTH_ROLES = ['admin', 'sindico', 'morador'];

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

function parseIsoDatetime(value, field) {
  if (value == null || value === '') {
    return undefined;
  }

  const normalized = String(value).trim();
  const ts = Date.parse(normalized);
  if (!Number.isFinite(ts)) {
    throw new ApiRequestError(400, 'INVALID_QUERY_PARAM', `${field} deve ser data/hora ISO valida.`, {
      field,
      value: normalized,
    });
  }

  return new Date(ts).toISOString();
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
    actorSub: req?.auth?.sub || null,
    actorRole: req?.auth?.role || null,
    condominiumId: Number(req?.auth?.condominiumId || 0) || null,
    ...details,
  };

  console.info(`[security] ${JSON.stringify(payload)}`);
  persistSecurityEvent(config, payload).catch((error) => {
    console.error(`[security] persist_failed ${String(error?.message || error)}`);
  });
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
  return async (req, _res, next) => {
    try {
      const token = decodeBearerToken(req.headers.authorization);
      if (!token) {
        logSecurityEvent(config, 'auth_missing_token', req);
        throw new ApiRequestError(401, 'AUTH_REQUIRED', 'Token de autenticacao ausente.');
      }

      const payload = await verifyAccessToken(token, config);
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
        condominiumId: Number(payload.condominiumId || payload.condominium_id || 0) || null,
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

      if (String(error?.message || '').startsWith('oidc_')) {
        logSecurityEvent(config, 'auth_invalid_oidc_token', req, { reason: String(error.message) });
        return next(new ApiRequestError(401, 'INVALID_TOKEN', 'Token invalido.'));
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

function requireTenant(config) {
  return (req, _res, next) => {
    const condominiumId = Number(req.auth?.condominiumId || 0);
    if (!Number.isInteger(condominiumId) || condominiumId <= 0) {
      logSecurityEvent(config, 'auth_invalid_tenant_scope', req, { condominiumId: req.auth?.condominiumId ?? null });
      return next(new ApiRequestError(401, 'INVALID_TENANT_SCOPE', 'Escopo de condominio invalido no token.'));
    }
    return next();
  };
}

export function createApp(config = {}) {
  const baseConfig = getServerConfig();
  const effectiveAppEnv = config?.appEnv || baseConfig.appEnv;
  const effectiveEnableDemoAuth = typeof config?.enableDemoAuth === 'boolean'
    ? config.enableDemoAuth
    : effectiveAppEnv === 'dev';
  const resolvedConfig = {
    ...baseConfig,
    ...config,
    appEnv: effectiveAppEnv,
    enableDemoAuth: effectiveEnableDemoAuth,
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
    let poolStatus = 'not_applicable';
    let latencyMs = null;
    let errorSummary = null;

    if (resolvedConfig.dbDialect === 'oracle') {
      const start = Date.now();
      try {
        const pool = await getOraclePool();
        dbStatus = pool ? 'oracle_pool_ok' : 'oracle_disabled';
        poolStatus = pool ? 'active' : 'disabled';
      } catch (error) {
        dbStatus = resolvedConfig.allowOracleSeedFallback ? 'oracle_error_fallback_seed' : 'oracle_error_no_fallback';
        poolStatus = 'error';
        errorSummary = summarizeOracleError(error);
      } finally {
        latencyMs = Date.now() - start;
      }
    }

    res.json({
      ok: true,
      service: 'condoguard-api',
      env: resolvedConfig.appEnv,
      dialect: resolvedConfig.dbDialect,
      authProvider: resolvedConfig.authProvider,
      authPasswordLoginEnabled: Boolean(resolvedConfig.authPasswordLoginEnabled),
      oidcConfigured: Boolean(resolvedConfig.oidc?.isConfigured),
      dbStatus,
      poolStatus,
      latencyMs,
      errorSummary,
      timestamp: new Date().toISOString(),
    });
  }));

  app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
    if (!resolvedConfig.authPasswordLoginEnabled) {
      throw new ApiRequestError(
        501,
        'AUTH_EXTERNAL_PROVIDER_REQUIRED',
        'Login por senha desabilitado. Use o provedor corporativo de identidade.',
        { authProvider: resolvedConfig.authProvider },
      );
    }

    const emailRaw = req.body?.email;
    const passwordRaw = req.body?.password;
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    const password = typeof passwordRaw === 'string' ? passwordRaw.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !password) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campos email e password sao obrigatorios.', {
        fields: ['email', 'password'],
      });
    }
    if (!emailRegex.test(email)) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo email invalido.', {
        field: 'email',
      });
    }
    if (password.length > 128) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo password excede tamanho maximo permitido.', {
        field: 'password',
        maxLength: 128,
      });
    }

    const account = await findAccountForLogin(email, password, resolvedConfig);
    if (!account || !account.passwordMatches || !AUTH_ROLES.includes(account.role)) {
      logSecurityEvent(resolvedConfig, 'auth_login_failed', req, { email });
      throw new ApiRequestError(401, 'INVALID_CREDENTIALS', 'Credenciais invalidas.');
    }

    const token = jwt.sign(
        {
        sub: account.email,
        role: account.role,
        condominium_id: account.condominiumId,
      },
      resolvedConfig.jwtSecret,
      { expiresIn: resolvedConfig.jwtExpiresIn },
    );
    const decoded = jwt.decode(token);
    const expiresAt = typeof decoded === 'object' && decoded?.exp ? Number(decoded.exp) * 1000 : Date.now() + 3600_000;

    res.json({
      token,
      role: account.role,
      condominiumId: account.condominiumId,
      expiresAt,
    });
    logSecurityEvent(resolvedConfig, 'auth_login_success', req, { email, role: account.role });
  }));

  app.get('/api/invoices', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const payload = await getInvoicesData(req.auth.condominiumId);
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

  app.get('/api/management/units', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const payload = await getManagementUnitsData(req.auth.condominiumId);
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

  app.get('/api/cadastros', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const payload = await listCadastros(req.auth.condominiumId);
    const tipo = parseEnum(req.query.tipo, CADASTRO_TYPES, 'tipo');
    const status = parseEnum(req.query.status, CADASTRO_STATUSES, 'status');
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');

    const filtered = payload.items.filter((item) => {
      const tipoOk = tipo ? item.tipo === tipo : true;
      const statusOk = status ? item.status === status : true;
      const searchOk = search
        ? item.titulo.toLowerCase().includes(search) || item.descricao.toLowerCase().includes(search)
        : true;
      return tipoOk && statusOk && searchOk;
    });
    const { data, meta } = paginate(filtered, page, pageSize);

    res.json({
      items: data,
      meta,
      filters: {
        tipo: tipo ?? null,
        status: status ?? null,
        search: search ?? null,
      },
    });
  }));

  app.post('/api/cadastros', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const tipo = parseEnum(req.body?.tipo, CADASTRO_TYPES, 'tipo');
    const status = parseEnum(req.body?.status, CADASTRO_STATUSES, 'status');
    const titulo = String(req.body?.titulo || '').trim();
    const descricao = String(req.body?.descricao || '').trim();

    if (!tipo || !status || !titulo || !descricao) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campos tipo, titulo, descricao e status sao obrigatorios.', {
        fields: ['tipo', 'titulo', 'descricao', 'status'],
      });
    }
    if (titulo.length > 120 || descricao.length > 240) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Tamanho maximo excedido para titulo/descricao.', {
        max: { titulo: 120, descricao: 240 },
      });
    }

    const created = await createCadastro(req.auth.condominiumId, {
      tipo,
      titulo,
      descricao,
      status,
    });

    res.status(201).json({ item: created });
  }));

  app.patch('/api/cadastros/:id/status', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const cadastroId = String(req.params.id || '').trim();
    const status = parseEnum(req.body?.status, CADASTRO_STATUSES, 'status');

    if (!cadastroId || !status) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campos id e status sao obrigatorios.', {
        fields: ['id', 'status'],
      });
    }

    const updated = await updateCadastroStatus(req.auth.condominiumId, cadastroId, status);
    if (!updated) {
      throw new ApiRequestError(404, 'NOT_FOUND', 'Cadastro nao encontrado.');
    }

    res.json({ item: updated });
  }));

  app.get('/api/chat/bootstrap', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const payload = await getChatBootstrap(req.auth.condominiumId);
    res.json(payload);
  }));

  app.get('/api/alerts', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const payload = await getAlertsData(req.auth.condominiumId);
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

  app.post('/api/chat/message', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const messageRaw = req.body?.message;
    const message = typeof messageRaw === 'string' ? messageRaw.trim() : '';
    if (!message) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo message e obrigatorio.', {
        field: 'message',
      });
    }
    if (message.length > 2000) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo message excede tamanho maximo permitido.', {
        field: 'message',
        maxLength: 2000,
      });
    }

    const payload = await askChat(message);
    res.json(payload);
  }));

  app.get('/api/security/audit', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin']), asyncRoute(async (req, res) => {
    const event = req.query.event ? String(req.query.event).trim() : undefined;
    const actorSub = req.query.actorSub ? String(req.query.actorSub).trim() : undefined;
    const condominiumId = req.query.condominiumId ? parsePositiveInt(req.query.condominiumId, 1, 'condominiumId') : undefined;
    const from = parseIsoDatetime(req.query.from, 'from');
    const to = parseIsoDatetime(req.query.to, 'to');
    const limit = Math.min(parsePositiveInt(req.query.limit, 100, 'limit'), 500);
    if (from && to && Date.parse(from) > Date.parse(to)) {
      throw new ApiRequestError(400, 'INVALID_QUERY_PARAM', 'Intervalo de datas invalido: from deve ser menor ou igual a to.', {
        fields: ['from', 'to'],
      });
    }

    const items = await querySecurityAuditEvents(resolvedConfig, {
      event,
      actorSub,
      condominiumId,
      from,
      to,
      limit,
    });

    logSecurityEvent(resolvedConfig, 'audit_log_viewed', req, {
      filters: { event: event || null, actorSub: actorSub || null, condominiumId: condominiumId || null, from: from || null, to: to || null },
      returned: items.length,
    });

    res.json({
      items,
      meta: {
        returned: items.length,
        limit,
      },
      filters: {
        event: event || null,
        actorSub: actorSub || null,
        condominiumId: condominiumId || null,
        from: from || null,
        to: to || null,
      },
    });
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
  const resolvedConfig = {
    ...getServerConfig(),
    ...config,
  };
  const app = createApp(resolvedConfig);
  const server = app.listen(resolvedConfig.port, () => {
    console.log(`CondoGuard API running on http://localhost:${resolvedConfig.port} (${resolvedConfig.dbDialect})`);
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
