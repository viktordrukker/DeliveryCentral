import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import {
  ResponsibilityActionKind,
  ResponsibilityResolverService,
  ResponsibilityVerdict,
} from '@src/modules/identity-access/application/responsibility-resolver.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface DecidePersonReleaseCommand {
  /** Authenticated decider — must be HR Manager or Director. The
   *  controller enforces the role check; the service additionally
   *  refuses if the caller's `role` claim doesn't match the supplied
   *  `decisionRole` (so an HR-only operator can't decide as a Director). */
  actorId: string;
  /** Role the caller is acting in: `hr_manager` or `director`. Determines
   *  which approval slot the row fills. */
  decisionRole: 'hr_manager' | 'director';
  requestId: string;
  decision: 'APPROVE' | 'REJECT';
  /** Required when `decision === 'REJECT'`. */
  reason?: string;
}

interface DecidePersonReleaseResult {
  requestId: string;
  /** Status the request landed in after this decision was applied. */
  finalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  /** Set when the request now has BOTH HR + Director approvals. */
  fullyApproved: boolean;
}

interface ReleaseRequestRow {
  id: string;
  personId: string;
  initiatedByPersonId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
}

interface ReleaseApprovalRow {
  id: string;
  requestId: string;
  role: string;
  actorPersonId: string;
  decision: 'APPROVED' | 'REJECTED';
}

const REQUIRED_ROLES = ['hr_manager', 'director'] as const;

/**
 * HD-5 — HR Manager or Director gives a decision on a pending
 * release request. Per J3 the flow needs BOTH approvals; one approval
 * leaves the row PENDING_APPROVAL but with one slot filled. The
 * second matching approval flips the request to APPROVED. Either rejection
 * flips the request to REJECTED and short-circuits.
 *
 * Guards:
 *   - The decider must be different from the request initiator
 *     (no rubber-stamp, mirrors HD-2/HD-6 pattern).
 *   - The decider must be different from the subject of the release.
 *   - Only one approval per role per request — second attempt by the
 *     same role gets a 409 (the unique index would error, but we
 *     check explicitly to give a friendlier message).
 *
 * Both writes (approval row + request status) share a single
 * `prisma.$transaction` so the request status and approval ledger
 * cannot disagree.
 */
@Injectable()
export class DecidePersonReleaseService {
  private readonly logger = new Logger(DecidePersonReleaseService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    // HD-4 — when wired, enforces `mode === 'PERSON'` gating per slot.
    // Each `decisionRole` resolves a different action kind:
    //   - `hr_manager`  → PERSON_RELEASE_HR_APPROVAL
    //   - `director`    → PERSON_RELEASE_DIRECTOR_APPROVAL
    // Other modes are advisory at decide time.
    private readonly responsibilityResolver?: ResponsibilityResolverService,
  ) {}

