import { createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

const jwksCache = new Map();

function ensureObject(value) {
  return value && typeof value === 'object' ? value : null;
}

function parseRoleFromClaims(payload, roleClaim = 'roles') {
  const directRole = String(payload.role || '').trim().toLowerCase();
  if (directRole) {
    return directRole;
  }

  const claimed = payload[roleClaim];
  if (Array.isArray(claimed)) {
    return String(claimed[0] || '').trim().toLowerCase();
  }
  if (typeof claimed === 'string') {
    return claimed.trim().toLowerCase();
  }
  return '';
}

function parseTenantFromClaims(payload, tenantClaim = 'condominium_id') {
  return Number(payload[tenantClaim] || payload.condominium_id || 0) || null;
}

function normalizePayload(payload, oidcConfig = null) {
  const safePayload = ensureObject(payload);
  if (!safePayload) {
    return null;
  }

  return {
    sub: String(safePayload.sub || ''),
    role: oidcConfig ? parseRoleFromClaims(safePayload, oidcConfig.roleClaim) : String(safePayload.role || '').toLowerCase(),
    condominiumId: oidcConfig ? parseTenantFromClaims(safePayload, oidcConfig.tenantClaim) : Number(safePayload.condominium_id || 0) || null,
  };
}

async function fetchJwks(oidcConfig) {
  const cached = jwksCache.get(oidcConfig.jwksUrl);
  if (cached && Date.now() - cached.ts < JWKS_CACHE_TTL_MS) {
    return cached.keys;
  }

  const response = await fetch(oidcConfig.jwksUrl);
  if (!response.ok) {
    throw new Error(`jwks_fetch_failed_${response.status}`);
  }

  const body = await response.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  jwksCache.set(oidcConfig.jwksUrl, { ts: Date.now(), keys });
  return keys;
}

async function getOidcPublicKey(token, oidcConfig) {
  const decoded = jwt.decode(token, { complete: true });
  const header = ensureObject(decoded?.header);
  const kid = String(header?.kid || '');
  const alg = String(header?.alg || '');

  if (!kid || !alg) {
    throw new Error('oidc_missing_kid_or_alg');
  }

  if (!oidcConfig.allowedAlgs.includes(alg)) {
    throw new Error('oidc_alg_not_allowed');
  }

  const keys = await fetchJwks(oidcConfig);
  const jwk = keys.find((key) => key && key.kid === kid);
  if (!jwk) {
    throw new Error('oidc_kid_not_found');
  }

  return createPublicKey({ key: jwk, format: 'jwk' });
}

async function verifyOidcToken(token, config) {
  const oidc = config.oidc || {};
  if (!oidc.issuer || !oidc.audience || !oidc.jwksUrl) {
    throw new Error('oidc_not_configured');
  }

  const key = await getOidcPublicKey(token, oidc);
  const payload = jwt.verify(token, key, {
    algorithms: oidc.allowedAlgs,
    issuer: oidc.issuer,
    audience: oidc.audience,
  });
  return normalizePayload(payload, oidc);
}

function verifyLocalToken(token, config) {
  const payload = jwt.verify(token, config.jwtSecret);
  return normalizePayload(payload, null);
}

export async function verifyAccessToken(token, config) {
  if (config.authProvider === 'oidc_jwks') {
    return verifyOidcToken(token, config);
  }
  return verifyLocalToken(token, config);
}

