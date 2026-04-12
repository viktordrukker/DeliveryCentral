import { GetCurrentManagerService } from '@src/modules/organization/domain/services/get-current-manager.service';
import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { InMemoryReportingLineRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-reporting-line.repository';
import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';
import {
  expectDomainError,
  expectSinglePrimarySolidLineManager,
} from '../../helpers/domain-assertions.helper';

describe('organization domain invariants', () => {
  it('supports one valid solid-line manager for an effective time period', async () => {
    const subjectId = PersonId.from('person-1');
    const primaryManagerId = PersonId.from('manager-primary');
    const repository = new InMemoryReportingLineRepository([
      ReportingLine.create({
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-01T00:00:00.000Z')),
        isPrimary: true,
        managerId: primaryManagerId,
        subjectId,
        type: ReportingLineType.solidLine(),
      }),
      ReportingLine.create({
        authority: 'VIEWER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-01T00:00:00.000Z')),
        isPrimary: false,
        managerId: PersonId.from('manager-dotted'),
        subjectId,
        type: ReportingLineType.dottedLine(),
      }),
    ]);
    const activeLines = await repository.findActiveBySubject(
      subjectId,
      new Date('2025-02-01T00:00:00.000Z'),
    );

    expectSinglePrimarySolidLineManager(activeLines, primaryManagerId.value);
  });

  it('allows dotted-line relationships to coexist with the solid-line manager', async () => {
    const subjectId = PersonId.from('person-1');
    const repository = new InMemoryReportingLineRepository([
      ReportingLine.create({
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-01T00:00:00.000Z')),
        isPrimary: true,
        managerId: PersonId.from('manager-primary'),
        subjectId,
        type: ReportingLineType.solidLine(),
      }),
      ReportingLine.create({
        authority: 'REVIEWER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-15T00:00:00.000Z')),
        isPrimary: false,
        managerId: PersonId.from('manager-dotted-1'),
        subjectId,
        type: ReportingLineType.dottedLine(),
      }),
      ReportingLine.create({
        authority: 'VIEWER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-20T00:00:00.000Z')),
        isPrimary: false,
        managerId: PersonId.from('manager-dotted-2'),
        subjectId,
        type: ReportingLineType.dottedLine(),
      }),
    ]);

    const activeLines = await repository.findActiveBySubject(
      subjectId,
      new Date('2025-02-01T00:00:00.000Z'),
    );

    expect(activeLines.filter((line) => line.type.value === 'DOTTED_LINE')).toHaveLength(2);
    expect(activeLines.filter((line) => line.type.value === 'SOLID_LINE')).toHaveLength(1);
  });

  it('resolves the current solid-line manager when future-dated changes exist', async () => {
    const subjectId = PersonId.from('person-1');
    const repository = new InMemoryReportingLineRepository([
      ReportingLine.create({
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(
          new Date('2025-01-01T00:00:00.000Z'),
          new Date('2025-05-31T23:59:59.999Z'),
        ),
        isPrimary: true,
        managerId: PersonId.from('manager-current'),
        subjectId,
        type: ReportingLineType.solidLine(),
      }),
      ReportingLine.create({
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(new Date('2025-06-01T00:00:00.000Z')),
        isPrimary: true,
        managerId: PersonId.from('manager-future'),
        subjectId,
        type: ReportingLineType.solidLine(),
      }),
    ]);
    const service = new GetCurrentManagerService(repository);

    const current = await service.execute({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      personId: subjectId,
    });
    const future = await service.execute({
      asOf: new Date('2025-06-15T00:00:00.000Z'),
      personId: subjectId,
    });

    expect(current?.managerId.value).toBe('manager-current');
    expect(future?.managerId.value).toBe('manager-future');
  });

  it('rejects invalid effective date ranges', async () => {
    await expectDomainError(
      () => EffectiveDateRange.create(
        new Date('2025-02-01T00:00:00.000Z'),
        new Date('2025-01-01T00:00:00.000Z'),
      ),
      'Effective date range end must be on or after start.',
    );
  });
});
