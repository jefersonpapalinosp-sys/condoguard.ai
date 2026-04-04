import { notifyUnauthorized } from './authEvents';
import { getAccessToken } from './authTokenStore';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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

async function performRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
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
      if (response.status === 401) {
        notifyUnauthorized();
      }
      throw new ApiError(`HTTP ${response.status}`, response.status);
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
