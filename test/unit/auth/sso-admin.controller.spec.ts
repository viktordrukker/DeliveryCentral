import {
  SsoAdminController,
  UpdateSsoConfigDto,
} from '@src/modules/auth/sso-admin.controller';
import type { SsoAdminService } from '@src/modules/auth/sso-admin.service';

/**
 * NEW-LGL-2 — SsoAdminController unit tests.
 *
 * Verifies the controller wires GET/PUT/POST to the service correctly,
 * stamps actorId from the request principal (D-103 pattern), and never
 * leaks the encrypted ciphertext or plaintext secret on GET.
 */
describe('SsoAdminController — NEW-LGL-2', () => {
  function makeFixture() {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const serviceMock = {
      getConfig: jest.fn(async () => {
        calls.push({ method: 'getConfig', args: [] });
        return {
          provider: 'oidc' as const,
          clientId: 'cid',
          discoveryUrl: 'https://idp.example/.well-known/openid-configuration',
          clientSecretSet: true,
          autoProvisionUsers: true,
        };
      }),
      updateConfig: jest.fn(async (body: unknown, actorId: string | null) => {
        calls.push({ method: 'updateConfig', args: [body, actorId] });
        return {
          provider: 'azure_ad' as const,
          clientId: 'next-cid',
          discoveryUrl: 'https://idp.example/.well-known/openid-configuration',
          clientSecretSet: true,
          autoProvisionUsers: true,
        };
      }),
      testConnection: jest.fn(async () => {
        calls.push({ method: 'testConnection', args: [] });
        return { ok: true, issuer: 'https://idp.example' };
      }),
    } as unknown as SsoAdminService;
    const controller = new SsoAdminController(serviceMock);
    return { controller, serviceMock, calls };
  }

  it('getConfig proxies to the service', async () => {
    const { controller, calls } = makeFixture();
    const cfg = await controller.getConfig();
    expect(calls).toEqual([{ method: 'getConfig', args: [] }]);
    expect(cfg.clientSecretSet).toBe(true);
    // clientSecret field is never present on the wire.
    expect('clientSecret' in cfg).toBe(false);
  });

  it('updateConfig stamps actorId from principal.personId', async () => {
    const { controller, calls } = makeFixture();
    const dto: UpdateSsoConfigDto = {
      provider: 'azure_ad',
      clientId: 'next-cid',
      discoveryUrl: 'https://idp.example/.well-known/openid-configuration',
      clientSecret: 'fresh-secret',
      autoProvisionUsers: true,
    };
    await controller.updateConfig(dto, { principal: { personId: 'person-1' } });
    expect(calls[0].args[1]).toBe('person-1');
  });

  it('updateConfig falls back to principal.userId when personId is missing', async () => {
    const { controller, calls } = makeFixture();
    const dto: UpdateSsoConfigDto = {
      provider: 'azure_ad',
      clientId: 'next-cid',
      discoveryUrl: 'https://idp.example/.well-known/openid-configuration',
      autoProvisionUsers: false,
    };
    await controller.updateConfig(dto, { principal: { userId: 'user-1' } });
    expect(calls[0].args[1]).toBe('user-1');
  });

  it('updateConfig stamps null actorId when no principal is attached', async () => {
    const { controller, calls } = makeFixture();
    const dto: UpdateSsoConfigDto = {
      provider: 'oidc',
      clientId: '',
      discoveryUrl: '',
      autoProvisionUsers: false,
    };
    await controller.updateConfig(dto, {});
    expect(calls[0].args[1]).toBeNull();
  });

  it('testConnection proxies to the service', async () => {
    const { controller, calls } = makeFixture();
    const result = await controller.testConnection();
    expect(calls).toEqual([{ method: 'testConnection', args: [] }]);
    expect(result.ok).toBe(true);
  });
});
