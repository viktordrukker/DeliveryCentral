import { AssignmentApproval } from '@src/modules/assignments/domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '@src/modules/assignments/domain/entities/assignment-history.entity';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { ApprovalState } from '@src/modules/assignments/domain/value-objects/approval-state';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';

interface PrismaProjectAssignmentRecord {
  allocationPercent: string | null;
  approvedAt: Date | null;
  archivedAt: Date | null;
  id: string;
  notes: string | null;
  personId: string;
  projectId: string;
  requestedAt: Date;
  requestedByPersonId: string | null;
  staffingRole: string;
  status: 'ACTIVE' | 'APPROVED' | 'ARCHIVED' | 'ENDED' | 'REJECTED' | 'REQUESTED' | 'REVOKED';
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

function mapApprovalState(value: string): ApprovalState {
  switch (value) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'ARCHIVED':
    case 'ENDED':
    case 'REJECTED':
    case 'REQUESTED':
    case 'REVOKED':
      return ApprovalState.from(value);
    case 'CANCELLED':
      return ApprovalState.revoked();
    case 'PENDING':
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
        notes: record.notes ?? undefined,
        personId: record.personId,
        projectId: record.projectId,
        requestedAt: record.requestedAt,
        requestedByPersonId: record.requestedByPersonId ?? undefined,
        staffingRole: record.staffingRole,
        status: mapApprovalState(record.status),
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
        decisionState: mapApprovalState(record.decision),
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
