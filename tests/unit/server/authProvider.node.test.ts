// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';

describe('verifyAccessToken', () => {
  it('validates local_jwt token and normalizes payload', async () => {
    const { verifyAccessToken } = await import('../../../server/auth/authProvider.mjs');
    const token = jwt.sign(
      { sub: 'admin@condoguard.ai', role: 'admin', condominium_id: 1 },
      'test-secret',
      { expiresIn: '1h' },
    );

    const payload = await verifyAccessToken(token, {
      authProvider: 'local_jwt',
      jwtSecret: 'test-secret',
    } as any);

    expect(payload).toEqual({
      sub: 'admin@condoguard.ai',
      role: 'admin',
      condominiumId: 1,
    });
  });

  it('validates oidc_jwks token using JWKS and mapped claims', async () => {
    vi.resetModules();
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
    const kid = 'kid-1';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig', kty: 'RSA' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const token = jwt.sign(
      {
        sub: 'oidc-user-1',
        roles: ['sindico'],
        condominium_id: 2,
      },
      privateKey,
      {
        algorithm: 'RS256',
        header: { kid },
        issuer: 'https://issuer.example.com',
        audience: 'condoguard-api',
        expiresIn: '1h',
      },
    );

    const { verifyAccessToken } = await import('../../../server/auth/authProvider.mjs');
    const payload = await verifyAccessToken(token, {
      authProvider: 'oidc_jwks',
      oidc: {
        issuer: 'https://issuer.example.com',
        audience: 'condoguard-api',
        jwksUrl: 'https://issuer.example.com/.well-known/jwks.json',
        roleClaim: 'roles',
        tenantClaim: 'condominium_id',
        allowedAlgs: ['RS256'],
      },
    } as any);

    expect(payload).toEqual({
      sub: 'oidc-user-1',
      role: 'sindico',
      condominiumId: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
