import { notifyUnauthorized } from './authEvents';
import { clearAccessToken, getAccessToken, isStoredSessionExpired, readStoredSession } from './authTokenStore';

export class ApiError extends Error {
  status?: number;
  code?: string;
  traceId?: string;
  details?: unknown;

  constructor(message: string, status?: number, options?: { code?: string; traceId?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.traceId = options?.traceId;
    this.details = options?.details;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const MAX_RETRIES = 2;

function buildUrl(path: string) {
  if (!API_BASE_URL) {
    throw new ApiError('VITE_API_BASE_URL nao configurada.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, API_BASE_URL).toString();
}

function shouldRetry(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (!error.status) {
    return true;
  }

  return error.status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    traceId?: string;
  };
};

function defaultErrorMessage(status: number) {
  if (status === 401) return 'Sessao invalida ou expirada. Faca login novamente.';
  if (status === 403) return 'Acesso negado. Voce nao tem permissao para esta acao.';
  return `HTTP ${status}`;
}

function getUnauthorizedReason(code?: string) {
  if (code === 'SESSION_EXPIRED') return 'expired' as const;
  if (code === 'AUTH_REQUIRED') return 'missing' as const;
  if (code === 'INVALID_TOKEN' || code === 'INVALID_TOKEN_ROLE' || code === 'INVALID_TENANT_SCOPE') return 'invalid' as const;
  return 'unauthorized' as const;
}

async function parseErrorPayload(response: Response): Promise<ApiErrorPayload | null> {
  const candidate = typeof response.clone === 'function' ? response.clone() : response;
  if (typeof candidate.json !== 'function') {
    return null;
  }
  try {
    return (await candidate.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload = await parseErrorPayload(response);
  const code = typeof payload?.error?.code === 'string' ? payload.error.code : undefined;
  const traceIdHeader = typeof response.headers?.get === 'function' ? response.headers.get('x-trace-id') : null;
  const traceId = traceIdHeader ?? (typeof payload?.error?.traceId === 'string' ? payload.error.traceId : undefined);
  const message =
    typeof payload?.error?.message === 'string' && payload.error.message.trim().length > 0
      ? payload.error.message
      : defaultErrorMessage(response.status);

  return new ApiError(message, response.status, {
    code,
    traceId: traceId ?? undefined,
    details: payload?.error?.details,
  });
}

async function performRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const storedSession = readStoredSession();
    if (storedSession && isStoredSessionExpired(storedSession)) {
      clearAccessToken();
      notifyUnauthorized({
        status: 401,
        code: 'SESSION_EXPIRED',
        reason: 'expired',
        message: 'Sessao expirada. Faca login novamente.',
      });
      throw new ApiError('Sessao expirada. Faca login novamente.', 401, { code: 'SESSION_EXPIRED' });
    }

    const token = getAccessToken();
    const response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const apiError = await toApiError(response);
      if (response.status === 401) {
        notifyUnauthorized({
          status: 401,
          code: apiError.code,
          traceId: apiError.traceId,
          message: apiError.message,
          reason: getUnauthorizedReason(apiError.code),
        });
      }
      throw apiError;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Timeout ao acessar API.');
    }

    throw new ApiError('Falha de rede ao acessar API.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MAX_RETRIES) {
    try {
      return await performRequest<T>(path, init);
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === MAX_RETRIES) {
        throw error;
      }

      const backoffMs = 250 * (attempt + 1);
      await wait(backoffMs);
      attempt += 1;
    }
  }

  throw lastError;
}
