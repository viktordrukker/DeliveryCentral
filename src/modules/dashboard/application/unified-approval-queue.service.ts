import { BadRequestException, Injectable } from '@nestjs/common';

import { ApproveCaseService } from '@src/modules/case-management/application/approve-case.service';
import { DecideBudgetChangeService } from '@src/modules/financial-governance/application/decide-budget-change.service';
import { PlatformRole, isPlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { LeaveRequestsService } from '@src/modules/leave-requests/application/leave-requests.service';
import { DecideProjectActivationService } from '@src/modules/project-registry/application/decide-project-activation.service';
import { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';
import { SkillEndorsementService } from '@src/modules/skills/application/skill-endorsement.service';
import { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  ApprovalQueueItemDto,
  ApprovalQueueResponseDto,
  ApprovalQueueSource,
  SlaStage,
} from './contracts/approval-queue-item.dto';
import {
  UnifiedApprovalDecisionResponseDto,
  UnifiedApprovalDecisionSource,
} from './contracts/unified-approval-decision.dto';

interface ListArgs {
  sources?: ApprovalQueueSource[];
  page?: number;
  pageSize?: number;
}

interface DecideArgs {
  approvalId: string;
  source: UnifiedApprovalDecisionSource;
  decision: 'APPROVE' | 'REJECT';
  actorId: string;
  actorRoles: string[];
  comment?: string;
  reason?: string;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * FE-#264 — unified approval queue aggregator.
 *
 * Combines pending approvals across 7 source kinds into a single ranked
 * list. v1 fields:
 *   - position-proposal — ProjectPosition with fillStatus=PROPOSED
 *   - budget            — BudgetApproval status=PENDING
 *   - activation        — ProjectActivationApproval decision IS NULL
 *   - leave             — LeaveRequest status=PENDING
 *   - case              — CaseRecord status='OPEN' (any case awaiting action)
 *   - timesheet         — TimesheetWeek status=SUBMITTED
 *   - skill-review      — PersonSkill where selfEndorsed=TRUE AND
 *                         endorsedByPersonId IS NULL (LEAN-P4c-4).
 *
 * SLA fields (slaDueAt / slaBreachedAt / slaStage) are NULL in v1; they
 * populate when issue #257 lands the columns on ApprovalQueueItem source
 * tables.
 *
 * Role-based filtering is at the caller level — the aggregator returns
 * everything visible to MANAGEMENT_ROLES and the FE narrows by tab.
 */
@Injectable()
export class UnifiedApprovalQueueService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly decideBudgetChangeService: DecideBudgetChangeService,
    private readonly decideProjectActivationService: DecideProjectActivationService,
    private readonly approveCaseService: ApproveCaseService,
    private readonly timesheetsService: TimesheetsService,
    private readonly transitionProjectPositionFillService: TransitionProjectPositionFillService,
    private readonly skillEndorsementService: SkillEndorsementService,
  ) {}

  /**
   * V2 Scope §4 — unified decision dispatcher. Routes by `source` to the
   * existing per-source approval services. Each downstream service owns its
   * own validation, audit-logging, and actor-threading; this service only
   * normalises the response shape.
   *
   * `reason` is required for REJECT on budget / activation / case sources
   * because the downstream services demand it; the check is hoisted here so
   * the FE gets a single, consistent 400 instead of three different errors.
   */
  public async decide(args: DecideArgs): Promise<UnifiedApprovalDecisionResponseDto> {
    if (
      args.decision === 'REJECT' &&
      !args.reason?.trim() &&
      (args.source === 'budget' ||
        args.source === 'activation' ||
        args.source === 'case' ||
        args.source === 'position-proposal')
    ) {
      throw new BadRequestException(
        `A reason is required when rejecting a ${args.source} approval.`,
      );
    }

    const decidedAtIso = (date: Date | string | null | undefined): string =>
      typeof date === 'string'
        ? date
        : date instanceof Date
          ? date.toISOString()
          : new Date().toISOString();

    if (args.source === 'position-proposal') {
      // The queue surfaces ProjectPosition rows with fillStatus=PROPOSED;
      // approval flips PROPOSED → BOOKED and rejection flips PROPOSED → OPEN
      // (the position stays available for re-proposal). Both transitions are
      // gated by TransitionProjectPositionFillService's state machine, which
      // owns the PM/DM/director/admin RBAC check.
      const toStatus = args.decision === 'APPROVE' ? 'BOOKED' : 'OPEN';
      const platformRoles = args.actorRoles.filter(isPlatformRole) as readonly PlatformRole[];
      const position = await this.transitionProjectPositionFillService.execute({
        positionId: args.approvalId,
        toStatus,
        actorId: args.actorId,
        actorRoles: platformRoles,
        reason: args.reason ?? args.comment,
      });
      return {
        approvalId: position.positionId.value,
        source: 'position-proposal',
        decision: args.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decidedAt: decidedAtIso(null),
        decidedByPersonId: args.actorId,
      };
    }

    if (args.source === 'leave') {
      const row =
        args.decision === 'APPROVE'
          ? await this.leaveRequestsService.approve(args.approvalId, args.actorId, args.comment)
          : await this.leaveRequestsService.reject(args.approvalId, args.actorId, args.comment);
      return {
        approvalId: row.id,
        source: 'leave',
        decision: args.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decidedAt: decidedAtIso(row.reviewedAt),
        decidedByPersonId: args.actorId,
      };
    }

    if (args.source === 'budget') {
      const result = await this.decideBudgetChangeService.execute({
        actorId: args.actorId,
        approvalId: args.approvalId,
        decision: args.decision,
        reason: args.reason,
      });
      return {
        approvalId: result.approvalId,
        source: 'budget',
        decision: result.decision,
        decidedAt: decidedAtIso(null),
        decidedByPersonId: args.actorId,
      };
    }

    if (args.source === 'activation') {
      const result = await this.decideProjectActivationService.execute({
        actorId: args.actorId,
        projectId: args.approvalId,
        decision: args.decision,
        reason: args.reason,
      });
      return {
        approvalId: result.approvalId,
        source: 'activation',
        decision: args.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decidedAt: decidedAtIso(null),
        decidedByPersonId: args.actorId,
      };
    }

    if (args.source === 'case') {
      const caseRecord =
        args.decision === 'APPROVE'
          ? await this.approveCaseService.approve({
              caseId: args.approvalId,
              actorId: args.actorId,
            })
          : await this.approveCaseService.reject({
              caseId: args.approvalId,
              actorId: args.actorId,
              reason: args.reason as string,
            });
      return {
        approvalId: caseRecord.id,
        source: 'case',
        decision: args.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decidedAt: decidedAtIso(null),
        decidedByPersonId: args.actorId,
      };
    }

    if (args.source === 'skill-review') {
      // LEAN-P4c-4 — HR manager approves or rejects a self-added skill row.
      // APPROVE stamps `endorsedByPersonId` + `endorsedAt`; REJECT deletes
      // the row (no soft-delete). Both paths emit a skill-endorsement audit
      // log entry.
      if (args.decision === 'APPROVE') {
        const result = await this.skillEndorsementService.approve(args.approvalId, args.actorId);
        return {
          approvalId: result.id,
          source: 'skill-review',
          decision: 'APPROVED',
          decidedAt: decidedAtIso(result.endorsedAt),
          decidedByPersonId: args.actorId,
        };
      }
      const result = await this.skillEndorsementService.reject(
        args.approvalId,
        args.actorId,
        args.reason ?? args.comment,
      );
      return {
        approvalId: result.id,
        source: 'skill-review',
        decision: 'REJECTED',
        decidedAt: decidedAtIso(null),
        decidedByPersonId: args.actorId,
      };
    }

    if (args.source === 'timesheet') {
      const row =
        args.decision === 'APPROVE'
          ? await this.timesheetsService.approveWeek(args.approvalId, args.actorId, args.actorRoles)
          : await this.timesheetsService.rejectWeek(
              args.approvalId,
              { reason: args.reason ?? '' },
              args.actorId,
            );
      return {
        approvalId: row.id,
        source: args.source,
        decision: args.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decidedAt: decidedAtIso(null),
        decidedByPersonId: args.actorId,
      };
    }

    throw new BadRequestException(`Unsupported approval source: ${args.source}`);
  }

  public async list(args: ListArgs): Promise<ApprovalQueueResponseDto> {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 25));
    const sources = new Set(
      args.sources && args.sources.length > 0
        ? args.sources
        : ([
            'position-proposal',
            'budget',
            'activation',
            'leave',
            'case',
            'timesheet',
            'skill-review',
          ] as ApprovalQueueSource[]),
    );

    const [positions, budgets, activations, leaves, cases, timesheets, skillReviews] =
      await Promise.all([
        sources.has('position-proposal') ? this.loadPositionProposals() : [],
        sources.has('budget') ? this.loadBudgetApprovals() : [],
        sources.has('activation') ? this.loadActivations() : [],
        sources.has('leave') ? this.loadLeaveRequests() : [],
        sources.has('case') ? this.loadCases() : [],
        sources.has('timesheet') ? this.loadTimesheets() : [],
        sources.has('skill-review') ? this.skillEndorsementService.listPending() : [],
      ]);

    const items: ApprovalQueueItemDto[] = [
      ...positions,
      ...budgets,
      ...activations,
      ...leaves,
      ...cases,
      ...timesheets,
      ...skillReviews,
    ];
    items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  }

  private async loadPositionProposals(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.projectPosition.findMany({
      where: { fillStatus: 'PROPOSED' },
      select: {
        id: true,
        publicId: true,
        role: true,
        projectId: true,
        activePersonId: true,
        updatedAt: true,
        updatedByPerson: { select: { id: true, displayName: true } },
      },
      take: 100,
    });
    return rows.map((r) => itemFor({
      source: 'position-proposal',
      id: r.id,
      // W1-12 — ProjectPosition carries `pos_…` publicId; surface it to the FE
      // so the row "Open" link routes to /positions/<publicId> instead of the
      // raw UUID. Backend accepts both via the publicId resolver middleware.
      targetPublicId: r.publicId ?? null,
      title: `Position fill proposed: ${r.role}`,
      submittedAt: r.updatedAt,
      submittedBy: r.updatedByPerson ?? null,
      href: `/positions/${r.publicId ?? r.id}`,
      meta: { projectId: r.projectId, candidatePersonId: r.activePersonId },
    }));
  }

  private async loadBudgetApprovals(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.budgetApproval.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        requestedAt: true,
        requestedByPerson: { select: { id: true, displayName: true } },
        projectBudget: {
          select: {
            projectId: true,
            fiscalYear: true,
          },
        },
      },
      take: 100,
    });
    // W1-12 — ProjectBudget has no Project Prisma relation; look up the
    // project publicId in one batched query so we can route via opaque ids.
    const projectIds = Array.from(new Set(rows.map((r) => r.projectBudget.projectId)));
    const projects = projectIds.length
      ? await this.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, publicId: true },
        })
      : [];
    const projectPublicIdById = new Map(projects.map((p) => [p.id, p.publicId ?? null]));
    return rows.map((r) => {
      const projectPublicId = projectPublicIdById.get(r.projectBudget.projectId) ?? null;
      return itemFor({
        source: 'budget',
        id: r.id,
        // W1-12 — BudgetApproval has no publicId of its own; route via the
        // owning Project publicId so the URL is opaque.
        targetPublicId: projectPublicId,
        title: `Budget approval (FY${r.projectBudget.fiscalYear})`,
        submittedAt: r.requestedAt,
        submittedBy: r.requestedByPerson ?? null,
        href: `/projects/${projectPublicId ?? r.projectBudget.projectId}?tab=money&approval=${r.id}`,
        meta: {
          projectId: r.projectBudget.projectId,
          projectPublicId,
          fiscalYear: r.projectBudget.fiscalYear,
        },
      });
    });
  }

  private async loadActivations(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.projectActivationApproval.findMany({
      where: { decision: null },
      select: {
        id: true,
        projectId: true,
        requestedAt: true,
        requestedBy: { select: { id: true, displayName: true } },
        project: { select: { name: true, publicId: true } },
      },
      take: 100,
    });
    return rows.map((r) => {
      const projectPublicId = r.project.publicId ?? null;
      return itemFor({
        source: 'activation',
        id: r.id,
        // W1-12 — ProjectActivationApproval has no publicId of its own; route
        // via the owning Project publicId.
        targetPublicId: projectPublicId,
        title: `Activate project: ${r.project.name}`,
        submittedAt: r.requestedAt,
        submittedBy: r.requestedBy ?? null,
        href: `/projects/${projectPublicId ?? r.projectId}?activation=${r.id}`,
        meta: { projectId: r.projectId, projectPublicId },
      });
    });
  }

  private async loadLeaveRequests(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        publicId: true,
        type: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        createdByPerson: { select: { id: true, displayName: true } },
      },
      take: 100,
    });
    return rows.map((r) => itemFor({
      source: 'leave',
      id: r.id,
      // W1-12 — LeaveRequest carries `lvr_…` publicId.
      targetPublicId: r.publicId ?? null,
      title: `Leave: ${r.type} ${isoDate(r.startDate)}…${isoDate(r.endDate)}`,
      submittedAt: r.createdAt,
      submittedBy: r.createdByPerson ?? null,
      href: `/leave-requests/${r.publicId ?? r.id}`,
      meta: { type: r.type },
    }));
  }

  private async loadTimesheets(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.timesheetWeek.findMany({
      where: { status: 'SUBMITTED' },
      select: {
        id: true,
        publicId: true,
        personId: true,
        weekStart: true,
        submittedAt: true,
        createdAt: true,
        totalHours: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });
    const personIds = Array.from(new Set(rows.map((r) => r.personId)));
    const persons = personIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: personIds } },
          select: { id: true, displayName: true },
        })
      : [];
    const personById = new Map(persons.map((p) => [p.id, p]));
    return rows.map((r) => {
      const person = personById.get(r.personId);
      const submittedAt = r.submittedAt ?? r.createdAt;
      return itemFor({
        source: 'timesheet',
        id: r.id,
        // W1-12 — TimesheetWeek carries `tsh_…` publicId.
        targetPublicId: r.publicId ?? null,
        title: `Timesheet week of ${isoDate(r.weekStart)}`,
        submittedAt,
        submittedBy: person ?? null,
        href: `/approvals/${r.publicId ?? r.id}?source=timesheet`,
        meta: {
          personId: r.personId,
          weekStart: isoDate(r.weekStart),
          totalHours: r.totalHours != null ? Number(r.totalHours) : null,
        },
      });
    });
  }

  private async loadCases(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.caseRecord.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
        publicId: true,
        caseNumber: true,
        summary: true,
        createdAt: true,
        ownerPerson: { select: { id: true, displayName: true } },
      },
      take: 100,
    });
    return rows.map((r) => itemFor({
      source: 'case',
      id: r.id,
      // W1-12 — CaseRecord carries `case_…` publicId.
      targetPublicId: r.publicId ?? null,
      title: `Case ${r.caseNumber}: ${r.summary ?? '(no summary)'}`,
      submittedAt: r.createdAt,
      submittedBy: r.ownerPerson ?? null,
      href: `/cases/${r.publicId ?? r.id}`,
      meta: { caseNumber: r.caseNumber },
    }));
  }
}

function itemFor(args: {
  source: ApprovalQueueSource;
  id: string;
  targetPublicId: string | null;
  title: string;
  submittedAt: Date;
  submittedBy: { id: string; displayName: string } | null;
  href: string;
  meta: Record<string, unknown>;
}): ApprovalQueueItemDto {
  const ageHours = Math.max(0, Math.floor((Date.now() - args.submittedAt.getTime()) / HOUR_MS));
  // v1: no slaDueAt / slaBreachedAt — wait for #257.
  const slaStage: SlaStage | null = null;
  return {
    id: args.id,
    targetPublicId: args.targetPublicId,
    source: args.source,
    title: args.title,
    submittedBy: args.submittedBy
      ? { personId: args.submittedBy.id, displayName: args.submittedBy.displayName }
      : null,
    submittedAt: args.submittedAt.toISOString(),
    slaDueAt: null,
    slaBreachedAt: null,
    slaStage,
    ageHours,
    href: args.href,
    meta: args.meta,
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
