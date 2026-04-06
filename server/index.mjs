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
import { getAlertsData, markAlertAsRead } from './repositories/alertsRepo.mjs';
import { getChatBootstrap, askChat } from './repositories/chatRepo.mjs';
import { getChatIntentCatalog } from './repositories/chatIntentsRepo.mjs';
import {
  getObservabilityMetricsSnapshot,
  recordApiErrorCodeMetric,
  recordApiRequestMetric,
  resetObservabilityMetrics,
} from './observability/metricsStore.mjs';
import {
  getChatTelemetrySnapshot,
  recordChatErrorTelemetry,
  recordChatFeedbackTelemetry,
  recordChatMessageTelemetry,
  resetChatTelemetryStore,
} from './repositories/chatTelemetryRepo.mjs';
import { buildChatContext } from './services/chatContextService.mjs';
import { getInvoicesData, markInvoiceAsPaid } from './repositories/invoicesRepo.mjs';
import { getManagementUnitsData } from './repositories/managementRepo.mjs';
import { listCadastros, createCadastro, updateCadastroStatus } from './repositories/cadastrosRepo.mjs';
import { findAccountForLogin } from './repositories/authRepo.mjs';

const INVOICE_STATUSES = ['pending', 'paid', 'overdue'];
const ALERT_SEVERITIES = ['critical', 'warning', 'info'];
const ALERT_STATUSES = ['active', 'read'];
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

function parseSortOrder(value) {
  if (value == null || value === '') {
    return 'asc';
  }

  const normalized = String(value).toLowerCase();
  if (normalized !== 'asc' && normalized !== 'desc') {
    throw new ApiRequestError(400, 'INVALID_ENUM_VALUE', 'sortOrder invalido.', {
      field: 'sortOrder',
      allowed: ['asc', 'desc'],
      value: normalized,
    });
  }

  return normalized;
}

function parseSortBy(value, allowed) {
  if (value == null || value === '') {
    return allowed[0];
  }

  const normalized = String(value).trim();
  if (!allowed.includes(normalized)) {
    throw new ApiRequestError(400, 'INVALID_ENUM_VALUE', 'sortBy invalido.', {
      field: 'sortBy',
      allowed,
      value: normalized,
    });
  }

  return normalized;
}

function compareForSort(left, right) {
  const leftNumber = typeof left === 'number' ? left : Number.NaN;
  const rightNumber = typeof right === 'number' ? right : Number.NaN;
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  const leftDate = Date.parse(String(left || ''));
  const rightDate = Date.parse(String(right || ''));
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left || '').localeCompare(String(right || ''), 'pt-BR', { sensitivity: 'base' });
}

function sortCollection(list, sortBy, sortOrder, selectors) {
  const getValue = selectors[sortBy];
  if (!getValue) {
    return list;
  }

  const direction = sortOrder === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => direction * compareForSort(getValue(a), getValue(b)));
}

function buildUnitKey(block, unit) {
  return `${String(block || '').trim().toUpperCase()}-${String(unit || '').trim()}`;
}

function normalizeInvoiceUnitKey(unit) {
  return String(unit || '').trim().toUpperCase();
}

function computeManagementIndicators(units, invoices, cadastros) {
  const totalUnits = units.length;
  const occupiedCount = units.filter((item) => item.status === 'occupied').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

  const occupiedUnitKeys = new Set(
    units
      .filter((item) => item.status === 'occupied')
      .map((item) => buildUnitKey(item.block, item.unit)),
  );

  const overdueUnitKeys = new Set(
    invoices
      .filter((item) => item.status === 'overdue')
      .map((item) => normalizeInvoiceUnitKey(item.unit)),
  );

  let delinquencyUnits = 0;
  occupiedUnitKeys.forEach((unitKey) => {
    if (overdueUnitKeys.has(unitKey)) {
      delinquencyUnits += 1;
    }
  });

  const delinquencyRate = occupiedCount > 0 ? Math.round((delinquencyUnits / occupiedCount) * 100) : 0;

  const maintenanceCount = units.filter((item) => item.status === 'maintenance').length;
  const cadastrosPending = cadastros.filter((item) => item.status === 'pending').length;
  const pendingCount = maintenanceCount + cadastrosPending;

  return {
    occupancy: {
      totalUnits,
      occupiedCount,
      occupancyRate,
    },
    delinquency: {
      delinquencyUnits,
      occupiedUnits: occupiedCount,
      delinquencyRate,
    },
    pending: {
      maintenanceCount,
      cadastrosPending,
      pendingCount,
    },
  };
}

