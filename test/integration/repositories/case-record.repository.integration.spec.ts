import { PrismaClient } from '@prisma/client';

import { CaseParticipant } from '@src/modules/case-management/domain/entities/case-participant.entity';
import { CaseRecord } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseType } from '@src/modules/case-management/domain/entities/case-type.entity';
import { CaseId } from '@src/modules/case-management/domain/value-objects/case-id';
import { PrismaCaseRecordRepository } from '@src/modules/case-management/infrastructure/repositories/prisma/prisma-case-record.repository';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma case repository', () => {
  let prisma: PrismaClient;
  let repository: PrismaCaseRecordRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaCaseRecordRepository(
      {
        caseType: prisma.caseType,
        count: prisma.caseRecord.count.bind(prisma.caseRecord),
        delete: prisma.caseRecord.delete.bind(prisma.caseRecord),
        findFirst: prisma.caseRecord.findFirst.bind(prisma.caseRecord),
        findMany: prisma.caseRecord.findMany.bind(prisma.caseRecord),
        upsert: prisma.caseRecord.upsert.bind(prisma.caseRecord),
      } as unknown as ConstructorParameters<typeof PrismaCaseRecordRepository>[0],
    );
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, reads, and lists onboarding cases', async () => {
    const caseRecord = CaseRecord.create(
      {
        caseNumber: 'CASE-1001',
        caseType: CaseType.onboarding(),
        openedAt: new Date('2025-03-01T00:00:00.000Z'),
        ownerPersonId: persistenceReferenceIds.caseOwnerPersonId,
        participants: [
          CaseParticipant.create(
            { personId: persistenceReferenceIds.caseSubjectPersonId, role: 'SUBJECT' },
            '92333333-0000-0000-0000-000000000001',
          ),
        ],
        relatedProjectId: persistenceReferenceIds.projectId,
        status: 'OPEN',
        subjectPersonId: persistenceReferenceIds.caseSubjectPersonId,
        summary: 'Onboard contributor to delivery project.',
      },
      CaseId.from('92333333-0000-0000-0000-000000000002'),
    );

    await repository.save(caseRecord);

    const persisted = await repository.findByCaseId(caseRecord.caseId);
    const listed = await repository.list({ subjectPersonId: persistenceReferenceIds.caseSubjectPersonId });

    expect(persisted?.caseNumber).toBe('CASE-1001');
    expect(persisted?.participants).toHaveLength(1);
    expect(listed).toHaveLength(1);
    expect(await repository.count()).toBe(1);
  });
});
