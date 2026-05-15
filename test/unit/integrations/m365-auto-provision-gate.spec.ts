import { AppConfig } from '@src/shared/config/app-config';
import { CreateEmployeeService } from '@src/modules/organization/application/create-employee.service';
import { createSeededInMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-org-unit.repository';
import { createSeededInMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person-org-membership.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { InMemoryDirectorySyncStateRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-directory-sync-state.repository';
import { InMemoryM365DirectoryReconciliationRecordRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-m365-directory-reconciliation-record.repository';
import { InMemoryPersonExternalIdentityLinkRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-person-external-identity-link.repository';
import { InMemoryM365DirectoryAdapter } from '@src/modules/integrations/m365/infrastructure/adapters/in-memory-m365-directory.adapter';
import { M365DirectorySyncService } from '@src/modules/integrations/m365/application/m365-directory-sync.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

function stubPrisma(): PrismaService {
  return {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
  } as unknown as PrismaService;
}

function buildConfig(): AppConfig {
  process.env.M365_DIRECTORY_DEFAULT_ORG_UNIT_ID = '22222222-2222-2222-2222-222222222005';
  process.env.M365_DIRECTORY_MATCH_STRATEGY = 'email';
  return new AppConfig();
}

function stubPlatformSettings(value: unknown): PlatformSettingsService {
  return {
    getRawValue: async (key: string) =>
      key === 'sso.autoProvisionUsers' ? value : null,
  } as unknown as PlatformSettingsService;
}

function buildService(platformSettings?: PlatformSettingsService): M365DirectorySyncService {
  const personRepository = createSeededInMemoryPersonRepository();
  return new M365DirectorySyncService(
    new InMemoryM365DirectoryAdapter([
      {
        accountEnabled: true,
        displayName: 'Greta Vasquez',
        externalUserId: 'aad-user-new-greta',
        jobTitle: 'Site Reliability Engineer',
        mail: 'greta.vasquez@example.com',
        userPrincipalName: 'greta.vasquez@example.com',
      },
    ]),
    personRepository,
    new CreateEmployeeService(
      personRepository,
      createSeededInMemoryOrgUnitRepository(),
      createSeededInMemoryPersonOrgMembershipRepository(),
      stubPrisma(),
    ),
    new InMemoryPersonExternalIdentityLinkRepository(),
    new InMemoryM365DirectoryReconciliationRecordRepository(),
    new InMemoryDirectorySyncStateRepository(),
    buildConfig(),
    platformSettings,
  );
}

describe('D-156 — M365 sync respects sso.autoProvisionUsers', () => {
  it('creates a Person when the setting is ON (default)', async () => {
    const svc = buildService(stubPlatformSettings(true));
    const result = await svc.syncDirectory();
    expect(result.employeesCreated).toBe(1);
  });

  it('creates a Person when no PlatformSettingsService is wired (legacy default)', async () => {
    const svc = buildService(undefined);
    const result = await svc.syncDirectory();
    expect(result.employeesCreated).toBe(1);
  });

  it('does NOT create a Person when the setting is OFF — routes to UNMATCHED', async () => {
    const svc = buildService(stubPlatformSettings(false));
    const result = await svc.syncDirectory();
    expect(result.employeesCreated).toBe(0);
    expect(result.employeesLinked).toBe(0);
  });
});
