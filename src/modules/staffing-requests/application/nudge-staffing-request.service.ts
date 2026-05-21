import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

const NUDGE_RATE_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours per SR

export interface NudgeResult {
  /** True if a nudge was written; false if rate-limited (an earlier nudge was within the window). */
  nudged: boolean;
  /** ISO timestamp of the most recent nudge (this one if `nudged`, the prior one if rate-limited). */
  lastNudgedAt: string;
  /** When the rate-limit window expires (null if a new nudge was written and there's no active prior one). */
  rateLimitedUntil: string | null;
}

// F-57 / 20c-11 — deleted the hand-rolled `PrismaShape` gateway interface
// and the `as unknown as PrismaShape` coercion. The Prisma client already
// exposes typed `staffingRequest` + `auditLog` delegates; the `select`
// clauses narrow the read shape directly.

/**
 * F-3.4 / 21-09 — PM/RM can nudge a stalled staffing-request approver.
 *
 * Rules:
 * - SR must be in OPEN or IN_REVIEW status (other statuses don't need nudging).
 * - At most one nudge per 4 hours per SR — second attempt returns
 *   `nudged: false` with `rateLimitedUntil` set so the FE can show
 *   "try again in Xh".
 * - Writes a `staffing_request.nudged` AuditLog row with the actor id
 *   and the SR id. Hash chain continuity preserved by AuditLoggerService.
 *
 * A future iteration can wire in-app notifications to the approver(s)
 * derived from the slate / responsibility-rule resolver. The audit row
 * is the durable record either way.
 */
@Injectable()
export class NudgeStaffingRequestService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  public async nudge(staffingRequestId: string, actorId: string): Promise<NudgeResult> {
    const request = await this.prisma.staffingRequest.findUnique({
      where: { id: staffingRequestId },
      select: { id: true, status: true },
    });
    if (!request) {
      throw new NotFoundException('Staffing request not found.');
    }
    if (request.status !== 'OPEN' && request.status !== 'IN_REVIEW') {
      throw new NotFoundException(
        `Staffing request ${staffingRequestId} is in status ${request.status}; nudge only applies to OPEN or IN_REVIEW.`,
      );
    }

    const since = new Date(Date.now() - NUDGE_RATE_LIMIT_MS);
    const recent = await this.prisma.auditLog.findFirst({
      where: {
        aggregateId: staffingRequestId,
        eventName: 'staffing_request.nudged',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      return {
        nudged: false,
        lastNudgedAt: recent.createdAt.toISOString(),
        rateLimitedUntil: new Date(recent.createdAt.getTime() + NUDGE_RATE_LIMIT_MS).toISOString(),
      };
    }

    const now = new Date();
    this.auditLogger.record({
      actionType: 'staffing_request.nudged',
      actorId,
      category: 'approval',
      changeSummary: `Staffing request ${staffingRequestId} approver nudged.`,
      details: { staffingRequestId },
      metadata: { staffingRequestId },
      targetEntityId: staffingRequestId,
      targetEntityType: 'STAFFING_REQUEST',
    });

    return {
      nudged: true,
      lastNudgedAt: now.toISOString(),
      rateLimitedUntil: new Date(now.getTime() + NUDGE_RATE_LIMIT_MS).toISOString(),
    };
  }
}
