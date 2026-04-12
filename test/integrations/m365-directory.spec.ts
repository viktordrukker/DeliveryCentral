import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { AppConfig } from '@src/shared/config/app-config';
import { CreateEmployeeService } from '@src/modules/organization/application/create-employee.service';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { createSeededInMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-org-unit.repository';
import { createSeededInMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person-org-membership.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { InMemoryDirectorySyncStateRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-directory-sync-state.repository';
import { InMemoryM365DirectoryReconciliationRecordRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-m365-directory-reconciliation-record.repository';
import { InMemoryPersonExternalIdentityLinkRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-person-external-identity-link.repository';
import { InMemoryM365DirectoryAdapter } from '@src/modules/integrations/m365/infrastructure/adapters/in-memory-m365-directory.adapter';
import { M365DirectoryReconciliationQueryService } from '@src/modules/integrations/m365/application/m365-directory-reconciliation-query.service';
import { M365DirectorySyncService } from '@src/modules/integrations/m365/application/m365-directory-sync.service';
import { PersonExternalIdentityLink } from '@src/modules/integrations/m365/domain/entities/person-external-identity-link.entity';
import { roleHeaders } from '../helpers/api/auth-headers';

function createConfig() {
  process.env.M365_DIRECTORY_DEFAULT_ORG_UNIT_ID =
    '22222222-2222-2222-2222-222222222005';
  process.env.M365_DIRECTORY_MATCH_STRATEGY = 'email';
  return new AppConfig();
}

describe('M365 directory sync', () => {
  it('imports a new employee and creates an external identity link', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const service = new M365DirectorySyncService(
      new InMemoryM365DirectoryAdapter([
        {
          accountEnabled: true,
          displayName: 'Ivy Dawson',
          externalUserId: 'aad-user-001',
          jobTitle: 'Platform Engineer',
          mail: 'ivy.dawson@example.com',
          sourceUpdatedAt: new Date('2025-03-01T00:00:00.000Z'),
          userPrincipalName: 'ivy.dawson@example.com',
        },
      ]),
      personRepository,
      new CreateEmployeeService(
        personRepository,
        createSeededInMemoryOrgUnitRepository(),
        createSeededInMemoryPersonOrgMembershipRepository(),
      ),
      new InMemoryPersonExternalIdentityLinkRepository(),
      new InMemoryM365DirectoryReconciliationRecordRepository(),
      new InMemoryDirectorySyncStateRepository(),
      createConfig(),
    );

    const result = await service.syncDirectory();
    const createdPerson = await personRepository.findByEmail('ivy.dawson@example.com');

    expect(result.employeesCreated).toBe(1);
    expect(createdPerson?.status).toBe('INACTIVE');
    expect(createdPerson?.name).toBe('Ivy Dawson');
  });

  it('links an existing employee by configured email strategy', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const linkRepository = new InMemoryPersonExternalIdentityLinkRepository();
    const service = new M365DirectorySyncService(
      new InMemoryM365DirectoryAdapter([
        {
          accountEnabled: true,
          displayName: 'Ethan Brooks',
          externalUserId: 'aad-user-ethan',
          mail: 'ethan.brooks@example.com',
          userPrincipalName: 'ethan.brooks@example.com',
        },
      ]),
      personRepository,
      new CreateEmployeeService(
        personRepository,
        createSeededInMemoryOrgUnitRepository(),
        createSeededInMemoryPersonOrgMembershipRepository(),
      ),
      linkRepository,
      new InMemoryM365DirectoryReconciliationRecordRepository(),
      new InMemoryDirectorySyncStateRepository(),
      createConfig(),
    );

    const result = await service.syncDirectory();
    const link = await linkRepository.findByExternalUserId('m365', 'aad-user-ethan');

    expect(result.employeesCreated).toBe(0);
    expect(result.employeesLinked).toBe(1);
    expect(link?.personId).toBe('11111111-1111-1111-1111-111111111008');
    expect(link?.matchedByStrategy).toBe('email');
  });

  it('resolves external manager mapping through imported identity links', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const linkRepository = new InMemoryPersonExternalIdentityLinkRepository();
    const service = new M365DirectorySyncService(
      new InMemoryM365DirectoryAdapter(
        [
          {
            accountEnabled: true,
            displayName: 'Sophia Kim',
            externalUserId: 'aad-mgr-001',
            mail: 'sophia.kim@example.com',
            userPrincipalName: 'sophia.kim@example.com',
          },
          {
            accountEnabled: true,
            displayName: 'Ethan Brooks',
            externalUserId: 'aad-user-ethan',
            mail: 'ethan.brooks@example.com',
            userPrincipalName: 'ethan.brooks@example.com',
          },
        ],
        [
          {
            externalUserId: 'aad-user-ethan',
            managerExternalUserId: 'aad-mgr-001',
          },
        ],
      ),
      personRepository,
      new CreateEmployeeService(
        personRepository,
        createSeededInMemoryOrgUnitRepository(),
        createSeededInMemoryPersonOrgMembershipRepository(),
      ),
      linkRepository,
      new InMemoryM365DirectoryReconciliationRecordRepository(),
      new InMemoryDirectorySyncStateRepository(),
      createConfig(),
    );

    const result = await service.syncDirectory();
    const ethanLink = await linkRepository.findByExternalUserId('m365', 'aad-user-ethan');

    expect(result.managerMappingsResolved).toBe(1);
    expect(ethanLink?.externalManagerUserId).toBe('aad-mgr-001');
    expect(ethanLink?.resolvedManagerPersonId).toBe(
      '11111111-1111-1111-1111-111111111006',
    );
  });

  it('does not destructively overwrite internal person business fields when linking', async () => {
    const internalPerson = Person.register(
      {
        displayName: 'Alex Mercer',
        employmentStatus: 'ACTIVE',
        familyName: 'Mercer',
        givenName: 'Alex',
        primaryEmail: 'alex.mercer@example.com',
        role: 'Internal Role',
        skillsets: ['Architecture'],
      },
      PersonId.from('99999999-9999-9999-9999-999999999001'),
    );
    const personRepository = new InMemoryPersonRepository([internalPerson]);
    const service = new M365DirectorySyncService(
      new InMemoryM365DirectoryAdapter([
        {
          accountEnabled: true,
          displayName: 'Alex Mercer Updated',
          externalUserId: 'aad-alex-001',
          jobTitle: 'External Job Title',
          mail: 'alex.mercer@example.com',
          userPrincipalName: 'alex.mercer@example.com',
        },
      ]),
      personRepository,
      new CreateEmployeeService(
        personRepository,
        createSeededInMemoryOrgUnitRepository(),
        createSeededInMemoryPersonOrgMembershipRepository(),
      ),
      new InMemoryPersonExternalIdentityLinkRepository(),
      new InMemoryM365DirectoryReconciliationRecordRepository(),
      new InMemoryDirectorySyncStateRepository(),
      createConfig(),
    );

    await service.syncDirectory();
    const persistedPerson = await personRepository.findByEmail('alex.mercer@example.com');

    expect(persistedPerson?.displayName).toBe('Alex Mercer');
    expect(persistedPerson?.role).toBe('Internal Role');
    expect(persistedPerson?.skillsets).toEqual(['Architecture']);
  });
});

describe('M365 directory reconciliation review', () => {
  it('classifies matched, unmatched, ambiguous, and stale identities for operator review', async () => {
    const personRepository = createSeededInMemoryPersonRepository();
    const linkRepository = new InMemoryPersonExternalIdentityLinkRepository();
    const reconciliationRepository = new InMemoryM365DirectoryReconciliationRecordRepository();
    const syncStateRepository = new InMemoryDirectorySyncStateRepository();

    await linkRepository.save(
      PersonExternalIdentityLink.create({
        externalPrincipalName: 'stale.person@example.com',
        externalUserId: 'aad-stale-001',
        lastSeenAt: new Date('2026-04-01T00:00:00.000Z'),
        matchedByStrategy: 'email',
        personId: '11111111-1111-1111-1111-111111111006',
        provider: 'm365',
      }),
    );

    const service = new M365DirectorySyncService(
      new InMemoryM365DirectoryAdapter([
        {
          accountEnabled: true,
          displayName: 'Matched Person',
          externalUserId: 'aad-user-ethan',
          mail: 'ethan.brooks@example.com',
          userPrincipalName: 'ethan.brooks@example.com',
        },
        {
          accountEnabled: true,
          displayName: 'Ambiguous First',
          externalUserId: 'aad-duplicate-001',
          mail: 'duplicate.person@example.com',
          userPrincipalName: 'duplicate.person@example.com',
        },
        {
          accountEnabled: true,
          displayName: 'Ambiguous Second',
          externalUserId: 'aad-duplicate-002',
          mail: 'duplicate.person@example.com',
          userPrincipalName: 'duplicate.person@example.com',
        },
        {
          accountEnabled: true,
          displayName: 'Unmatched External',
          externalUserId: 'aad-unmatched-001',
          mail: '',
          userPrincipalName: '',
        },
      ]),
      personRepository,
      new CreateEmployeeService(
        personRepository,
        createSeededInMemoryOrgUnitRepository(),
        createSeededInMemoryPersonOrgMembershipRepository(),
      ),
      linkRepository,
      reconciliationRepository,
      syncStateRepository,
      createConfig(),
    );

    await service.syncDirectory();

    const queryService = new M365DirectoryReconciliationQueryService(
      reconciliationRepository,
      syncStateRepository,
    );
    const review = await queryService.getReview();

    expect(review.summary.matched).toBeGreaterThanOrEqual(1);
    expect(review.summary.ambiguous).toBe(2);
    expect(review.summary.unmatched).toBe(1);
    expect(review.summary.staleConflict).toBe(1);
    expect(review.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'MATCHED',
          externalUserId: 'aad-user-ethan',
        }),
        expect.objectContaining({
          category: 'AMBIGUOUS',
          externalUserId: 'aad-duplicate-001',
        }),
        expect.objectContaining({
          category: 'UNMATCHED',
          externalUserId: 'aad-unmatched-001',
        }),
        expect.objectContaining({
          category: 'STALE_CONFLICT',
          externalUserId: 'aad-stale-001',
        }),
      ]),
    );
  });
});

