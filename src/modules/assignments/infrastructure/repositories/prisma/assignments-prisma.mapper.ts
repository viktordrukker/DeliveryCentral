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

interface PrismaProjectAssignmentRecord {
  allocationPercent: string | null;
  approvedAt: Date | null;
  archivedAt: Date | null;
  cancellationReason: string | null;
  id: string;
  notes: string | null;
  onHoldCaseId: string | null;
  onHoldReason: string | null;
  personId: string;
  projectId: string;
  rejectionReason: string | null;
  requestedAt: Date;
  requestedByPersonId: string | null;
  staffingRequestId: string | null;
  staffingRole: string;
  status: AssignmentStatusValue;
  validFrom: Date;
  validTo: Date | null;
  version: number;
}

interface PrismaAssignmentApprovalRecord {
  assignmentId: string;
  decision: 'APPROVED' | 'CANCELLED' | 'PENDING' | 'REJECTED' | 'REQUESTED';
  decisionAt: Date | null;
  decisionReason: string | null;
  decidedByPersonId: string | null;
  id: string;
  sequenceNumber: number;
}

interface PrismaAssignmentHistoryRecord {
  assignmentId: string;
  changeReason: string | null;
  changeType: string;
  changedByPersonId: string | null;
  id: string;
  newSnapshot: Record<string, unknown> | null;
  occurredAt: Date;
  previousSnapshot: Record<string, unknown> | null;
}

const VALID_STATUS_VALUES = new Set<AssignmentStatusValue>([
  'CREATED',
  'PROPOSED',
  'REJECTED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

function mapAssignmentStatus(value: string): AssignmentStatus {
  if ((VALID_STATUS_VALUES as Set<string>).has(value)) {
    return AssignmentStatus.from(value as AssignmentStatusValue);
  }
  // Defensive fallback: legacy values map to the canonical equivalents.
  switch (value) {
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

function mapApprovalDecision(value: string): ApprovalState {
  switch (value) {
    case 'APPROVED':
      return ApprovalState.approved();
    case 'REJECTED':
      return ApprovalState.rejected();
    case 'CANCELLED':
      return ApprovalState.from('REVOKED');
    case 'PENDING':
    case 'REQUESTED':
      return ApprovalState.requested();
    default:
      return ApprovalState.requested();
  }
}

export class AssignmentsPrismaMapper {
  public static toDomainAssignment(record: PrismaProjectAssignmentRecord): ProjectAssignment {
    return ProjectAssignment.create(
      {
        allocationPercent: record.allocationPercent
          ? AllocationPercent.from(Number(record.allocationPercent))
          : undefined,
        approvedAt: record.approvedAt ?? undefined,
        archivedAt: record.archivedAt ?? undefined,
        cancellationReason: record.cancellationReason ?? undefined,
        notes: record.notes ?? undefined,
        onHoldCaseId: record.onHoldCaseId ?? undefined,
        onHoldReason: record.onHoldReason ?? undefined,
        personId: record.personId,
        projectId: record.projectId,
        rejectionReason: record.rejectionReason ?? undefined,
        requestedAt: record.requestedAt,
        requestedByPersonId: record.requestedByPersonId ?? undefined,
        staffingRequestId: record.staffingRequestId ?? undefined,
        staffingRole: record.staffingRole,
        status: mapAssignmentStatus(record.status),
        validFrom: record.validFrom,
        validTo: record.validTo ?? undefined,
        version: record.version,
      },
      AssignmentId.from(record.id),
    );
  }

  public static toDomainApproval(record: PrismaAssignmentApprovalRecord): AssignmentApproval {
    return AssignmentApproval.create(
      {
        assignmentId: AssignmentId.from(record.assignmentId),
        decisionAt: record.decisionAt ?? undefined,
        decisionReason: record.decisionReason ?? undefined,
        decisionState: mapApprovalDecision(record.decision),
        decidedByPersonId: record.decidedByPersonId ?? undefined,
        sequenceNumber: record.sequenceNumber,
      },
      record.id,
    );
  }

  public static toDomainHistory(record: PrismaAssignmentHistoryRecord): AssignmentHistory {
    return AssignmentHistory.create(
      {
        assignmentId: AssignmentId.from(record.assignmentId),
        changeReason: record.changeReason ?? undefined,
        changeType: record.changeType,
        changedByPersonId: record.changedByPersonId ?? undefined,
        newSnapshot: record.newSnapshot ?? undefined,
        occurredAt: record.occurredAt,
        previousSnapshot: record.previousSnapshot ?? undefined,
      },
      record.id,
    );
  }
}
