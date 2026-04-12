import { PrismaClient } from '@prisma/client';

import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { PrismaWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/prisma/prisma-work-evidence.repository';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma work evidence repository', () => {
  let prisma: PrismaClient;
  let repository: PrismaWorkEvidenceRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaWorkEvidenceRepository(prisma.workEvidence, prisma.workEvidenceSource);
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and queries work evidence by project and source type', async () => {
    await repository.save(
      WorkEvidence.create(
        {
          durationMinutes: 120,
          evidenceType: 'TIMESHEET_ENTRY',
          personId: persistenceReferenceIds.subjectPersonId,
          projectId: persistenceReferenceIds.projectId,
          recordedAt: new Date('2025-03-01T00:00:00.000Z'),
          source: WorkEvidenceSource.create(
            {
              displayName: 'Internal Test Source',
              provider: 'INTERNAL',
              sourceType: 'TIMESHEET',
            },
            persistenceReferenceIds.workEvidenceSourceId,
          ),
          sourceRecordKey: 'TS-REPO-2',
        },
        WorkEvidenceId.from('91111111-0000-0000-0000-000000000001'),
      ),
    );

    const byProject = await repository.findByProjectId(
      persistenceReferenceIds.projectId,
      new Date('2025-03-02T00:00:00.000Z'),
    );
    const byFilter = await repository.list({ sourceType: 'TIMESHEET' });

    expect(byProject).toHaveLength(1);
    expect(byFilter).toHaveLength(1);
    expect(byFilter[0]?.source.sourceType).toBe('TIMESHEET');
  });
});