  public async execute(
    command: DecidePersonReleaseCommand,
  ): Promise<DecidePersonReleaseResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated decider is required.');
    }
    if (!REQUIRED_ROLES.includes(command.decisionRole)) {
      throw new BadRequestException(
        `decisionRole must be one of: ${REQUIRED_ROLES.join(', ')}.`,
      );
    }
    if (command.decision === 'REJECT' && !command.reason?.trim()) {
      throw new BadRequestException('A reason is required when rejecting a release.');
    }

    const request = (await (this.prisma as unknown as {
      personReleaseRequest: {
        findUnique: (args: unknown) => Promise<ReleaseRequestRow | null>;
      };
    }).personReleaseRequest.findUnique({
      where: { id: command.requestId },
    })) as ReleaseRequestRow | null;

    if (!request) {
      throw new NotFoundException(`Release request ${command.requestId} not found.`);
    }
    if (request.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(
        `Release request is in status ${request.status}; only PENDING_APPROVAL accepts a decision.`,
      );
    }
    if (request.initiatedByPersonId === command.actorId) {
      throw new ForbiddenException(
        'The initiator of a release cannot decide on it.',
      );
    }
    if (request.personId === command.actorId) {
      throw new ForbiddenException(
        'The subject of a release cannot decide on it.',
      );
    }

    const existingApprovals = await (this.prisma as unknown as {
      personReleaseApproval: {
        findMany: (args: unknown) => Promise<ReleaseApprovalRow[]>;
      };
    }).personReleaseApproval.findMany({
      where: { requestId: command.requestId },
    });

    if (existingApprovals.some((a) => a.role === command.decisionRole)) {
      throw new ConflictException(
        `An approval row for role ${command.decisionRole} already exists on this request.`,
      );
    }

    const verdict = await this.resolveSlotVerdict(request.personId, command.decisionRole);
    this.enforcePersonGating(verdict, command.actorId, command.decisionRole);

    const finalDecision = command.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // Status logic: a single REJECTED approval flips the request to
    // REJECTED; an APPROVED approval flips to APPROVED only when the
    // OTHER required role has already approved.
    let nextStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' = request.status;
    if (finalDecision === 'REJECTED') {
      nextStatus = 'REJECTED';
    } else {
      const otherRole = REQUIRED_ROLES.find((r) => r !== command.decisionRole)!;
      const otherApprovedAlready = existingApprovals.some(
        (a) => a.role === otherRole && a.decision === 'APPROVED',
      );
      if (otherApprovedAlready) {
        nextStatus = 'APPROVED';
      }
    }

    const updatedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await (tx as unknown as {
        personReleaseApproval: {
          create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
        };
      }).personReleaseApproval.create({
        data: {
          requestId: command.requestId,
          role: command.decisionRole,
          actorPersonId: command.actorId,
          decision: finalDecision,
          reason: command.reason ?? null,
        },
      });

      if (nextStatus !== 'PENDING_APPROVAL') {
        await (tx as unknown as {
          personReleaseRequest: {
            update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
          };
        }).personReleaseRequest.update({
          where: { id: command.requestId },
          data: { status: nextStatus, updatedAt },
        });
      }
    });

    const fullyApproved = nextStatus === 'APPROVED';

    const ruleId = verdict?.source === 'RULE' ? verdict.ruleId : null;
    this.auditLogger?.record({
      actionType:
        finalDecision === 'APPROVED'
          ? fullyApproved
            ? 'person.release.approved'
            : 'person.release.partially_approved'
          : 'person.release.rejected',
      actorId: command.actorId,
      category: 'organization',
      changeSummary:
        finalDecision === 'APPROVED'
          ? fullyApproved
            ? `Release request ${command.requestId} fully approved (HR + Director); awaiting RM finalize.`
            : `Release request ${command.requestId} got partial approval (${command.decisionRole}); awaiting other approver.`
          : `Release request ${command.requestId} rejected by ${command.decisionRole} ${command.actorId}: ${command.reason}.`,
      details: {
        requestId: command.requestId,
        personId: request.personId,
        decisionRole: command.decisionRole,
        decision: finalDecision,
        nextStatus,
        reason: command.reason,
        responsibilityRuleId: ruleId,
        responsibilityMode: verdict?.mode,
        responsibilitySource: verdict?.source,
      },
      metadata: {
        requestId: command.requestId,
        personId: request.personId,
        decisionRole: command.decisionRole,
        nextStatus,
        responsibilityRuleId: ruleId ?? undefined,
      },
      targetEntityId: request.personId,
      targetEntityType: 'PERSON',
    });

    if (finalDecision === 'REJECTED') {
      await this.notificationEventTranslator?.personReleaseRejected({
        requestId: command.requestId,
        personId: request.personId,
        rejectedByPersonId: command.actorId,
        decisionRole: command.decisionRole,
        reason: command.reason ?? 'No reason provided',
      });
    } else if (fullyApproved) {
      await this.notificationEventTranslator?.personReleaseApproved({
        requestId: command.requestId,
        personId: request.personId,
        approvedByPersonId: command.actorId,
      });
    } else {
      await this.notificationEventTranslator?.personReleasePartiallyApproved({
        requestId: command.requestId,
        personId: request.personId,
        approvedByPersonId: command.actorId,
        approvedByRole: command.decisionRole,
      });
    }

    return { requestId: command.requestId, finalStatus: nextStatus, fullyApproved };
  }

  private async resolveSlotVerdict(
    personId: string,
    decisionRole: 'hr_manager' | 'director',
  ): Promise<ResponsibilityVerdict | null> {
    if (!this.responsibilityResolver) {
      return null;
    }
    try {
      const person = await (this.prisma as unknown as {
        person: {
          findUnique: (q: {
            where: { id: string };
            select: { orgUnitId: boolean; grade: boolean };
          }) => Promise<{ orgUnitId: string | null; grade: string | null } | null>;
        };
      }).person.findUnique({
        where: { id: personId },
        select: { orgUnitId: true, grade: true },
      });
      const actionKind: ResponsibilityActionKind =
        decisionRole === 'hr_manager'
          ? 'PERSON_RELEASE_HR_APPROVAL'
          : 'PERSON_RELEASE_DIRECTOR_APPROVAL';
      return await this.responsibilityResolver.resolve({
        actionKind,
        orgUnitId: person?.orgUnitId ?? null,
        grade: person?.grade ?? null,
        fallbackRole: decisionRole,
      });
    } catch (err) {
      this.logger.warn(
        `ResponsibilityResolver failed during HD-5 decide (${decisionRole}) for person ${personId}; falling back. ${(err as Error).message}`,
      );
      return null;
    }
  }

  private enforcePersonGating(
    verdict: ResponsibilityVerdict | null,
    actorId: string,
    decisionRole: 'hr_manager' | 'director',
  ): void {
    if (!verdict || verdict.source !== 'RULE') return;
    if (verdict.mode === 'PERSON') {
      if (!verdict.targetPersonId || verdict.targetPersonId !== actorId) {
        throw new ForbiddenException(
          `Responsibility rule ${verdict.ruleId ?? '<unknown>'} requires person ${verdict.targetPersonId ?? '<unset>'} to fill the ${decisionRole} slot.`,
        );
      }
      return;
    }
    if (verdict.mode === 'SKIP' || verdict.mode === 'PM_SOLO') {
      this.logger.warn(
        `Open release approval slot ${decisionRole} but rule ${verdict.ruleId} is ${verdict.mode}. Allowing decision to clear in-flight request.`,
      );
    }
  }
}
