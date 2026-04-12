import { PrismaClient } from '@prisma/client';

import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';
import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { PrismaReportingLineRepository } from '@src/modules/organization/infrastructure/repositories/prisma/prisma-reporting-line.repository';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma reporting line repository', () => {
  let prisma: PrismaClient;
  let repository: PrismaReportingLineRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaReportingLineRepository(prisma.reportingLine);
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists solid-line and dotted-line reporting side by side', async () => {
    const subjectId = PersonId.from(persistenceReferenceIds.subjectPersonId);
    const lineManagerId = PersonId.from(persistenceReferenceIds.managerPersonId);
    const dottedManagerId = PersonId.from(persistenceReferenceIds.resourceManagerId);

    await repository.save(
      ReportingLine.create({
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-01T00:00:00.000Z')),
        isPrimary: true,
        managerId: lineManagerId,
        subjectId,
        type: ReportingLineType.solidLine(),
      }),
    );
    await repository.save(
      ReportingLine.create({
        authority: 'REVIEWER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-01T00:00:00.000Z')),
        isPrimary: false,
        managerId: dottedManagerId,
        subjectId,
        type: ReportingLineType.dottedLine(),
      }),
    );

    const lines = await repository.findActiveBySubject(subjectId, new Date('2025-03-01T00:00:00.000Z'));

    expect(lines).toHaveLength(2);
    expect(lines.filter((line) => line.type.value === 'SOLID_LINE')).toHaveLength(1);
    expect(lines.filter((line) => line.type.value === 'DOTTED_LINE')).toHaveLength(1);
  });

  it('supports effective-date queries', async () => {
    const subjectId = PersonId.from(persistenceReferenceIds.subjectPersonId);

    await repository.save(
      ReportingLine.create({
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(
          new Date('2025-01-01T00:00:00.000Z'),
          new Date('2025-03-31T23:59:59.999Z'),
        ),
        isPrimary: true,
        managerId: PersonId.from(persistenceReferenceIds.managerPersonId),
        subjectId,
        type: ReportingLineType.solidLine(),
      }),
    );

    const current = await repository.findActiveBySubject(subjectId, new Date('2025-02-01T00:00:00.000Z'));
    const expired = await repository.findActiveBySubject(subjectId, new Date('2025-04-15T00:00:00.000Z'));

    expect(current).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });
});
