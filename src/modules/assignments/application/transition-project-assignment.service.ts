import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { EffectiveBillRateResolverService } from '@src/modules/financial-governance/application/effective-bill-rate-resolver.service';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { UndoService } from '@src/modules/undo/application/undo.service';
import { mapAssignmentStatusToFillStatus } from '@src/shared/lean-migration/enum-mappings';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import {
  AssignmentStatusValue,
  findTransition,
} from '../domain/value-objects/assignment-status';
import { OnboardingApprovalGateService } from './onboarding-approval-gate.service';

export interface TransitionAssignmentCommand {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  assignmentId: string;
  caseId?: string;
  reason?: string;
  target: AssignmentStatusValue;
  timestamp?: Date;
  // HD-3 — admin override for the BOOKED-pin hook. When provided AND
  // target === 'BOOKED', the resolver attempts an EXPLICIT-layer match
  // for this entry. Falls through to the layered resolution if the
  // entry is missing/inactive.
  appliedRateCardEntryId?: string | null;
}

const STATUS_CHANGE_TYPE: Record<AssignmentStatusValue, string> = {
  DRAFT: 'STATUS_DRAFT',
  CREATED: 'STATUS_CREATED',
  PROPOSED: 'STATUS_PROPOSED',
  IN_REVIEW: 'STATUS_IN_REVIEW',
  REJECTED: 'STATUS_REJECTED',
  BOOKED: 'STATUS_BOOKED',
  ONBOARDING: 'STATUS_ONBOARDING',
  ASSIGNED: 'STATUS_ASSIGNED',
  ON_HOLD: 'STATUS_ON_HOLD',
  COMPLETED: 'STATUS_COMPLETED',
  CANCELLED: 'STATUS_CANCELLED',
};

const AUDIT_ACTION_TYPE: Record<AssignmentStatusValue, string> = {
  DRAFT: 'assignment.draft',
  CREATED: 'assignment.created',
  PROPOSED: 'assignment.proposed',
  IN_REVIEW: 'assignment.in_review',
  REJECTED: 'assignment.rejected',
  BOOKED: 'assignment.booked',
  ONBOARDING: 'assignment.onboarding',
  ASSIGNED: 'assignment.assigned',
  ON_HOLD: 'assignment.on_hold',
  COMPLETED: 'assignment.completed',
  CANCELLED: 'assignment.cancelled',
};

// HD-8 / Chunk 8.2 — return shape includes the optional undoActionId
// so the controller layer can attach it to the response envelope.
// `undoActionId` is non-null only when target === 'CANCELLED' AND the
// optional UndoService was provided.
export interface TransitionAssignmentResult {
  assignment: ProjectAssignment;
  undoActionId: string | null;
}

