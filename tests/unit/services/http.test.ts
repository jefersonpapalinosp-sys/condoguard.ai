import { beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/services/authEvents', () => ({
  notifyUnauthorized: vi.fn(),
}));

describe('http.requestJson', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('retries on 5xx and succeeds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

    const { requestJson } = await import('../../../src/services/http');

    const result = await requestJson<{ ok: boolean }>('/api/health');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);
    const { requestJson, ApiError } = await import('../../../src/services/http');

    await expect(requestJson('/api/not-found')).rejects.toBeInstanceOf(ApiError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('emits unauthorized event on 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'x-trace-id': 'trace-401' }),
      json: async () => ({ error: { code: 'INVALID_TOKEN', message: 'Token invalido.', traceId: 'trace-401' } }),
    } as unknown as Response);
    const { requestJson } = await import('../../../src/services/http');
    const { notifyUnauthorized } = await import('../../../src/services/authEvents');

    await expect(requestJson('/api/protected')).rejects.toMatchObject({ status: 401 });
    expect(notifyUnauthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: 'INVALID_TOKEN',
        traceId: 'trace-401',
      }),
    );
  });

  it('surfaces trace id and code on API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'x-trace-id': 'trace-403' }),
      json: async () => ({ error: { code: 'FORBIDDEN', message: 'Sem permissao.', traceId: 'trace-403' } }),
    } as unknown as Response);
    const { requestJson } = await import('../../../src/services/http');

    await expect(requestJson('/api/forbidden')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      traceId: 'trace-403',
      message: 'Sem permissao.',
    });
  });

  it('throws a timeout error when request hangs', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    const { requestJson, ApiError } = await import('../../../src/services/http');
    await expect(requestJson('/api/health')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: expect.stringContaining('Timeout'),
      }),
    );

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(ApiError).toBeDefined();
  });
});
