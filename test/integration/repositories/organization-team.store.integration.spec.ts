import { PrismaClient } from '@prisma/client';

import { PrismaTeamStore } from '@src/modules/organization/infrastructure/repositories/prisma/prisma-team.store';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma team store', () => {
  let prisma: PrismaClient;
  let store: PrismaTeamStore;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    store = new PrismaTeamStore(prisma as never);
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates teams and persists membership changes durably', async () => {
    const createdTeam = await store.createTeam({
      code: 'POOL-PERSIST',
      description: 'Durable persistence team',
      name: 'Persistence Team',
      orgUnitId: persistenceReferenceIds.orgUnitId,
    });

    await store.addMember(createdTeam.id, persistenceReferenceIds.subjectPersonId);

    const activeMembership = await store.findActiveMembership(
      createdTeam.id,
      persistenceReferenceIds.subjectPersonId,
    );
    const teams = await store.getTeams();

    expect(teams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'POOL-PERSIST',
          id: createdTeam.id,
        }),
      ]),
    );
    expect(activeMembership).toEqual(
      expect.objectContaining({
        personId: persistenceReferenceIds.subjectPersonId,
        resourcePoolId: createdTeam.id,
      }),
    );

    await store.removeMember(createdTeam.id, persistenceReferenceIds.subjectPersonId);

    const endedMembership = await prisma.personResourcePoolMembership.findFirst({
      where: {
        personId: persistenceReferenceIds.subjectPersonId,
        resourcePoolId: createdTeam.id,
      },
    });

    expect(endedMembership?.validTo).not.toBeNull();
  });
});
