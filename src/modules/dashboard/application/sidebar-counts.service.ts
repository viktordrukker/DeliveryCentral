import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { SidebarCountsDto } from './contracts/sidebar-counts.dto';

const HR_ROLES = new Set(['hr_manager', 'director', 'admin']);
const RM_ROLES = new Set(['resource_manager', 'director', 'admin']);

/**
 * FE-#309 — sidebar count badges aggregator.
 *
 * 4 parallel Prisma count() calls. Each is independently scoped by the
 * caller's role; roles outside a scope (e.g. an employee asking for
 * bench count) get a zero rather than a 403 — the FE renders the badge
 * conditionally based on which sidebar items are visible.
 *
 * No caching layer here yet; if p95 trends above 200ms add a per-user
 * 30s memo in front of this service. Today the 4 counts are simple
 * indexed counts and should be well under that.
 */
@Injectable()
export class SidebarCountsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getCounts(callerRoles: readonly string[]): Promise<SidebarCountsDto> {
    const canSeeBench = callerRoles.some((r) => RM_ROLES.has(r));
    const canSeeHr = callerRoles.some((r) => HR_ROLES.has(r));

    const [projects, approvals, bench, hrQueue] = await Promise.all([
      this.countProjects(),
      this.countApprovals(),
      canSeeBench ? this.countBench() : Promise.resolve(0),
      canSeeHr ? this.countHrQueue() : Promise.resolve(0),
    ]);

    return { projects, approvals, bench, hrQueue };
  }

  private async countProjects(): Promise<number> {
    // Projects the caller can see — for v1, all non-archived projects in tenant.
    // Tenancy enforced upstream by PrismaService middleware.
    return this.prisma.project.count({
      where: { status: { in: ['ACTIVE', 'DRAFT', 'PENDING_APPROVAL', 'ON_HOLD'] } },
    });
  }

  private async countApprovals(): Promise<number> {
    // Sum the 5 unified-approvals sources matching the aggregator (issue 264).
    const [positions, budgets, activations, leaves, cases] = await Promise.all([
      this.prisma.projectPosition.count({ where: { fillStatus: 'PROPOSED' } }),
      this.prisma.budgetApproval.count({ where: { status: 'PENDING' } }),
      this.prisma.projectActivationApproval.count({ where: { decision: null } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.caseRecord.count({ where: { status: 'OPEN' } }),
    ]);
    return positions + budgets + activations + leaves + cases;
  }

  private async countBench(): Promise<number> {
    // Bench = active employees with NO active fill on today.
    // For the badge, we only need a count, not the enriched rows; an
    // anti-join via groupBy + filter is the cheapest path that matches
    // the enriched-bench definition.
    const today = new Date();
    const activePeople = await this.prisma.person.count({
      where: {
        deletedAt: null,
        archivedAt: null,
        terminatedAt: null,
        employmentStatus: 'ACTIVE',
      },
    });
    const filledDistinct = await this.prisma.projectPosition.groupBy({
      by: ['activePersonId'],
      where: {
        activePersonId: { not: null },
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: today },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: today } }],
      },
    });
    return Math.max(0, activePeople - filledDistinct.length);
  }

  private async countHrQueue(): Promise<number> {
    // Open HR cases (subset of the unified `case` source, but scoped to
    // HR-owned). Plus the HR action-cards bucket — for the badge we count
    // every probation/contract/cert/review row that would surface.
    // For perf, today we use a single CaseRecord count + a quick column-
    // existence count on Person fields. Both are tenant-scoped upstream.
    const today = new Date();
    const next30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);

    const [cases, probation, contract, review, cert] = await Promise.all([
      this.prisma.caseRecord.count({ where: { status: 'OPEN' } }),
      this.prisma.person.count({
        where: {
          deletedAt: null,
          archivedAt: null,
          terminatedAt: null,
          probationEndsAt: { gte: today, lte: next30 },
        },
      }),
      this.prisma.person.count({
        where: {
          deletedAt: null,
          archivedAt: null,
          terminatedAt: null,
          contractEndsAt: { gte: today, lte: next60 },
        },
      }),
      this.prisma.person.count({
        where: {
          deletedAt: null,
          archivedAt: null,
          terminatedAt: null,
          OR: [{ lastHrReviewAt: null }, { lastHrReviewAt: { lte: twelveMonthsAgo } }],
        },
      }),
      this.prisma.personSkill.count({
        where: {
          certified: true,
          certificationExpiresAt: { lte: today },
          person: { deletedAt: null, archivedAt: null, terminatedAt: null },
        },
      }),
    ]);
    return cases + probation + contract + review + cert;
  }
}
