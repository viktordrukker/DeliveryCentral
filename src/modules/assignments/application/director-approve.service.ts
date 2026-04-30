import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { AssignmentApproval } from '../domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { ApprovalState } from '../domain/value-objects/approval-state';
import { AssignmentId } from '../domain/value-objects/assignment-id';

interface DirectorApproveInput {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  assignmentId: string;
  reason?: string;
}

@Injectable()
export class DirectorApproveService {
  public constructor(
    private readonly assignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(input: DirectorApproveInput): Promise<ProjectAssignment> {
    if (!input.actorRoles.includes('director') && !input.actorRoles.includes('admin')) {
      throw new BadRequestException('Only directors (or admins) can sign Director-approval.');
    }

    const assignment = await this.assignmentRepository.findByAssignmentId(
      AssignmentId.from(input.assignmentId),
    );
    if (!assignment) {
      throw new NotFoundException(`Assignment ${input.assignmentId} not found.`);
    }

    if (!assignment.requiresDirectorApproval) {
      throw new ConflictException(
        `Assignment ${input.assignmentId} does not require Director approval.`,
      );
    }

    // The flag is the source of truth for "needs director sign-off". Allow
    // approval from any active forward state — historically this was BOOKED-
    // only, but rows that slipped past BOOKED before the transition gate was
    // added (or via the older `Start onboarding` path) would otherwise be
    // unreachable for approval. Terminal states (REJECTED / CANCELLED /
    // COMPLETED) and pre-BOOKED states are still rejected.
    const APPROVABLE_STATES = new Set(['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD']);
    if (!APPROVABLE_STATES.has(assignment.status.value)) {
      throw new ConflictException(
        `Director approval cannot be applied to a ${assignment.status.value} assignment.`,
      );
    }

    const existing = await this.assignmentRepository.findApprovalsByAssignmentId(
      assignment.assignmentId,
    );
    const nextSequence = existing.length === 0 ? 1 : Math.max(...existing.map((a) => a.sequenceNumber)) + 1;

    if (existing.some((a) => a.decisionState.value === 'APPROVED' && a.sequenceNumber > 1)) {
      throw new ConflictException('Director approval has already been recorded for this assignment.');
    }

    const timestamp = new Date();
    const approval = AssignmentApproval.create({
      assignmentId: assignment.assignmentId,
      decisionAt: timestamp,
      decisionReason: input.reason ?? 'Director approval recorded.',
      decisionState: ApprovalState.approved(),
      decidedByPersonId: input.actorId,
      sequenceNumber: nextSequence,
    });

    assignment.setRequiresDirectorApproval(false);

    await this.assignmentRepository.appendApproval(approval);
    await this.assignmentRepository.save(assignment);
    await this.assignmentRepository.appendHistory(
      AssignmentHistory.create({
        assignmentId: assignment.assignmentId,
        changeReason: input.reason ?? 'Director approval recorded.',
        changeType: 'DIRECTOR_APPROVAL_RECORDED',
        changedByPersonId: input.actorId,
        newSnapshot: {
          status: assignment.status.value,
          requiresDirectorApproval: false,
          approvalSequenceNumber: nextSequence,
        },
        occurredAt: timestamp,
      }),
    );

    this.auditLogger?.record({
      actionType: 'assignment.director_approved',
      actorId: input.actorId,
      category: 'assignment',
      changeSummary: `Director approval recorded for assignment ${input.assignmentId}.`,
      details: {
        assignmentId: input.assignmentId,
        approvalSequenceNumber: nextSequence,
        reason: input.reason,
      },
      metadata: {
        approvalSequenceNumber: nextSequence,
      },
      targetEntityId: input.assignmentId,
      targetEntityType: 'ASSIGNMENT',
    });

    return assignment;
  }
}
