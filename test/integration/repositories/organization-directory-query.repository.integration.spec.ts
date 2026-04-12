import { PrismaClient } from '@prisma/client';

import { PrismaPersonDirectoryQueryRepository } from '@src/modules/organization/infrastructure/queries/prisma-person-directory-query.repository';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma person directory query repository', () => {
  let prisma: PrismaClient;
  let repository: PrismaPersonDirectoryQueryRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaPersonDirectoryQueryRepository(prisma as never);
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);

    await prisma.personOrgMembership.create({
      data: {
        id: '90111111-0000-0000-0000-000000000201',
        isPrimary: true,
        orgUnitId: persistenceReferenceIds.orgUnitId,
        personId: persistenceReferenceIds.subjectPersonId,
        validFrom: new Date('2025-01-01T00:00:00.000Z'),
      },
    });

    await prisma.reportingLine.createMany({
      data: [
        {
          authority: 'APPROVER',
          id: '90111111-0000-0000-0000-000000000202',
          isPrimary: true,
          managerPersonId: persistenceReferenceIds.managerPersonId,
          relationshipType: 'SOLID_LINE',
          subjectPersonId: persistenceReferenceIds.subjectPersonId,
          validFrom: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          authority: 'REVIEWER',
          id: '90111111-0000-0000-0000-000000000203',
          isPrimary: false,
          managerPersonId: persistenceReferenceIds.resourceManagerId,
          relationshipType: 'DOTTED_LINE',
          subjectPersonId: persistenceReferenceIds.subjectPersonId,
          validFrom: new Date('2025-01-01T00:00:00.000Z'),
        },
      ],
    });

    await prisma.resourcePool.create({
      data: {
        code: 'POOL-TST',
        id: '90111111-0000-0000-0000-000000000204',
        name: 'Persistence Test Pool',
        orgUnitId: persistenceReferenceIds.orgUnitId,
      },
    });

    await prisma.personResourcePoolMembership.create({
      data: {
        id: '90111111-0000-0000-0000-000000000205',
        personId: persistenceReferenceIds.subjectPersonId,
        resourcePoolId: '90111111-0000-0000-0000-000000000204',
        validFrom: new Date('2025-01-01T00:00:00.000Z'),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('loads directory rows from persisted people, memberships, reporting lines, and teams', async () => {
    const result = await repository.list({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentLineManager: expect.objectContaining({
            id: persistenceReferenceIds.managerPersonId,
          }),
          currentOrgUnit: expect.objectContaining({
            id: persistenceReferenceIds.orgUnitId,
            name: 'Persistence Test Department',
          }),
          dottedLineManagers: expect.arrayContaining([
            expect.objectContaining({
              id: persistenceReferenceIds.resourceManagerId,
            }),
          ]),
          id: persistenceReferenceIds.subjectPersonId,
          resourcePoolIds: expect.arrayContaining(['90111111-0000-0000-0000-000000000204']),
        }),
      ]),
    );
  });

  it('supports manager scope over persisted reporting lines', async () => {
    const result = await repository.listManagerScope({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      managerId: persistenceReferenceIds.managerPersonId,
      page: 1,
      pageSize: 10,
    });

    expect(result.directReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: persistenceReferenceIds.subjectPersonId,
        }),
      ]),
    );
    expect(result.totalDirectReports).toBe(1);
  });
});
