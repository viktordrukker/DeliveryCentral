import { BadRequestException } from '@nestjs/common';

import { SsoAdminService, type SsoUpdateInput } from '@src/modules/auth/sso-admin.service';

/**
 * NEW-LGL-2 — SsoAdminService unit tests.
 *
 * Covers PlatformSetting read/write, encrypted-secret round-trip, secret
 * masking on GET, and the live `fetch` path used by `testConnection`.
 */
describe('SsoAdminService — NEW-LGL-2', () => {
  function makeFixture() {
    const store = new Map<string, unknown>();
    const platformSettings = {
      getRawValue: jest.fn(async (key: string) =>
        store.has(key) ? store.get(key) : null,
      ),
      updateKey: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
        return { key, value, updatedBy: null, updatedAt: new Date().toISOString() };
      }),
    } as never;
    const appConfig = {
      authJwtSecret: 'unit-test-secret-do-not-use-in-prod',
    } as never;
    const service = new SsoAdminService(platformSettings, appConfig);
    return { service, store, platformSettings };
  }

  const baseInput: SsoUpdateInput = {
    provider: 'oidc',
    clientId: 'client-123',
    discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
    clientSecret: 'super-secret-value',
    autoProvisionUsers: true,
  };

  it('getConfig returns defaults when nothing is persisted', async () => {
    const { service } = makeFixture();
    const cfg = await service.getConfig();
    expect(cfg).toEqual({
      provider: 'oidc',
      clientId: '',
      discoveryUrl: '',
      clientSecretSet: false,
      autoProvisionUsers: false,
    });
  });

  it('updateConfig persists all keys and reports clientSecretSet=true', async () => {
    const { service, store } = makeFixture();
    const result = await service.updateConfig(baseInput, 'actor-1');

    expect(result.provider).toBe('oidc');
    expect(result.clientId).toBe('client-123');
    expect(result.discoveryUrl).toBe(baseInput.discoveryUrl);
    expect(result.clientSecretSet).toBe(true);
    expect(result.autoProvisionUsers).toBe(true);

    expect(store.get('sso.provider')).toBe('oidc');
    expect(store.get('sso.clientId')).toBe('client-123');
    expect(store.get('sso.discoveryUrl')).toBe(baseInput.discoveryUrl);
    expect(store.get('sso.autoProvisionUsers')).toBe(true);

    const encrypted = store.get('sso.clientSecretEncrypted');
    expect(typeof encrypted).toBe('string');
    expect((encrypted as string).startsWith('enc:v1:')).toBe(true);
    expect(encrypted).not.toContain('super-secret-value');
  });

  it('updateConfig mirrors to legacy sso.idp.* keys for OidcService', async () => {
    const { service, store } = makeFixture();
    await service.updateConfig({ ...baseInput, provider: 'azure_ad' }, 'actor-1');

    expect(store.get('sso.idp.issuerUrl')).toBe(baseInput.discoveryUrl);
    expect(store.get('sso.idp.clientId')).toBe('client-123');
    expect(store.get('sso.idp.clientSecret')).toBe('super-secret-value');
    expect(store.get('sso.idp.source')).toBe('azure_ad');
  });

  it('omitting clientSecret leaves the existing secret intact', async () => {
    const { service, store } = makeFixture();
    await service.updateConfig(baseInput, 'actor-1');
    const firstCiphertext = store.get('sso.clientSecretEncrypted');

    const noSecretInput: SsoUpdateInput = { ...baseInput };
    delete noSecretInput.clientSecret;
    const result = await service.updateConfig(noSecretInput, 'actor-1');

    expect(result.clientSecretSet).toBe(true);
    expect(store.get('sso.clientSecretEncrypted')).toBe(firstCiphertext);
    // Legacy plaintext mirror still set to the original plaintext.
    expect(store.get('sso.idp.clientSecret')).toBe('super-secret-value');
  });

  it('clientSecret = "" clears the stored secret', async () => {
    const { service, store } = makeFixture();
    await service.updateConfig(baseInput, 'actor-1');
    expect(store.get('sso.clientSecretEncrypted')).toBeTruthy();

    const result = await service.updateConfig({ ...baseInput, clientSecret: '' }, 'actor-1');
    expect(result.clientSecretSet).toBe(false);
    expect(store.get('sso.clientSecretEncrypted')).toBe('');
    expect(store.get('sso.idp.clientSecret')).toBe('');
  });

  it('rejects invalid discoveryUrl shape', async () => {
    const { service } = makeFixture();
    await expect(
      service.updateConfig({ ...baseInput, discoveryUrl: 'not-a-url' }, 'actor-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects clientId set with empty discoveryUrl', async () => {
    const { service } = makeFixture();
    await expect(
      service.updateConfig({ ...baseInput, discoveryUrl: '' }, 'actor-1'),
    ).rejects.toThrow(/discoveryUrl is required/);
  });

  it('GET never returns the encrypted ciphertext blob', async () => {
    const { service } = makeFixture();
    await service.updateConfig(baseInput, 'actor-1');
    const cfg = await service.getConfig();
    const serialized = JSON.stringify(cfg);
    expect(serialized).not.toContain('super-secret-value');
    expect(serialized).not.toContain('enc:v1:');
  });

  it('coerces unknown provider values to oidc', async () => {
    const { service } = makeFixture();
    const result = await service.updateConfig(
      { ...baseInput, provider: 'something-else' as unknown as SsoUpdateInput['provider'] },
      null,
    );
    expect(result.provider).toBe('oidc');
  });

  describe('testConnection', () => {
    const origFetch = global.fetch;
    afterEach(() => {
      global.fetch = origFetch;
    });

    it('returns ok=false when discoveryUrl is not configured', async () => {
      const { service } = makeFixture();
      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/not configured/);
    });

    it('returns ok=true when discovery document is valid', async () => {
      const { service } = makeFixture();
      await service.updateConfig(baseInput, 'actor-1');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          issuer: 'https://idp.example.com',
          authorization_endpoint: 'https://idp.example.com/authorize',
          token_endpoint: 'https://idp.example.com/token',
        }),
      })) as never;

      const result = await service.testConnection();
      expect(result.ok).toBe(true);
      expect(result.issuer).toBe('https://idp.example.com');
      expect(result.authorizationEndpoint).toBe('https://idp.example.com/authorize');
      expect(result.tokenEndpoint).toBe('https://idp.example.com/token');
    });

    it('returns ok=false when discovery document misses required fields', async () => {
      const { service } = makeFixture();
      await service.updateConfig(baseInput, 'actor-1');

      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ issuer: 'https://idp.example.com' }),
      })) as never;

      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/missing required fields/);
    });

    it('returns ok=false when fetch fails', async () => {
      const { service } = makeFixture();
      await service.updateConfig(baseInput, 'actor-1');

      global.fetch = jest.fn(async () => {
        throw new Error('ECONNREFUSED');
      }) as never;

      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/ECONNREFUSED/);
    });

    it('returns ok=false when discovery returns non-2xx', async () => {
      const { service } = makeFixture();
      await service.updateConfig(baseInput, 'actor-1');

      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
      })) as never;

      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/HTTP 404/);
    });
  });
});
