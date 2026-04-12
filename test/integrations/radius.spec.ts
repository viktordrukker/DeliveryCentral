import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { AppConfig } from '@src/shared/config/app-config';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { RadiusAccountSyncService } from '@src/modules/integrations/radius/application/radius-account-sync.service';
import { RadiusReconciliationQueryService } from '@src/modules/integrations/radius/application/radius-reconciliation-query.service';
import { InMemoryRadiusAccountAdapter } from '@src/modules/integrations/radius/infrastructure/adapters/in-memory-radius-account.adapter';
import { InMemoryExternalAccountLinkRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-external-account-link.repository';
import { InMemoryRadiusReconciliationRecordRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-radius-reconciliation-record.repository';
import { InMemoryRadiusSyncStateRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-radius-sync-state.repository';
import { ExternalAccountLink } from '@src/modules/integrations/radius/domain/entities/external-account-link.entity';

import { roleHeaders } from '../helpers/api/auth-headers';

function createConfig() {
  process.env.RADIUS_ACCOUNT_MATCH_STRATEGY = 'email';
  return new AppConfig();
}

describe('RADIUS account sync', () => {
  it('imports an external account reference without mutating organization records', async () => {
    const linkRepository = new InMemoryExternalAccountLinkRepository();
    const service = new RadiusAccountSyncService(
      new InMemoryRadiusAccountAdapter([
        {
          accountPresenceState: 'present',
          displayName: 'Contractor Shadow Account',
          externalAccountId: 'radius-001',
          sourceType: 'vpn',
          username: 'contractor.shadow',
        },
      ]),
      createSeededInMemoryPersonRepository(),
      linkRepository,
      new InMemoryRadiusReconciliationRecordRepository(),
      new InMemoryRadiusSyncStateRepository(),
      createConfig(),
    );

    const result = await service.syncAccounts();
    const link = await linkRepository.findByExternalAccountId('radius', 'radius-001');

    expect(result.accountsImported).toBe(1);
    expect(result.accountsLinked).toBe(0);
    expect(result.unmatchedAccounts).toBe(1);
    expect(link?.personId).toBeUndefined();
    expect(link?.sourceType).toBe('vpn');
  });

  it('links an external account reference to an existing employee by email strategy', async () => {
    const linkRepository = new InMemoryExternalAccountLinkRepository();
    const service = new RadiusAccountSyncService(
      new InMemoryRadiusAccountAdapter([
        {
          accountPresenceState: 'present',
          email: 'ethan.brooks@example.com',
          externalAccountId: 'radius-ethan',
          username: 'ethan.brooks',
        },
      ]),
      createSeededInMemoryPersonRepository(),
      linkRepository,
      new InMemoryRadiusReconciliationRecordRepository(),
      new InMemoryRadiusSyncStateRepository(),
      createConfig(),
    );

    const result = await service.syncAccounts();
    const link = await linkRepository.findByExternalAccountId('radius', 'radius-ethan');

    expect(result.accountsImported).toBe(1);
    expect(result.accountsLinked).toBe(1);
    expect(result.unmatchedAccounts).toBe(0);
    expect(link?.personId).toBe('11111111-1111-1111-1111-111111111008');
    expect(link?.matchedByStrategy).toBe('email');
  });

  it('preserves internal employee data when reconciling account presence', async () => {
    const internalPerson = Person.register(
      {
        displayName: 'Alex Mercer',
        employmentStatus: 'ACTIVE',
        familyName: 'Mercer',
        givenName: 'Alex',
        grade: 'G7',
        primaryEmail: 'alex.mercer@example.com',
        role: 'Internal Role',
        skillsets: ['Architecture'],
      },
      PersonId.from('99999999-9999-9999-9999-999999999001'),
    );
    const personRepository = new InMemoryPersonRepository([internalPerson]);
    const service = new RadiusAccountSyncService(
      new InMemoryRadiusAccountAdapter([
        {
          accountPresenceState: 'disabled',
          displayName: 'Alex Mercer Updated',
          email: 'alex.mercer@example.com',
          externalAccountId: 'radius-alex',
          username: 'alex.mercer',
        },
      ]),
      personRepository,
      new InMemoryExternalAccountLinkRepository(),
      new InMemoryRadiusReconciliationRecordRepository(),
      new InMemoryRadiusSyncStateRepository(),
      createConfig(),
    );

    await service.syncAccounts();
    const persistedPerson = await personRepository.findByEmail('alex.mercer@example.com');

    expect(persistedPerson?.displayName).toBe('Alex Mercer');
    expect(persistedPerson?.grade).toBe('G7');
    expect(persistedPerson?.role).toBe('Internal Role');
    expect(persistedPerson?.skillsets).toEqual(['Architecture']);
  });

  it('does not destructively remove existing account links when a later sync omits the account', async () => {
    const linkRepository = new InMemoryExternalAccountLinkRepository();
    const syncStateRepository = new InMemoryRadiusSyncStateRepository();
    const personRepository = createSeededInMemoryPersonRepository();
    const firstService = new RadiusAccountSyncService(
      new InMemoryRadiusAccountAdapter([
        {
          email: 'ethan.brooks@example.com',
          externalAccountId: 'radius-ethan',
          username: 'ethan.brooks',
        },
      ]),
      personRepository,
      linkRepository,
      new InMemoryRadiusReconciliationRecordRepository(),
      syncStateRepository,
      createConfig(),
    );

    await firstService.syncAccounts();

    const secondService = new RadiusAccountSyncService(
      new InMemoryRadiusAccountAdapter([]),
      personRepository,
      linkRepository,
      new InMemoryRadiusReconciliationRecordRepository(),
      syncStateRepository,
      createConfig(),
    );

    const result = await secondService.syncAccounts();
    const link = await linkRepository.findByExternalAccountId('radius', 'radius-ethan');
    const person = await personRepository.findByEmail('ethan.brooks@example.com');

    expect(result.accountsImported).toBe(0);
    expect(link).not.toBeNull();
    expect(person).not.toBeNull();
  });
});

describe('RADIUS reconciliation review', () => {
  it('classifies matched, unmatched, ambiguous, and presence-drift account links', async () => {
    const linkRepository = new InMemoryExternalAccountLinkRepository();
    const reconciliationRepository = new InMemoryRadiusReconciliationRecordRepository();
    const syncStateRepository = new InMemoryRadiusSyncStateRepository();
    const personRepository = createSeededInMemoryPersonRepository();

    await linkRepository.save(
      ExternalAccountLink.create({
        externalAccountId: 'radius-stale-001',
        externalEmail: 'stale.user@example.com',
        externalUsername: 'stale.user',
        lastSeenAt: new Date('2026-04-01T00:00:00.000Z'),
        matchedByStrategy: 'email',
        personId: '11111111-1111-1111-1111-111111111008',
        provider: 'radius',
        sourceType: 'vpn',
      }),
    );

    const service = new RadiusAccountSyncService(
      new InMemoryRadiusAccountAdapter([
        {
          accountPresenceState: 'present',
          email: 'ethan.brooks@example.com',
          externalAccountId: 'radius-ethan',
          username: 'ethan.brooks',
        },
        {
          accountPresenceState: 'present',
          email: 'duplicate.radius@example.com',
          externalAccountId: 'radius-duplicate-001',
          username: 'duplicate.1',
        },
        {
          accountPresenceState: 'present',
          email: 'duplicate.radius@example.com',
          externalAccountId: 'radius-duplicate-002',
          username: 'duplicate.2',
        },
        {
          accountPresenceState: 'disabled',
          externalAccountId: 'radius-unmatched-001',
          username: 'unknown.user',
        },
      ]),
      personRepository,
      linkRepository,
      reconciliationRepository,
      syncStateRepository,
      createConfig(),
    );

    await service.syncAccounts();

    const queryService = new RadiusReconciliationQueryService(
      reconciliationRepository,
      syncStateRepository,
    );
    const review = await queryService.getReview();

    expect(review.summary.matched).toBeGreaterThanOrEqual(1);
    expect(review.summary.ambiguous).toBe(2);
    expect(review.summary.unmatched).toBe(1);
    expect(review.summary.presenceDrift).toBe(1);
    expect(review.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'MATCHED',
          externalAccountId: 'radius-ethan',
        }),
        expect.objectContaining({
          category: 'AMBIGUOUS',
          externalAccountId: 'radius-duplicate-001',
        }),
        expect.objectContaining({
          category: 'UNMATCHED',
          externalAccountId: 'radius-unmatched-001',
        }),
        expect.objectContaining({
          category: 'PRESENCE_DRIFT',
          externalAccountId: 'radius-stale-001',
        }),
      ]),
    );
  });
});