function filterAndSortInvoices(items, query) {
  const status = parseEnum(query.status, INVOICE_STATUSES, 'status');
  const unit = query.unit ? String(query.unit).trim().toLowerCase() : undefined;
  const search = query.search ? String(query.search).trim().toLowerCase() : undefined;
  const sortBy = parseSortBy(query.sortBy, ['dueDate', 'amount', 'unit', 'resident', 'reference', 'status']);
  const sortOrder = parseSortOrder(query.sortOrder);

  const filtered = items.filter((item) => {
    const statusOk = status ? item.status === status : true;
    const unitOk = unit ? item.unit.toLowerCase().includes(unit) : true;
    const searchOk = search
      ? item.unit.toLowerCase().includes(search)
        || item.resident.toLowerCase().includes(search)
        || item.reference.toLowerCase().includes(search)
      : true;
    return statusOk && unitOk && searchOk;
  });

  const sorted = sortCollection(filtered, sortBy, sortOrder, {
    dueDate: (item) => item.dueDate,
    amount: (item) => item.amount,
    unit: (item) => item.unit,
    resident: (item) => item.resident,
    reference: (item) => item.reference,
    status: (item) => item.status,
  });

  return {
    items: sorted,
    filters: {
      status: status ?? null,
      unit: unit ?? null,
      search: search ?? null,
    },
    sort: { sortBy, sortOrder },
  };
}

