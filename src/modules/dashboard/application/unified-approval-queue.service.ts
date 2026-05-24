import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  ApprovalQueueItemDto,
  ApprovalQueueResponseDto,
  ApprovalQueueSource,
  SlaStage,
} from './contracts/approval-queue-item.dto';

interface ListArgs {
  sources?: ApprovalQueueSource[];
  page?: number;
  pageSize?: number;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * FE-#264 — unified approval queue aggregator.
 *
 * Combines pending approvals across 5 source kinds into a single ranked
 * list. v1 fields:
 *   - position-proposal — ProjectPosition with fillStatus=PROPOSED
 *   - budget            — BudgetApproval status=PENDING
 *   - activation        — ProjectActivationApproval decision IS NULL
 *   - leave             — LeaveRequest status=PENDING
 *   - case              — CaseRecord status='OPEN' (any case awaiting action)
 *
 * skill-review deferred — no canonical SkillReview model in main yet.
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
  public constructor(private readonly prisma: PrismaService) {}

  public async list(args: ListArgs): Promise<ApprovalQueueResponseDto> {
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 25));
    const sources = new Set(
      args.sources && args.sources.length > 0
        ? args.sources
        : (['position-proposal', 'budget', 'activation', 'leave', 'case'] as ApprovalQueueSource[]),
    );

    const [positions, budgets, activations, leaves, cases] = await Promise.all([
      sources.has('position-proposal') ? this.loadPositionProposals() : [],
      sources.has('budget') ? this.loadBudgetApprovals() : [],
      sources.has('activation') ? this.loadActivations() : [],
      sources.has('leave') ? this.loadLeaveRequests() : [],
      sources.has('case') ? this.loadCases() : [],
    ]);

    const items: ApprovalQueueItemDto[] = [...positions, ...budgets, ...activations, ...leaves, ...cases];
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
      title: `Position fill proposed: ${r.role}`,
      submittedAt: r.updatedAt,
      submittedBy: r.updatedByPerson ?? null,
      href: `/positions/${r.id}`,
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
        projectBudget: { select: { projectId: true, fiscalYear: true } },
      },
      take: 100,
    });
    return rows.map((r) => itemFor({
      source: 'budget',
      id: r.id,
      title: `Budget approval (FY${r.projectBudget.fiscalYear})`,
      submittedAt: r.requestedAt,
      submittedBy: r.requestedByPerson ?? null,
      href: `/projects/${r.projectBudget.projectId}?tab=money&approval=${r.id}`,
      meta: { projectId: r.projectBudget.projectId, fiscalYear: r.projectBudget.fiscalYear },
    }));
  }

  private async loadActivations(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.projectActivationApproval.findMany({
      where: { decision: null },
      select: {
        id: true,
        projectId: true,
        requestedAt: true,
        requestedBy: { select: { id: true, displayName: true } },
        project: { select: { name: true } },
      },
      take: 100,
    });
    return rows.map((r) => itemFor({
      source: 'activation',
      id: r.id,
      title: `Activate project: ${r.project.name}`,
      submittedAt: r.requestedAt,
      submittedBy: r.requestedBy ?? null,
      href: `/projects/${r.projectId}?activation=${r.id}`,
      meta: { projectId: r.projectId },
    }));
  }

  private async loadLeaveRequests(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
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
      title: `Leave: ${r.type} ${isoDate(r.startDate)}…${isoDate(r.endDate)}`,
      submittedAt: r.createdAt,
      submittedBy: r.createdByPerson ?? null,
      href: `/leave-requests/${r.id}`,
      meta: { type: r.type },
    }));
  }

  private async loadCases(): Promise<ApprovalQueueItemDto[]> {
    const rows = await this.prisma.caseRecord.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
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
      title: `Case ${r.caseNumber}: ${r.summary ?? '(no summary)'}`,
      submittedAt: r.createdAt,
      submittedBy: r.ownerPerson ?? null,
      href: `/cases/${r.id}`,
      meta: { caseNumber: r.caseNumber },
    }));
  }
}

function itemFor(args: {
  source: ApprovalQueueSource;
  id: string;
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
