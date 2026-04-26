import { AssignmentApproval } from '@src/modules/assignments/domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '@src/modules/assignments/domain/entities/assignment-history.entity';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { ApprovalState } from '@src/modules/assignments/domain/value-objects/approval-state';
import {
  AssignmentStatus,
  AssignmentStatusValue,
} from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';

import {
  demoAssignmentApprovals,
  demoAssignmentHistory,
  demoAssignments,
} from '../../../../../../prisma/seeds/demo-dataset';
import { InMemoryProjectAssignmentRepository } from './in-memory-project-assignment.repository';

function mapAssignmentStatus(value: string): AssignmentStatus {
  switch (value) {
    case 'CREATED':
    case 'PROPOSED':
    case 'REJECTED':
    case 'BOOKED':
    case 'ONBOARDING':
    case 'ASSIGNED':
    case 'ON_HOLD':
    case 'COMPLETED':
    case 'CANCELLED':
      return AssignmentStatus.from(value as AssignmentStatusValue);
    case 'DRAFT':
    case 'REQUESTED':
      return AssignmentStatus.created();
    case 'APPROVED':
      return AssignmentStatus.booked();
    case 'ACTIVE':
      return AssignmentStatus.assigned();
    case 'ENDED':
      return AssignmentStatus.completed();
    case 'REVOKED':
    case 'ARCHIVED':
      return AssignmentStatus.cancelled();
    default:
      return AssignmentStatus.created();
  }
}

function mapApprovalDecisionLegacy(value: string): ApprovalState {
  switch (value) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'ARCHIVED':
    case 'ENDED':
    case 'REJECTED':
    case 'REQUESTED':
    case 'REVOKED':
    case 'DRAFT':
      return ApprovalState.from(value);
    case 'CANCELLED':
      return ApprovalState.revoked();
    case 'PENDING':
      return ApprovalState.requested();
    default:
      return ApprovalState.requested();
  }
}

export function createSeededInMemoryProjectAssignmentRepository(): InMemoryProjectAssignmentRepository {
  const assignments = demoAssignments.map((assignment) =>
    ProjectAssignment.create(
      {
        allocationPercent: AllocationPercent.from(Number(assignment.allocationPercent)),
        approvedAt: assignment.approvedAt ?? undefined,
        notes: assignment.notes ?? undefined,
        personId: assignment.personId,
        projectId: assignment.projectId,
        requestedAt: assignment.requestedAt,
        requestedByPersonId: assignment.requestedByPersonId,
        staffingRole: assignment.staffingRole,
        status: mapAssignmentStatus(assignment.status),
        validFrom: assignment.validFrom,
        validTo: assignment.validTo ?? undefined,
      },
      AssignmentId.from(assignment.id),
    ),
  );

  const approvals = demoAssignmentApprovals.map((approval) =>
    AssignmentApproval.create(
      {
        assignmentId: AssignmentId.from(approval.assignmentId),
        decisionAt: approval.decisionAt ?? undefined,
        decisionReason: approval.decisionReason ?? undefined,
        decisionState: mapApprovalDecisionLegacy(approval.decision),
        decidedByPersonId: approval.decidedByPersonId ?? undefined,
        sequenceNumber: approval.sequenceNumber,
      },
      approval.id,
    ),
  );

  const historyEntries = demoAssignmentHistory.map((entry) =>
    AssignmentHistory.create(
      {
        assignmentId: AssignmentId.from(entry.assignmentId),
        changeReason: entry.changeReason ?? undefined,
        changeType: entry.changeType,
        changedByPersonId: entry.changedByPersonId ?? undefined,
        newSnapshot: entry.newSnapshot ?? undefined,
        occurredAt: entry.occurredAt,
        previousSnapshot: entry.previousSnapshot ?? undefined,
      },
      entry.id,
    ),
  );

  return new InMemoryProjectAssignmentRepository(assignments, approvals, historyEntries);
}