function csvCell(value) {
  const raw = value == null ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

function toInvoicesCsv(items) {
  const header = ['id', 'condominiumId', 'unit', 'resident', 'reference', 'dueDate', 'amount', 'status'];
  const lines = items.map((item) => [
    item.id,
    item.condominiumId ?? '',
    item.unit,
    item.resident,
    item.reference,
    item.dueDate,
    item.amount,
    item.status,
  ]);

  return [header, ...lines]
    .map((cols) => cols.map((col) => csvCell(col)).join(','))
    .join('\n');
}

function buildObservabilityAlerts(metrics, thresholds) {
  const alerts = [];

  if (metrics.latency.p95Ms >= thresholds.latencyP95WarnMs) {
    alerts.push({
      id: 'latency_p95_high',
      severity: 'warning',
      message: `P95 de latencia acima do limite (${metrics.latency.p95Ms}ms >= ${thresholds.latencyP95WarnMs}ms).`,
      value: metrics.latency.p95Ms,
      threshold: thresholds.latencyP95WarnMs,
    });
  }

  if (metrics.counters.errorRatePct >= thresholds.errorRateWarnPct) {
    alerts.push({
      id: 'error_rate_high',
      severity: 'critical',
      message: `Taxa de erro acima do limite (${metrics.counters.errorRatePct}% >= ${thresholds.errorRateWarnPct}%).`,
      value: metrics.counters.errorRatePct,
      threshold: thresholds.errorRateWarnPct,
    });
  }

  if (metrics.fallbacks.total >= thresholds.fallbackWarnCount) {
    alerts.push({
      id: 'fallback_rate_high',
      severity: 'warning',
      message: `Fallback de dados acima do limite (${metrics.fallbacks.total} >= ${thresholds.fallbackWarnCount}).`,
      value: metrics.fallbacks.total,
      threshold: thresholds.fallbackWarnCount,
    });
  }

  return alerts;
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
  resetObservabilityMetrics();
  resetChatTelemetryStore();

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
  app.use('/api', (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      recordApiRequestMetric({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latencyMs: Date.now() - startedAt,
      });
    });
    next();
  });

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
    const listing = filterAndSortInvoices(payload.items, req.query);
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');
    const { data, meta } = paginate(listing.items, page, pageSize);

    res.json({
      items: data,
      meta,
      filters: listing.filters,
      sort: listing.sort,
    });
  }));

  app.get('/api/invoices/export.csv', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const payload = await getInvoicesData(req.auth.condominiumId);
    const listing = filterAndSortInvoices(payload.items, req.query);
    const csv = toInvoicesCsv(listing.items);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-export-${Date.now()}.csv"`);
    res.status(200).send(csv);
  }));

  app.patch('/api/invoices/:id/pay', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const invoiceId = String(req.params.id || '').trim();
    if (!invoiceId) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Parametro id e obrigatorio.', { field: 'id' });
    }

    const updated = await markInvoiceAsPaid(req.auth.condominiumId, invoiceId, req.auth.sub || null);
    if (!updated) {
      throw new ApiRequestError(404, 'NOT_FOUND', 'Fatura nao encontrada.');
    }

    logSecurityEvent(resolvedConfig, 'invoice_mark_paid', req, { invoiceId });
    res.json({ item: updated });
  }));

  app.get('/api/management/units', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const [payload, invoicesPayload, cadastrosPayload] = await Promise.all([
      getManagementUnitsData(req.auth.condominiumId),
      getInvoicesData(req.auth.condominiumId),
      listCadastros(req.auth.condominiumId),
    ]);
    const status = parseEnum(req.query.status, MANAGEMENT_STATUSES, 'status');
    const block = parseEnum(req.query.block, MANAGEMENT_BLOCKS.map((v) => v.toLowerCase()), 'block');
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');
    const sortBy = parseSortBy(req.query.sortBy, ['block', 'unit', 'resident', 'status', 'lastUpdate']);
    const sortOrder = parseSortOrder(req.query.sortOrder);

    const filtered = payload.units.filter((item) => {
      const statusOk = status ? item.status === status : true;
      const blockOk = block ? item.block.toLowerCase() === block : true;
      const searchOk = search
        ? item.block.toLowerCase().includes(search)
          || item.unit.toLowerCase().includes(search)
          || item.resident.toLowerCase().includes(search)
        : true;
      return statusOk && blockOk && searchOk;
    });
    const sorted = sortCollection(filtered, sortBy, sortOrder, {
      block: (item) => item.block,
      unit: (item) => item.unit,
      resident: (item) => item.resident,
      status: (item) => item.status,
      lastUpdate: (item) => item.lastUpdate,
    });
    const { data, meta } = paginate(sorted, page, pageSize);
    const indicators = computeManagementIndicators(payload.units, invoicesPayload.items, cadastrosPayload.items);

    res.json({
      items: data,
      units: data,
      indicators,
      meta,
      filters: {
        status: status ?? null,
        block: block ? block.toUpperCase() : null,
        search: search ?? null,
      },
      sort: { sortBy, sortOrder },
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

  app.get('/api/chat/intents', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (_req, res) => {
    const payload = getChatIntentCatalog();
    res.json(payload);
  }));

  app.get('/api/chat/context', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const payload = await buildChatContext(req.auth.condominiumId);
    res.json(payload);
  }));

  app.get('/api/chat/telemetry', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin', 'sindico']), asyncRoute(async (req, res) => {
    const limit = Math.min(parsePositiveInt(req.query.limit, 20, 'limit'), 100);
    const payload = getChatTelemetrySnapshot(req.auth.condominiumId, { limit });
    res.json(payload);
  }));

  app.get('/api/observability/metrics', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin']), asyncRoute(async (req, res) => {
    const routeLimit = Math.min(parsePositiveInt(req.query.routeLimit, 10, 'routeLimit'), 100);
    const codeLimit = Math.min(parsePositiveInt(req.query.codeLimit, 10, 'codeLimit'), 100);
    const payload = getObservabilityMetricsSnapshot({ routeLimit, codeLimit });
    res.json(payload);
  }));

  app.get('/api/observability/alerts', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, ['admin']), asyncRoute(async (_req, res) => {
    const metrics = getObservabilityMetricsSnapshot({ routeLimit: 20, codeLimit: 20 });
    const thresholds = resolvedConfig.observability?.thresholds || {
      latencyP95WarnMs: 1200,
      errorRateWarnPct: 5,
      fallbackWarnCount: 3,
    };

    const items = buildObservabilityAlerts(metrics, thresholds);
    res.json({
      generatedAt: new Date().toISOString(),
      channel: resolvedConfig.observability?.alertChannel || 'log',
      thresholds,
      hasAlerts: items.length > 0,
      items,
    });
  }));

  app.get('/api/alerts', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const payload = await getAlertsData(req.auth.condominiumId);
    const severity = parseEnum(req.query.severity, ALERT_SEVERITIES, 'severity');
    const status = parseEnum(req.query.status, ALERT_STATUSES, 'status');
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 'pageSize');
    const sortBy = parseSortBy(req.query.sortBy, ['severity', 'title', 'time', 'status', 'readAt']);
    const sortOrder = parseSortOrder(req.query.sortOrder);
    const filtered = payload.items.filter((item) => {
      const severityOk = severity ? item.severity === severity : true;
      const statusOk = status ? item.status === status : true;
      const searchOk = search
        ? item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search)
        : true;
      return severityOk && statusOk && searchOk;
    });
    const sorted = sortCollection(filtered, sortBy, sortOrder, {
      severity: (item) => item.severity,
      title: (item) => item.title,
      time: (item) => item.time,
      status: (item) => item.status,
      readAt: (item) => item.readAt || '',
    });
    const { data, meta } = paginate(sorted, page, pageSize);

    res.json({
      activeCount: payload.activeCount,
      items: data,
      meta,
      filters: {
        severity: severity ?? null,
        status: status ?? null,
        search: search ?? null,
      },
      sort: { sortBy, sortOrder },
    });
  }));

  app.patch('/api/alerts/:id/read', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const alertId = String(req.params.id || '').trim();
    if (!alertId) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Parametro id e obrigatorio.', { field: 'id' });
    }

    const updated = await markAlertAsRead(req.auth.condominiumId, alertId, req.auth.sub || null);
    if (!updated) {
      throw new ApiRequestError(404, 'NOT_FOUND', 'Alerta nao encontrado.');
    }

    logSecurityEvent(resolvedConfig, 'alert_mark_read', req, { alertId });
    res.json({ item: updated });
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

    let payload;
    try {
      payload = await askChat(message, req.auth.condominiumId);
    } catch (error) {
      recordChatErrorTelemetry(req.auth.condominiumId, error?.code || error?.name || 'CHAT_ERROR');
      throw error;
    }
    recordChatMessageTelemetry(req.auth.condominiumId, payload);
    res.json(payload);
  }));

  app.post('/api/chat/feedback', requireAuth(resolvedConfig), requireTenant(resolvedConfig), requireRole(resolvedConfig, AUTH_ROLES), asyncRoute(async (req, res) => {
    const messageId = String(req.body?.messageId || '').trim();
    const rating = String(req.body?.rating || '').trim().toLowerCase();
    const comment = req.body?.comment == null ? '' : String(req.body?.comment).trim();

    if (!messageId || messageId.length > 120) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo messageId invalido.', {
        field: 'messageId',
        maxLength: 120,
      });
    }

    if (rating !== 'up' && rating !== 'down') {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo rating invalido.', {
        field: 'rating',
        allowed: ['up', 'down'],
      });
    }

    if (comment.length > 500) {
      throw new ApiRequestError(400, 'INVALID_BODY', 'Campo comment excede tamanho maximo permitido.', {
        field: 'comment',
        maxLength: 500,
      });
    }

    recordChatFeedbackTelemetry(req.auth.condominiumId, {
      messageId,
      rating,
      comment: comment || null,
    });
    logSecurityEvent(resolvedConfig, 'chat_feedback_submitted', req, { messageId, rating });
    res.status(201).json({ ok: true });
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
      recordApiErrorCodeMetric(code);
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
