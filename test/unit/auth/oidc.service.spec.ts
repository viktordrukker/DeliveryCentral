import { UnauthorizedException } from '@nestjs/common';

import { OidcService } from '@src/modules/auth/oidc.service';

/**
 * Focused unit tests for OidcService. The openid-client library itself
 * is exercised behind an integration harness (mock OIDC server in
 * `tests/integrations/mock-oidc/` — F-5 follow-up). Here we cover the
 * pieces that can be tested without round-tripping a discovery
 * document: config loading, error paths, source coercion.
 */
describe('OidcService — config + error paths', () => {
  const buildService = (overrides: Partial<{
    settings: Record<string, unknown>;
  }> = {}): OidcService => {
    const settings = overrides.settings ?? {};
    const platformSettings = {
      getRawValue: jest.fn(async (key: string) => settings[key] ?? null),
    } as never;
    const prisma = {} as never;
    const tokenService = {} as never;
    return new OidcService(platformSettings, prisma, tokenService);
  };

  it('throws Unauthorized when sso.idp.* settings are missing', async () => {
    const svc = buildService({ settings: {} });
    await expect(svc.beginLogin()).rejects.toThrow(UnauthorizedException);
    await expect(svc.beginLogin()).rejects.toThrow(/OIDC is not configured/);
  });

  it('throws Unauthorized when only clientSecret is missing', async () => {
    const svc = buildService({
      settings: {
        'sso.idp.issuerUrl': 'https://example.com/.well-known/openid-configuration',
        'sso.idp.clientId': 'client-id',
      },
    });
    await expect(svc.beginLogin()).rejects.toThrow(/OIDC is not configured/);
  });

  it('treats empty-string values as missing', async () => {
    const svc = buildService({
      settings: {
        'sso.idp.issuerUrl': '',
        'sso.idp.clientId': 'client-id',
        'sso.idp.clientSecret': 'secret',
      },
    });
    await expect(svc.beginLogin()).rejects.toThrow(/OIDC is not configured/);
  });

  it('coerces unknown source values to azure_ad', async () => {
    // Reach into the private coerceSource via type cast — pure-function
    // invariant test, no DI needed.
    const svc = buildService();
    const coerce = (svc as unknown as { coerceSource: (v: string | null) => string }).coerceSource;
    expect(coerce.call(svc, null)).toBe('azure_ad');
    expect(coerce.call(svc, 'azure_ad')).toBe('azure_ad');
    expect(coerce.call(svc, 'okta')).toBe('okta');
    expect(coerce.call(svc, 'google')).toBe('google');
    expect(coerce.call(svc, 'something-weird')).toBe('azure_ad');
  });

  it('falls back redirectUri to BACKEND_PUBLIC_URL env when setting absent', async () => {
    const oldEnv = process.env.BACKEND_PUBLIC_URL;
    process.env.BACKEND_PUBLIC_URL = 'https://api.bank.example';
    try {
      const svc = buildService({
        settings: {
          'sso.idp.issuerUrl': 'https://idp.example/.well-known/openid-configuration',
          'sso.idp.clientId': 'client-id',
          'sso.idp.clientSecret': 'secret',
        },
      });
      // private method via reflection — verifies the env fallback shape
      const cfg = await (svc as unknown as { loadConfig: () => Promise<{ redirectUri: string }> }).loadConfig();
      expect(cfg.redirectUri).toBe('https://api.bank.example/api/auth/oidc/callback');
    } finally {
      if (oldEnv === undefined) delete process.env.BACKEND_PUBLIC_URL;
      else process.env.BACKEND_PUBLIC_URL = oldEnv;
    }
  });
});