@Injectable()
export class TransitionProjectAssignmentService {
  private readonly logger = new Logger(TransitionProjectAssignmentService.name);

  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly assignmentSlaService?: import('./assignment-sla.service').AssignmentSlaService,
    private readonly undoService?: UndoService,
    // HD-3 — optional. When supplied along with the prisma service,
    // BOOKED transitions trigger a rate-card resolution and pin
    // appliedRateCardEntryId + effectiveBillRate + effectiveBillCurrency
    // on the assignment row. Existing test fixtures pass nothing →
    // pre-HD-3 behaviour preserved.
    private readonly billRateResolver?: EffectiveBillRateResolverService,
    private readonly prisma?: PrismaService,
    // LEAN-P4c-1 — optional. When wired, ONBOARDING → ASSIGNED transitions
    // are blocked if the paired ProjectPosition has
    // `requiresOnboardingApproval=true` and no approval recorded.
    private readonly onboardingGate?: OnboardingApprovalGateService,
  ) {}

  /**
   * D-95 — recompute the parent SR's cached `headcountFulfilled` after a
   * transition. Inlined here (rather than calling
   * DeriveStaffingRequestStatusService) to avoid a circular dependency between
   * AssignmentsModule ↔ StaffingRequestsModule. The authoritative path for UI
   * remains `DeriveStaffingRequestStatusService` which computes derivedStatus
   * from the same query; the cached column is kept in sync as convenience for
   * legacy consumers.
   *
   * LEAN-P1-7: derive-on-read from `ProjectPosition`. The count looks at
   * paired positions (matched via `legacyStaffingRequestId`) whose
   * `fillStatus` is in the lean active set
   * `{BOOKED, ONBOARDING, ASSIGNED, ON_HOLD}`. RELEASED (which subsumes the
   * legacy COMPLETED/CANCELLED/REJECTED) is excluded — matches the
   * legacy active-status set after the lean enum collapse documented in
   * `docs/planning/lean-enum-mapping.md`.
   */
  private async syncParentSrHeadcount(staffingRequestId: string): Promise<void> {
    if (!this.prisma) return;
    const sr = await this.prisma.staffingRequest.findUnique({
      where: { id: staffingRequestId },
      select: { headcountRequired: true },
    });
    if (!sr) return;
    const filledCount = await this.prisma.projectPosition.count({
      where: {
        legacyStaffingRequestId: staffingRequestId,
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      },
    });
    const cap = sr.headcountRequired > 0 ? sr.headcountRequired : 1;
    const headcountFulfilled = Math.min(filledCount, cap);
    await this.prisma.staffingRequest.update({
      where: { id: staffingRequestId },
      data: { headcountFulfilled },
    });
  }

  /**
   * LEAN-P1-7 — re-point the canonical fill-status onto `ProjectPosition`
   * after a legacy transition lands. The paired position is located via
   * `legacyAssignmentId` (populated by the Sprint-2 backfill). The lean
   * enum is derived from the legacy status via the canonical helper in
   * `enum-mappings.ts` so REJECTED/COMPLETED/CANCELLED all collapse onto
   * `RELEASED` while their reason text is preserved on the dedicated
   * columns.
   *
   * Active-window fields (activePersonId / activeAllocationPercent /
   * activeValidFrom / activeValidTo / onboardingDate) are refreshed when
   * the new lean status is active (BOOKED/ONBOARDING/ASSIGNED/ON_HOLD)
   * and cleared on RELEASED so downstream queries do not see a person
   * still booked to a released position. D-103 actor-audit threads
   * `updatedByPersonId` on every write.
   *
   * Best-effort: any failure here must NEVER roll back the canonical
   * legacy transition. The legacy follower (ProjectPositionMirrorService)
   * runs against the paired row; positions without a Sprint-2 backfilled
   * pair are skipped.
   */
  private async mirrorTransitionToProjectPosition(
    assignment: ProjectAssignment,
    actorId: string,
  ): Promise<void> {
    if (!this.prisma) return;

    const assignmentId = assignment.assignmentId.value;
    const position = await this.prisma.projectPosition.findFirst({
      where: { legacyAssignmentId: assignmentId },
      select: { id: true },
    });
    if (!position) {
      // No paired position — either the row is pre-backfill or a brand-new
      // post-Phase-1 row not yet linked. Nothing to mirror.
      return;
    }

    const legacyStatus = assignment.status.value;
    const fillStatus = mapAssignmentStatusToFillStatus(legacyStatus);
    const isActive = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(fillStatus);
    const allocationDecimal = assignment.allocationPercent
      ? assignment.allocationPercent.value.toString()
      : null;

    const data: Record<string, unknown> = {
      fillStatus,
      onHoldReason: assignment.onHoldReason ?? null,
      onHoldCaseId: assignment.onHoldCaseId ?? null,
      rejectionReason: assignment.rejectionReason ?? null,
      rejectionReasonCode: assignment.rejectionReasonCode ?? null,
      cancellationReason: assignment.cancellationReason ?? null,
      releaseReason: assignment.cancellationReason ?? assignment.rejectionReason ?? null,
      updatedByPersonId: actorId,
    };

    if (isActive) {
      data.activePersonId = assignment.personId;
      data.activeAllocationPercent = allocationDecimal;
      data.activeValidFrom = assignment.validFrom;
      data.activeValidTo = assignment.validTo ?? null;
      data.onboardingDate = assignment.onboardingDate ?? null;
    } else if (fillStatus === 'RELEASED') {
      // Vacate the active window so bench / planner reads do not see a
      // person still booked on a released position.
      data.activePersonId = null;
      data.activeAllocationPercent = null;
      data.activeValidFrom = null;
      data.activeValidTo = null;
      data.onboardingDate = null;
    }

    await this.prisma.projectPosition.update({
      where: { id: position.id },
      data,
    });
  }

  public async execute(command: TransitionAssignmentCommand): Promise<TransitionAssignmentResult> {
    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(command.assignmentId),
    );

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const previousStatus = assignment.status.value;
    const transition = findTransition(previousStatus, command.target);

    if (!transition) {
      throw new ConflictException(
        `Assignment cannot transition from ${previousStatus} to ${command.target}.`,
      );
    }

    // LEAN-P4c-1 — onboarding-stage approval gate. Block the move to
    // ASSIGNED when the paired position requires an unsatisfied approval.
    if (this.onboardingGate) {
      await this.onboardingGate.assertTransitionAllowed(command.assignmentId, command.target);
    }

    assignment.transitionTo(command.target, {
      actorRoles: command.actorRoles,
      caseId: command.caseId,
      reason: command.reason,
      timestamp: command.timestamp,
    });

    if (this.assignmentSlaService) {
      await this.assignmentSlaService.applyTransition(assignment, command.timestamp ?? new Date());
    }

    const history = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: command.reason,
      changeType: STATUS_CHANGE_TYPE[command.target],
      changedByPersonId: command.actorId,
      newSnapshot: {
        previousStatus,
        status: assignment.status.value,
      },
      occurredAt: command.timestamp ?? new Date(),
      previousSnapshot: { status: previousStatus },
    });

    // F-118 / D-103-write-path round 28 — actor-audit on every transition.
    assignment.setUpdatedBy(command.actorId);
    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendHistory(history);

    // LEAN-P1-7: re-point the canonical fill-status onto `ProjectPosition`.
    // The legacy assignment write above remains the legacy source of truth
    // for non-migrated consumers; the lean follower (the inverted
    // ProjectPositionMirrorService) handles the opposite direction when
    // lean-only writers run. Best-effort — mirror failure must not block.
    try {
      await this.mirrorTransitionToProjectPosition(assignment, command.actorId);
    } catch (err) {
      this.logger.warn(
        `ProjectPosition mirror failed for assignment ${assignment.assignmentId.value}: ` +
          `${(err as Error).message}`,
      );
    }

    // D-95 — keep the parent SR's `headcountFulfilled` cached column in sync
    // with the live assignment count. The cached counter previously only
    // moved +1 on slate pick; cancelling an assignment left it inflated,
    // which made the SR derive as Filled/In-progress when it was actually
    // open again (BUG-SR-1). Only fires when the assignment links to an
    // SR and the prisma client is wired (test fixtures may not supply it).
    if (assignment.staffingRequestId && this.prisma) {
      try {
        await this.syncParentSrHeadcount(assignment.staffingRequestId);
      } catch (err) {
        // Counter sync failure must NEVER block the primary transition.
        this.logger.warn(
          `Headcount-recompute failed for SR ${assignment.staffingRequestId}: ${(err as Error).message}`,
        );
      }
    }

    this.auditLogger?.record({
      actionType: AUDIT_ACTION_TYPE[command.target],
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Assignment ${assignment.assignmentId.value} transitioned ${previousStatus} → ${assignment.status.value}.`,
      details: {
        previousStatus,
        reason: command.reason,
        status: assignment.status.value,
      },
      metadata: {
        previousStatus,
        reason: command.reason,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });

    await this.notificationEventTranslator?.assignmentStatusChanged?.({
      assignmentId: assignment.assignmentId.value,
      previousStatus,
      reason: command.reason,
      recipientPersonId: assignment.personId,
      status: assignment.status.value,
    });

    // HD-3 — at BOOKED, ask the resolver to pick a rate card entry and
    // pin it on the assignment row. Skipped when:
    //   - target !== 'BOOKED' (only this transition pins),
    //   - resolver / prisma not wired (test fixtures, in-memory paths),
    //   - the row already has a pinned entry (re-BOOKED idempotent).
    if (command.target === 'BOOKED') {
      try {
        await this.pinRateCardOnBooked(assignment, command);
      } catch (err) {
        // Pinning failure must NEVER block the primary transition.
        // Operators see the missing-rate banner instead.
        this.logger.warn(
          `Rate-card pin failed for assignment ${assignment.assignmentId.value}: ${(err as Error).message}`,
        );
      }
    }

    // HD-8 / Chunk 8.2 — register an undo token on cancel so the FE
    // can offer a "Undo" toast. The inverse is "transition back to the
    // previous status"; the AssignmentCancelUndoExecutor reads this
    // payload and re-calls this same service to reverse the change.
    let undoActionId: string | null = null;
    if (command.target === 'CANCELLED' && this.undoService) {
      try {
        undoActionId = await this.undoService.register({
          actorId: command.actorId,
          actionType: 'assignment.cancel',
          entityId: assignment.assignmentId.value,
          inversePayload: { previousStatus, reason: command.reason ?? null },
        });
      } catch {
        // Undo registration is opt-in convenience — never block the
        // primary cancel on it.
      }
    }

    return { assignment, undoActionId };
  }

  // HD-3 — Pin a rate-card entry on the assignment row at BOOKED. Reads
  // the assignment's row from the DB (post-save) to check the already-pinned
  // state, then queries the person + project for resolver context, then
  // calls the resolver, then writes the pin via a single update.
  private async pinRateCardOnBooked(
    assignment: ProjectAssignment,
    command: TransitionAssignmentCommand,
  ): Promise<void> {
    if (!this.billRateResolver || !this.prisma) return;

    const row = await this.prisma.projectAssignment.findUnique({
      where: { id: assignment.assignmentId.value },
      select: {
        appliedRateCardEntryId: true,
        personId: true,
        projectId: true,
        staffingRole: true,
        validFrom: true,
        tenantId: true,
      },
    });
    if (!row) return;
    // Idempotent — never overwrite an existing pin.
    if (row.appliedRateCardEntryId) return;

    const [person, project] = await Promise.all([
      this.prisma.person.findUnique({
        where: { id: row.personId },
        select: {
          grade: true,
          personSkills: { select: { skill: { select: { name: true } } } },
        },
      }),
      this.prisma.project.findUnique({
        where: { id: row.projectId },
        select: { clientId: true },
      }),
    ]);
    if (!person) return;

    const personSkills = (person.personSkills ?? []).map(
      (ps: { skill: { name: string } }) => ps.skill.name,
    );

    const verdict = await this.billRateResolver.resolve({
      staffingRole: row.staffingRole,
      personGrade: person.grade ?? null,
      personSkills,
      clientId: project?.clientId ?? null,
      assignmentValidFrom: row.validFrom,
      tenantId: row.tenantId ?? null,
      explicitEntryId: command.appliedRateCardEntryId ?? null,
    });

    if (verdict.resolvedBy === 'NONE' || !verdict.entryId) {
      // No matching card. The FE renders a missing-rate banner from
      // the absence of `effectiveBillRate` on the assignment.
      return;
    }

    await this.prisma.projectAssignment.update({
      where: { id: assignment.assignmentId.value },
      data: {
        appliedRateCardEntryId: verdict.entryId,
        effectiveBillRate: verdict.hourlyRate,
        effectiveBillCurrency: verdict.currencyCode,
        // F-118 / D-103-write-path round 28 — also stamp on bill-rate pin.
        updatedByPersonId: command.actorId ?? null,
      },
    });

    this.auditLogger?.record({
      actionType: 'assignment.rate_card_pinned',
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Pinned rate card entry ${verdict.entryId} (${verdict.hourlyRate} ${verdict.currencyCode}) on assignment ${assignment.assignmentId.value}.`,
      details: {
        assignmentId: assignment.assignmentId.value,
        rateCardId: verdict.rateCardId,
        rateCardEntryId: verdict.entryId,
        hourlyRate: verdict.hourlyRate?.toString() ?? null,
        currencyCode: verdict.currencyCode,
        resolvedBy: verdict.resolvedBy,
      },
      metadata: {
        rateCardEntryId: verdict.entryId,
        resolvedBy: verdict.resolvedBy,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });
  }
}