describe('RADIUS account sync API', () => {
  it('exposes sync and status endpoints through the fake adapter', async () => {
    const adapter = new InMemoryRadiusAccountAdapter([
      {
        accountPresenceState: 'present',
        email: 'ethan.brooks@example.com',
        externalAccountId: 'radius-ethan',
        sourceType: 'vpn',
        username: 'ethan.brooks',
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InMemoryRadiusAccountAdapter)
      .useValue(adapter)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const syncResponse = await request(app.getHttpServer())
      .post('/integrations/radius/accounts/sync')
      .set(roleHeaders('admin'))
      .expect(201);

    const statusResponse = await request(app.getHttpServer())
      .get('/integrations/radius/status')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(syncResponse.body).toEqual(
      expect.objectContaining({
        accountsImported: 1,
        accountsLinked: 1,
        unmatchedAccounts: 0,
      }),
    );
    expect(statusResponse.body).toEqual(
      expect.objectContaining({
        provider: 'radius',
        supportsAccountSync: true,
        linkedAccountCount: 1,
        unlinkedAccountCount: 0,
      }),
    );

    await app.close();
  });

  it('GET /integrations/radius/reconciliation exposes review categories for operators', async () => {
    const adapter = new InMemoryRadiusAccountAdapter([
      {
        accountPresenceState: 'present',
        email: 'ethan.brooks@example.com',
        externalAccountId: 'radius-ethan',
        username: 'ethan.brooks',
      },
      {
        accountPresenceState: 'disabled',
        externalAccountId: 'radius-unmatched-001',
        username: 'unknown.user',
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InMemoryRadiusAccountAdapter)
      .useValue(adapter)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/integrations/radius/accounts/sync')
      .set(roleHeaders('admin'))
      .expect(201);

    const reviewResponse = await request(app.getHttpServer())
      .get('/integrations/radius/reconciliation')
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
          externalAccountId: 'radius-ethan',
        }),
        expect.objectContaining({
          category: 'UNMATCHED',
          externalAccountId: 'radius-unmatched-001',
        }),
      ]),
    );

    await app.close();
  });
});
