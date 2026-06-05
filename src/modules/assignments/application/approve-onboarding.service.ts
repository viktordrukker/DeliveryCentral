import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface ApproveOnboardingCommand {
  actorId: string;
  assignmentId: string;
  reason?: string;
}

interface RejectOnboardingCommand {
  actorId: string;
  assignmentId: string;
  reason: string;
}

interface ApproveOnboardingResult {
  assignmentId: string;
  positionId: string;
  onboardingApprovedAt: string;
  onboardingApprovedByPersonId: string;
}

interface RejectOnboardingResult {
  assignmentId: string;
  positionId: string;
  rejectionReason: string;
}

/**
 * LEAN-P4c-1 — Onboarding-stage approval gate.
 *
 * A `ProjectPosition` with `requiresOnboardingApproval=true` cannot be
 * transitioned ONBOARDING → ASSIGNED until a project manager records an
 * approval here. The gate state lives on the position
 * (`onboardingApprovedAt`, `onboardingApprovedByPersonId`); the legacy
 * assignment ID is used as the public handle because the FE workflow
 * pivots around the assignment.
 *
 * The transition block itself lives in `TransitionProjectAssignmentService`
 * and `ScheduleOnboardingService`. This service only mutates the gate
 * state + emits the audit + webhook event.
 */
@Injectable()
export class ApproveOnboardingService {
  private readonly logger = new Logger(ApproveOnboardingService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async approve(command: ApproveOnboardingCommand): Promise<ApproveOnboardingResult> {
    const position = await this.findPositionByAssignment(command.assignmentId);

    if (!position.requiresOnboardingApproval) {
      throw new BadRequestException(
        'This position does not require an onboarding approval gate.',
      );
    }

    if (position.onboardingApprovedAt) {
      throw new ConflictException(
        'Onboarding approval has already been recorded for this position.',
      );
    }

    const approvedAt = new Date();
    await this.prisma.projectPosition.update({
      where: { id: position.id },
      data: {
        onboardingApprovedAt: approvedAt,
        onboardingApprovedByPersonId: command.actorId,
        updatedByPersonId: command.actorId,
      },
    });

    this.auditLogger?.record({
      actionType: 'assignment.onboarding_approved',
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Onboarding approval gate approved for position ${position.id} (assignment ${command.assignmentId}).`,
      details: {
        assignmentId: command.assignmentId,
        positionId: position.id,
        reason: command.reason ?? null,
      },
      metadata: {
        positionId: position.id,
        approvedAt: approvedAt.toISOString(),
      },
      targetEntityId: command.assignmentId,
      targetEntityType: 'ASSIGNMENT',
    });

    return {
      assignmentId: command.assignmentId,
      positionId: position.id,
      onboardingApprovedAt: approvedAt.toISOString(),
      onboardingApprovedByPersonId: command.actorId,
    };
  }

  public async reject(command: RejectOnboardingCommand): Promise<RejectOnboardingResult> {
    if (!command.reason || command.reason.trim().length === 0) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const position = await this.findPositionByAssignment(command.assignmentId);

    if (!position.requiresOnboardingApproval) {
      throw new BadRequestException(
        'This position does not require an onboarding approval gate.',
      );
    }

    if (position.onboardingApprovedAt) {
      throw new ConflictException(
        'Onboarding approval has already been recorded for this position; cannot reject after approval.',
      );
    }

    // Recording a rejection clears the gate state (already null) and
    // records the reason on the existing on-hold/rejection text columns
    // so downstream surfaces (Cases page, audit trail) see why the gate
    // failed. The assignment status itself is not auto-moved — that is
    // the operator's next action (typically ON_HOLD or CANCELLED).
    await this.prisma.projectPosition.update({
      where: { id: position.id },
      data: {
        rejectionReason: command.reason,
        updatedByPersonId: command.actorId,
      },
    });

    this.auditLogger?.record({
      actionType: 'assignment.onboarding_rejected',
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Onboarding approval gate rejected for position ${position.id} (assignment ${command.assignmentId}). Reason: ${command.reason}`,
      details: {
        assignmentId: command.assignmentId,
        positionId: position.id,
        reason: command.reason,
      },
      metadata: {
        positionId: position.id,
        reason: command.reason,
      },
      targetEntityId: command.assignmentId,
      targetEntityType: 'ASSIGNMENT',
    });

    return {
      assignmentId: command.assignmentId,
      positionId: position.id,
      rejectionReason: command.reason,
    };
  }

  private async findPositionByAssignment(assignmentId: string): Promise<{
    id: string;
    requiresOnboardingApproval: boolean;
    onboardingApprovedAt: Date | null;
  }> {
    const position = await this.prisma.projectPosition.findFirst({
      where: { legacyAssignmentId: assignmentId },
      select: {
        id: true,
        requiresOnboardingApproval: true,
        onboardingApprovedAt: true,
      },
    });
    if (!position) {
      throw new NotFoundException(
        `No ProjectPosition is paired with assignment ${assignmentId}.`,
      );
    }
    return position;
  }
}
