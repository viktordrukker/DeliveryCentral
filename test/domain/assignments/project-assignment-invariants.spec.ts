import { AssignmentAuditComparisonService } from '@src/modules/assignments/application/assignment-audit-comparison.service';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { expectDomainError } from '../../helpers/domain-assertions.helper';

describe('assignment domain invariants', () => {
  it('keeps assignments strictly person-to-project', () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(50),
        personId: 'person-1',
        projectId: 'project-1',
        requestedAt: new Date('2025-01-01T00:00:00.000Z'),
        staffingRole: 'Engineer',
        status: AssignmentStatus.created(),
        validFrom: new Date('2025-02-01T00:00:00.000Z'),
      },
      AssignmentId.from('assignment-1'),
    );

    expect(assignment.personId).toBe('person-1');
    expect(assignment.projectId).toBe('project-1');
    expect(assignment).not.toHaveProperty('issueId');
  });

  it('rejects invalid allocation values', async () => {
    await expectDomainError(
      () => AllocationPercent.from(120),
      'Allocation percent must be between 0 and 100.',
    );
  });

  it('validates assignment workflow transitions', async () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(25),
        personId: 'person-1',
        projectId: 'project-1',
        requestedAt: new Date('2025-01-01T00:00:00.000Z'),
        staffingRole: 'Engineer',
        status: AssignmentStatus.proposed(),
        validFrom: new Date('2025-02-01T00:00:00.000Z'),
      },
      AssignmentId.from('assignment-2'),
    );

    assignment.approve(new Date('2025-01-02T00:00:00.000Z'));
    expect(assignment.status.value).toBe('BOOKED');

    await expectDomainError(
      () => assignment.reject(),
      'Assignment cannot transition from BOOKED to REJECTED.',
    );
  });

  it('does not let work evidence mutate project assignments', async () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(50),
        personId: 'person-1',
        projectId: 'project-1',
        requestedAt: new Date('2025-01-01T00:00:00.000Z'),
        staffingRole: 'Engineer',
        status: AssignmentStatus.booked(),
        validFrom: new Date('2025-02-01T00:00:00.000Z'),
      },
      AssignmentId.from('assignment-3'),
    );
    const assignmentRepository = new InMemoryProjectAssignmentRepository([assignment]);
    const evidenceRepository = new InMemoryWorkEvidenceRepository([
      WorkEvidence.create({
        evidenceType: 'TIMESHEET_ENTRY',
        personId: 'person-2',
        projectId: 'project-1',
        recordedAt: new Date('2025-03-01T00:00:00.000Z'),
        source: WorkEvidenceSource.create(
          {
            displayName: 'Internal Timesheet',
            provider: 'INTERNAL',
            sourceType: 'TIMESHEET',
          },
          'source-1',
        ),
        sourceRecordKey: 'TS-1',
      }),
    ]);
    const service = new AssignmentAuditComparisonService(
      assignmentRepository,
      evidenceRepository,
    );

    const beforeStatus = assignment.status.value;
    const result = await service.execute({
      asOf: new Date('2025-03-02T00:00:00.000Z'),
      projectId: 'project-1',
    });

    expect(result.unassignedContributors).toContain('person-2');
    expect(assignment.status.value).toBe(beforeStatus);
    expect(assignment.personId).toBe('person-1');
  });
});
