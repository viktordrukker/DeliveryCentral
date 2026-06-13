import { UnauthorizedException } from '@nestjs/common';

import { OidcService } from './oidc.service';

/**
 * EPIC D / D1 — OIDC auto-provision governance + IdP role mapping.
 *
 * Tests the provision-or-login decision directly (the OIDC token exchange is
 * out of scope here): a verified identity we don't know is only auto-created
 * when sso.autoProvisionUsers is ON, and the IdP `roles` claim maps to platform
 * roles on first provision.
 */
describe('OidcService — provision governance (EPIC D / D1)', () => {
  function makeService(opts: { existing: unknown; autoProvision: unknown }) {
    const localAccount = {
      findUnique: jest.fn().mockResolvedValue(opts.existing),
      upsert: jest.fn().mockImplementation(({ create }: { create: { roles: string[] } }) =>
        Promise.resolve({ id: 'acc-1', personId: null, email: 'u@bank.test', roles: create.roles }),
      ),
    };
    const prisma = { localAccount } as never;
    const platformSettings = { getRawValue: jest.fn().mockResolvedValue(opts.autoProvision) } as never;
    const service = new OidcService(platformSettings, prisma, {} as never);
    return { service, localAccount };
  }

  const call = (service: OidcService, roleClaim: unknown) =>
    (service as unknown as {
      provisionAccountForLogin: (i: {
        email: string;
        displayName: string;
        source: string;
        roleClaim: unknown;
      }) => Promise<{ roles: string[] }>;
    }).provisionAccountForLogin({ email: 'u@bank.test', displayName: 'U', source: 'OIDC', roleClaim });

  it('rejects an unknown identity when auto-provisioning is OFF (no account created)', async () => {
    const { service, localAccount } = makeService({ existing: null, autoProvision: false });
    await expect(call(service, ['admin'])).rejects.toBeInstanceOf(UnauthorizedException);
    expect(localAccount.upsert).not.toHaveBeenCalled();
  });

  it('auto-provisions an unknown identity when ON, mapping the IdP roles claim to platform roles', async () => {
    const { service, localAccount } = makeService({ existing: null, autoProvision: true });
    const account = await call(service, ['admin', 'not_a_real_role', 'project_manager']);
    expect(localAccount.upsert).toHaveBeenCalled();
    // Only valid platform roles survive the mapping.
    expect(account.roles).toEqual(['admin', 'project_manager']);
  });

  it('logs in an existing account regardless of the auto-provision setting', async () => {
    const { service, localAccount } = makeService({ existing: { id: 'acc-1' }, autoProvision: false });
    await expect(call(service, [])).resolves.toBeDefined();
    expect(localAccount.upsert).toHaveBeenCalled();
  });
});
