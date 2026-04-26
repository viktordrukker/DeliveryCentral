import { PrismaClient } from '@prisma/client';

import { AssignmentApproval } from '@src/modules/assignments/domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '@src/modules/assignments/domain/entities/assignment-history.entity';
import { AssignmentConcurrencyConflictError } from '@src/modules/assignments/application/assignment-concurrency-conflict.error';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { ApprovalState } from '@src/modules/assignments/domain/value-objects/approval-state';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { PrismaProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/prisma/prisma-project-assignment.repository';
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

describe('Prisma assignment and work evidence repositories', () => {
  let prisma: PrismaClient;
  let assignmentRepository: PrismaProjectAssignmentRepository;
  let workEvidenceRepository: PrismaWorkEvidenceRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    assignmentRepository = new PrismaProjectAssignmentRepository(
      prisma.projectAssignment,
      prisma.assignmentApproval,
      prisma.assignmentHistory,
    );
    workEvidenceRepository = new PrismaWorkEvidenceRepository(
      prisma.workEvidence,
      prisma.workEvidenceSource,
    );
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists assignments independently from work evidence', async () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(60),
        personId: persistenceReferenceIds.subjectPersonId,
        projectId: persistenceReferenceIds.projectId,
        requestedAt: new Date('2025-01-10T00:00:00.000Z'),
        requestedByPersonId: persistenceReferenceIds.requestedByPersonId,
        staffingRole: 'Engineer',
        status: AssignmentStatus.booked(),
        validFrom: new Date('2025-02-01T00:00:00.000Z'),
      },
      AssignmentId.from('96666666-0000-0000-0000-000000000001'),
    );

    await assignmentRepository.save(assignment);

    const evidence = WorkEvidence.create(
      {
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
        sourceRecordKey: 'TS-REPO-1',
      },
      WorkEvidenceId.from('97777777-0000-0000-0000-000000000001'),
    );

    await workEvidenceRepository.save(evidence);

    const persistedAssignment = await assignmentRepository.findByAssignmentId(assignment.assignmentId);
    const persistedEvidence = await workEvidenceRepository.findByProjectId(
      persistenceReferenceIds.projectId,
      new Date('2025-03-02T00:00:00.000Z'),
    );

    expect(persistedAssignment?.personId).toBe(persistenceReferenceIds.subjectPersonId);
    expect(persistedEvidence).toHaveLength(1);
    expect(await prisma.projectAssignment.count()).toBe(1);
    expect(await prisma.workEvidence.count()).toBe(1);
  });

  it('stores approval and history records for an assignment', async () => {
    const assignmentId = AssignmentId.from('96666666-0000-0000-0000-000000000002');
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(30),
        personId: persistenceReferenceIds.subjectPersonId,
        projectId: persistenceReferenceIds.projectIdTwo,
        requestedAt: new Date('2025-01-11T00:00:00.000Z'),
        requestedByPersonId: persistenceReferenceIds.requestedByPersonId,
        staffingRole: 'Analyst',
        status: AssignmentStatus.created(),
        validFrom: new Date('2025-02-15T00:00:00.000Z'),
      },
      assignmentId,
    );

    await assignmentRepository.save(assignment);
    await assignmentRepository.appendApproval(
      AssignmentApproval.create({
        assignmentId,
        decisionAt: new Date('2025-01-12T00:00:00.000Z'),
        decisionReason: 'Repository approval test.',
        decisionState: ApprovalState.approved(),
        decidedByPersonId: persistenceReferenceIds.managerPersonId,
        sequenceNumber: 1,
      }, '98888888-0000-0000-0000-000000000001'),
    );
    await assignmentRepository.appendHistory(
      AssignmentHistory.create({
        assignmentId,
        changeType: 'ASSIGNMENT_CREATED',
        occurredAt: new Date('2025-01-11T00:00:00.000Z'),
      }, '99999999-0000-0000-0000-000000000001'),
    );

    const approvals = await assignmentRepository.findApprovalsByAssignmentId(assignmentId);
    const history = await assignmentRepository.findHistoryByAssignmentId(assignmentId);

    expect(approvals).toHaveLength(1);
    expect(approvals[0]?.decisionState.value).toBe('APPROVED');
    expect(history).toHaveLength(1);
    expect(history[0]?.changeType).toBe('ASSIGNMENT_CREATED');
  });

  it('detects stale lifecycle saves with optimistic concurrency in Prisma persistence', async () => {
    const assignment = ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(30),
        personId: persistenceReferenceIds.subjectPersonId,
        projectId: persistenceReferenceIds.projectIdTwo,
        requestedAt: new Date('2025-01-11T00:00:00.000Z'),
        requestedByPersonId: persistenceReferenceIds.requestedByPersonId,
        staffingRole: 'Analyst',
        status: AssignmentStatus.created(),
        validFrom: new Date('2025-02-15T00:00:00.000Z'),
      },
      AssignmentId.from('96666666-0000-0000-0000-000000000003'),
    );

    await assignmentRepository.save(assignment);

    const staleApprove = await assignmentRepository.findByAssignmentId(assignment.assignmentId);
    const staleReject = await assignmentRepository.findByAssignmentId(assignment.assignmentId);

    expect(staleApprove).not.toBeNull();
    expect(staleReject).not.toBeNull();

    staleApprove!.approve(new Date('2025-02-16T00:00:00.000Z'));
    staleReject!.reject();

    await assignmentRepository.save(staleApprove!);

    await expect(assignmentRepository.save(staleReject!)).rejects.toBeInstanceOf(
      AssignmentConcurrencyConflictError,
    );
  });
});
