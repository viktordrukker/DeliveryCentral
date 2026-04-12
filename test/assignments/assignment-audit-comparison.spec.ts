import { AssignmentAuditComparisonService } from '@src/modules/assignments/application/assignment-audit-comparison.service';
import { AssignmentApproval } from '@src/modules/assignments/domain/entities/assignment-approval.entity';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { ApprovalState } from '@src/modules/assignments/domain/value-objects/approval-state';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceLink } from '@src/modules/work-evidence/domain/entities/work-evidence-link.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

describe('Assignment and evidence comparison', () => {
  const personId = '00000000-0000-0000-0000-00000000a001';
  const projectId = '00000000-0000-0000-0000-00000000b001';
  const otherPersonId = '00000000-0000-0000-0000-00000000a002';
  const assignment = ProjectAssignment.create(
    {
      allocationPercent: AllocationPercent.from(50),
      approvedAt: new Date('2025-01-01T00:00:00.000Z'),
      personId,
      projectId,
      requestedAt: new Date('2024-12-20T00:00:00.000Z'),
      staffingRole: 'Analyst',
      status: ApprovalState.approved(),
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validTo: new Date('2025-01-31T23:59:59.999Z'),
    },
    AssignmentId.from('30000000-0000-0000-0000-000000000001'),
  );
  const approval = AssignmentApproval.create({
    assignmentId: assignment.assignmentId,
    decisionAt: new Date('2024-12-28T00:00:00.000Z'),
    decisionState: ApprovalState.approved(),
    sequenceNumber: 1,
  });

  const jiraSource = WorkEvidenceSource.create({
    displayName: 'Jira Cloud',
    provider: 'JIRA',
    sourceType: 'WORKLOG',
  }, '40000000-0000-0000-0000-000000000001');

  it('allows assignment to exist without evidence', async () => {
    const assignmentRepository = new InMemoryProjectAssignmentRepository([assignment], [approval]);
    const evidenceRepository = new InMemoryWorkEvidenceRepository();
    const service = new AssignmentAuditComparisonService(assignmentRepository, evidenceRepository);

    const result = await service.execute({
      asOf: new Date('2025-01-15T00:00:00.000Z'),
      projectId,
    });

    expect(result.unassignedContributors).toHaveLength(0);
    expect(result.assignedWithoutEvidence.map((item) => item.assignmentId.value)).toEqual([
      assignment.assignmentId.value,
    ]);
  });

  it('allows evidence to exist without assignment', async () => {
    const evidence = WorkEvidence.create(
      {
        durationMinutes: 240,
        evidenceType: 'JIRA_WORKLOG',
        personId: otherPersonId,
        projectId,
        recordedAt: new Date('2025-01-15T10:00:00.000Z'),
        source: jiraSource,
        sourceRecordKey: 'WL-1',
      },
      WorkEvidenceId.from('50000000-0000-0000-0000-000000000001'),
    );
    evidence.addLink(
      WorkEvidenceLink.create({
        externalKey: 'JIRA-123',
        linkType: 'ISSUE',
        provider: 'JIRA',
      }),
    );

    const assignmentRepository = new InMemoryProjectAssignmentRepository();
    const evidenceRepository = new InMemoryWorkEvidenceRepository([evidence]);
    const service = new AssignmentAuditComparisonService(assignmentRepository, evidenceRepository);

    const result = await service.execute({
      asOf: new Date('2025-01-15T23:59:59.999Z'),
      projectId,
    });

    expect(result.unassignedContributors).toEqual([otherPersonId]);
    expect(result.assignedWithoutEvidence).toHaveLength(0);
  });

  it('does not mutate assignment when evidence arrives', async () => {
    const evidence = WorkEvidence.create(
      {
        durationMinutes: 60,
        evidenceType: 'JIRA_WORKLOG',
        personId,
        projectId,
        recordedAt: new Date('2025-01-20T10:00:00.000Z'),
        source: jiraSource,
        sourceRecordKey: 'WL-2',
      },
      WorkEvidenceId.from('50000000-0000-0000-0000-000000000002'),
    );

    const assignmentRepository = new InMemoryProjectAssignmentRepository([assignment], [approval]);
    const evidenceRepository = new InMemoryWorkEvidenceRepository([evidence]);
    const service = new AssignmentAuditComparisonService(assignmentRepository, evidenceRepository);

    await service.execute({
      asOf: new Date('2025-01-20T23:59:59.999Z'),
      projectId,
    });

    const persistedAssignment = await assignmentRepository.findByAssignmentId(assignment.assignmentId);
    expect(persistedAssignment?.status.equals(ApprovalState.approved())).toBe(true);
    expect(persistedAssignment?.allocationPercent?.value).toBe(50);
  });

  it('detects an unassigned contributor from evidence', async () => {
    const evidence = WorkEvidence.create(
      {
        durationMinutes: 300,
        evidenceType: 'JIRA_WORKLOG',
        personId: otherPersonId,
        projectId,
        recordedAt: new Date('2025-01-22T10:00:00.000Z'),
        source: jiraSource,
        sourceRecordKey: 'WL-3',
      },
      WorkEvidenceId.from('50000000-0000-0000-0000-000000000003'),
    );

    const service = new AssignmentAuditComparisonService(
      new InMemoryProjectAssignmentRepository([assignment], [approval]),
      new InMemoryWorkEvidenceRepository([evidence]),
    );

    const result = await service.execute({
      asOf: new Date('2025-01-22T23:59:59.999Z'),
      projectId,
    });

    expect(result.unassignedContributors).toEqual([otherPersonId]);
  });

  it('detects an inactive assigned contributor when evidence only arrives after assignment end', async () => {
    const lateEvidence = WorkEvidence.create(
      {
        durationMinutes: 90,
        evidenceType: 'TIMESHEET',
        personId,
        projectId,
        recordedAt: new Date('2025-02-05T12:00:00.000Z'),
        source: WorkEvidenceSource.create({
          displayName: 'Timesheet',
          provider: 'INTERNAL',
          sourceType: 'TIME_ENTRY',
        }, '40000000-0000-0000-0000-000000000002'),
        sourceRecordKey: 'TS-1',
      },
      WorkEvidenceId.from('50000000-0000-0000-0000-000000000004'),
    );

    const service = new AssignmentAuditComparisonService(
      new InMemoryProjectAssignmentRepository([assignment], [approval]),
      new InMemoryWorkEvidenceRepository([lateEvidence]),
    );

    const result = await service.execute({
      asOf: new Date('2025-02-05T23:59:59.999Z'),
      projectId,
    });

    expect(result.evidenceAfterAssignmentEnd).toEqual([personId]);
    expect(result.assignedWithoutEvidence).toHaveLength(0);
  });
});