describe('M365 directory sync API', () => {
  it('POST /integrations/m365/directory/sync imports directory users through the fake adapter', async () => {
    const adapter = new InMemoryM365DirectoryAdapter([
      {
        accountEnabled: true,
        displayName: 'Harper Lane',
        externalUserId: 'aad-user-api-001',
        jobTitle: 'Platform Engineer',
        mail: 'harper.lane.m365.api@example.com',
        userPrincipalName: 'harper.lane.m365.api@example.com',
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InMemoryM365DirectoryAdapter)
      .useValue(adapter)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const syncResponse = await request(app.getHttpServer())
      .post('/integrations/m365/directory/sync')
      .set(roleHeaders('admin'))
      .expect(201);

    const statusResponse = await request(app.getHttpServer())
      .get('/integrations/m365/directory/status')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(syncResponse.body.managerMappingsResolved).toBe(0);
    expect(syncResponse.body.employeesCreated).toBeGreaterThanOrEqual(0);
    expect(syncResponse.body.employeesLinked).toBeGreaterThanOrEqual(0);
    expect(syncResponse.body.syncedPersonIds.length).toBeGreaterThanOrEqual(1);
    expect(statusResponse.body).toEqual(
      expect.objectContaining({
        provider: 'm365',
        supportsDirectorySync: true,
        supportsManagerSync: true,
      }),
    );
    expect(statusResponse.body.linkedIdentityCount).toBeGreaterThanOrEqual(1);

    await app.close();
  });

  it('GET /integrations/m365/directory/reconciliation exposes review categories for operators', async () => {
    const adapter = new InMemoryM365DirectoryAdapter([
      {
        accountEnabled: true,
        displayName: 'Matched Person',
        externalUserId: 'aad-user-ethan',
        mail: 'ethan.brooks@example.com',
        userPrincipalName: 'ethan.brooks@example.com',
      },
      {
        accountEnabled: true,
        displayName: 'Unmatched External',
        externalUserId: 'aad-unmatched-001',
        mail: '',
        userPrincipalName: '',
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InMemoryM365DirectoryAdapter)
      .useValue(adapter)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/integrations/m365/directory/sync')
      .set(roleHeaders('admin'))
      .expect(201);

    const reviewResponse = await request(app.getHttpServer())
      .get('/integrations/m365/directory/reconciliation')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(reviewResponse.body.summary).toEqual(
      expect.objectContaining({
        matched: expect.any(Number),
        total: expect.any(Number),
        unmatched: expect.any(Number),
      }),
    );
    expect(reviewResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'MATCHED',
          externalUserId: 'aad-user-ethan',
        }),
        expect.objectContaining({
          category: 'UNMATCHED',
          externalUserId: 'aad-unmatched-001',
        }),
      ]),
    );

    await app.close();
  });
});
