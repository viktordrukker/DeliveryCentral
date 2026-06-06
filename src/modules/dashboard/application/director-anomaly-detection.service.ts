import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  DirectorAnomalyDto,
  DirectorAnomalyKind,
  DirectorAnomalySeverity,
} from './contracts/director-anomaly.dto';

/**
 * Internal carrier type — extends the wire DTO with a transient `_projectId`
 * field used by {@link DirectorAnomalyDetectionService.hydrateTargetPositions}
 * to look up `ProjectPosition` rows without re-parsing the `href`. The
 * underscore prefix marks it as non-wire; it is never serialized because
 * Nest's class-transformer ignores non-decorated extras on plain objects.
 */
interface DirectorAnomalyAccumulator extends DirectorAnomalyDto {
  _projectId?: string;
}

/** Kinds whose anomaly is rooted in a single Project. */
const POSITION_BEARING_KINDS: ReadonlySet<DirectorAnomalyKind> = new Set<DirectorAnomalyKind>([
  'project_rag_dropped',
  'budget_overrun',
  'milestone_slip',
]);

/**
 * Position statuses that count as "needs attention" for drilldown — the
 * RELEASED / DRAFT terminals are excluded; everything in flight is included.
 */
const POSITION_ACTIVE_STATUSES = [
  'OPEN',
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
] as const;

/**
 * FE-#265 — Director Dashboard "What needs you now" anomaly detection.
 *
 * Composes 5 cheap parallel detections, scores each into a severity, and
 * returns the top N sorted by `severity DESC, decayRate DESC` (recency-
 * weighted so old anomalies fade).
 *
 * Detection rules (v1):
 *   - project_rag_dropped  — latest ProjectRagSnapshot.overallRag is RED or
 *                            AMBER and the prior week's was GREEN or BLUE.
 *   - utilization_spike    — DEFERRED v1: needs cross-aggregation that the
 *                            utilization service already computes; will surface
 *                            when that data lands in a stable read shape.
 *   - pending_approval_age — any BudgetApproval / ProjectActivationApproval
 *                            in PENDING > 7 days.
 *   - budget_overrun       — ProjectBudget.actualCost > BAC × 1.05 on an
 *                            ACTIVE project.
 *   - milestone_slip       — ProjectMilestone past plannedDate with status
 *                            still PLANNED/IN_PROGRESS.
 */
@Injectable()
export class DirectorAnomalyDetectionService {
  public constructor(private readonly prisma: PrismaService) {}

  public async detect(args?: { limit?: number }): Promise<DirectorAnomalyDto[]> {
    const limit = Math.min(50, Math.max(1, args?.limit ?? 5));

    const [ragDrops, oldApprovals, overruns, slips] = await Promise.all([
      this.detectRagDrops(),
      this.detectOldApprovals(),
      this.detectBudgetOverruns(),
      this.detectMilestoneSlips(),
    ]);

    const all = [...ragDrops, ...oldApprovals, ...overruns, ...slips];
    all.sort((a, b) => {
      const sa = severityRank(a.severity);
      const sb = severityRank(b.severity);
      if (sa !== sb) return sb - sa;
      return b.decayRate - a.decayRate;
    });

    // LEAN-P4-missing-6 — hydrate `targetPositions` for kinds that touch
    // positions. Kept off the per-detector hot path: one Prisma call for the
    // union of affected projects, then mapped per anomaly. Unrelated kinds
    // (pending_approval_age) get an empty array per the DTO contract.
    const top = all.slice(0, limit);
    await this.hydrateTargetPositions(top);
    // Strip the transient `_projectId` carrier so it never leaks onto the wire.
    return top.map(({ _projectId, ...wire }) => {
      void _projectId;
      return wire;
    });
  }

  private async hydrateTargetPositions(anomalies: DirectorAnomalyAccumulator[]): Promise<void> {
    const projectIds = new Set<string>();
    for (const a of anomalies) {
      if (POSITION_BEARING_KINDS.has(a.kind) && a._projectId) {
        projectIds.add(a._projectId);
      }
    }
    if (projectIds.size === 0) return;

    const positions = await this.prisma.projectPosition.findMany({
      where: {
        projectId: { in: [...projectIds] },
        fillStatus: { in: [...POSITION_ACTIVE_STATUSES] },
      },
      select: { id: true, projectId: true },
      take: 500,
    });
    const byProject = new Map<string, string[]>();
    for (const p of positions) {
      let arr = byProject.get(p.projectId);
      if (!arr) {
        arr = [];
        byProject.set(p.projectId, arr);
      }
      arr.push(p.id);
    }
    for (const a of anomalies) {
      if (!POSITION_BEARING_KINDS.has(a.kind) || !a._projectId) continue;
      const ids = byProject.get(a._projectId) ?? [];
      a.targetPositions = ids;
      if (ids.length > 0) {
        a.href = `/staffing-desk?view=table&projectId=${encodeURIComponent(a._projectId)}&positionIds=${ids.join(',')}`;
      }
    }
  }

  private async detectRagDrops(): Promise<DirectorAnomalyAccumulator[]> {
    // Look at every project's two most-recent ProjectRagSnapshot rows and flag
    // a drop from GREEN/BLUE → AMBER/RED in the latest snapshot.
    const projects = await this.prisma.project.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      take: 200,
    });

    const out: DirectorAnomalyAccumulator[] = [];
    for (const p of projects) {
      const snaps = await this.prisma.projectRagSnapshot.findMany({
        where: { projectId: p.id },
        orderBy: { weekStarting: 'desc' },
        select: { weekStarting: true, overallRag: true },
        take: 2,
      });
      if (snaps.length < 2) continue;
      const latest = snaps[0]!;
      const prior = snaps[1]!;
      const dropped =
        isHealthy(prior.overallRag) && !isHealthy(latest.overallRag);
      if (!dropped) continue;
      const severity: DirectorAnomalySeverity =
        latest.overallRag === 'RED' ? 'critical' : 'warning';
      out.push({
        kind: 'project_rag_dropped',
        severity,
        title: `${p.name} RAG dropped to ${latest.overallRag}`,
        detail: `${prior.overallRag} → ${latest.overallRag} (week of ${latest.weekStarting.toISOString().slice(0, 10)})`,
        href: `/projects/${p.id}?tab=pulse`,
        decayRate: decayRateFor(latest.weekStarting, 14),
        detectedAt: latest.weekStarting.toISOString(),
        targetPositions: [],
        _projectId: p.id,
      });
    }
    return out;
  }

  private async detectOldApprovals(): Promise<DirectorAnomalyAccumulator[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [budgetPending, activationPending] = await Promise.all([
      this.prisma.budgetApproval.findMany({
        where: { status: 'PENDING', requestedAt: { lte: sevenDaysAgo } },
        select: {
          id: true,
          requestedAt: true,
          projectBudget: { select: { projectId: true, fiscalYear: true } },
        },
        take: 20,
      }),
      this.prisma.projectActivationApproval.findMany({
        where: { decision: null, requestedAt: { lte: sevenDaysAgo } },
        select: {
          id: true,
          requestedAt: true,
          projectId: true,
        },
        take: 20,
      }),
    ]);

    const out: DirectorAnomalyAccumulator[] = [];
    for (const b of budgetPending) {
      const ageDays = daysSince(b.requestedAt);
      out.push({
        kind: 'pending_approval_age',
        severity: severityForAge(ageDays, { critical: 21, danger: 14, warning: 7 }),
        title: `Budget approval pending ${ageDays}d`,
        detail: `FY${b.projectBudget.fiscalYear} budget for project ${b.projectBudget.projectId}`,
        href: `/projects/${b.projectBudget.projectId}?tab=money&approval=${b.id}`,
        decayRate: decayRateFor(b.requestedAt, 30),
        detectedAt: b.requestedAt.toISOString(),
        targetPositions: [],
      });
    }
    for (const a of activationPending) {
      const ageDays = daysSince(a.requestedAt);
      out.push({
        kind: 'pending_approval_age',
        severity: severityForAge(ageDays, { critical: 21, danger: 14, warning: 7 }),
        title: `Project activation pending ${ageDays}d`,
        detail: `Project ${a.projectId} awaiting activation decision`,
        href: `/projects/${a.projectId}?activation=${a.id}`,
        decayRate: decayRateFor(a.requestedAt, 30),
        detectedAt: a.requestedAt.toISOString(),
        targetPositions: [],
      });
    }
    return out;
  }

  private async detectBudgetOverruns(): Promise<DirectorAnomalyAccumulator[]> {
    const budgets = await this.prisma.projectBudget.findMany({
      where: { actualCost: { not: null } },
      select: {
        id: true,
        projectId: true,
        fiscalYear: true,
        capexBudget: true,
        opexBudget: true,
        actualCost: true,
        updatedAt: true,
      },
      take: 200,
    });
    if (budgets.length === 0) return [];

    // Filter to ACTIVE projects + hydrate names in one follow-up.
    const projectIds = [...new Set(budgets.map((b) => b.projectId))];
    const activeProjects = await this.prisma.project.findMany({
      where: { id: { in: projectIds }, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    const activeIndex = new Map(activeProjects.map((p) => [p.id, p.name]));

    const out: DirectorAnomalyAccumulator[] = [];
    for (const b of budgets) {
      const name = activeIndex.get(b.projectId);
      if (!name) continue; // not ACTIVE
      const bac = Number(b.capexBudget) + Number(b.opexBudget);
      if (bac <= 0) continue;
      const ac = b.actualCost === null ? 0 : Number(b.actualCost);
      const overrun = (ac - bac) / bac;
      if (overrun < 0.05) continue;
      const severity: DirectorAnomalySeverity =
        overrun >= 0.25 ? 'critical' : overrun >= 0.15 ? 'danger' : 'warning';
      out.push({
        kind: 'budget_overrun',
        severity,
        title: `${name} ${Math.round(overrun * 100)}% over budget`,
        detail: `Actual ${ac.toFixed(0)} vs planned ${bac.toFixed(0)} (FY${b.fiscalYear})`,
        href: `/projects/${b.projectId}?tab=money`,
        decayRate: decayRateFor(b.updatedAt, 14),
        detectedAt: b.updatedAt.toISOString(),
        targetPositions: [],
        _projectId: b.projectId,
      });
    }
    return out;
  }

  private async detectMilestoneSlips(): Promise<DirectorAnomalyAccumulator[]> {
    const today = stripTime(new Date());
    const slips = await this.prisma.projectMilestone.findMany({
      where: {
        plannedDate: { lt: today },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        name: true,
        plannedDate: true,
        projectId: true,
        progressPct: true,
        project: { select: { name: true } },
      },
      take: 50,
    });
    return slips.map((m) => {
      const daysLate = daysSince(m.plannedDate);
      const severity: DirectorAnomalySeverity =
        daysLate >= 30 ? 'critical' : daysLate >= 14 ? 'danger' : 'warning';
      const row: DirectorAnomalyAccumulator = {
        kind: 'milestone_slip' as DirectorAnomalyKind,
        severity,
        title: `${m.project.name}: '${m.name}' ${daysLate}d late`,
        detail: `${m.progressPct}% complete; planned ${m.plannedDate.toISOString().slice(0, 10)}`,
        href: `/projects/${m.projectId}?tab=plan&milestone=${m.id}`,
        decayRate: decayRateFor(m.plannedDate, 60),
        detectedAt: m.plannedDate.toISOString(),
        targetPositions: [],
        _projectId: m.projectId,
      };
      return row;
    });
  }
}

function severityRank(s: DirectorAnomalySeverity): number {
  return s === 'critical' ? 4 : s === 'danger' ? 3 : s === 'warning' ? 2 : 1;
}

function isHealthy(rag: string): boolean {
  return rag === 'GREEN' || rag === 'BLUE';
}

function severityForAge(
  daysOver: number,
  th: { critical: number; danger: number; warning: number },
): DirectorAnomalySeverity {
  if (daysOver >= th.critical) return 'critical';
  if (daysOver >= th.danger) return 'danger';
  if (daysOver >= th.warning) return 'warning';
  return 'info';
}

function daysSince(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)));
}

function decayRateFor(d: Date, halfLifeDays: number): number {
  // 1.0 at detection time, halves every `halfLifeDays`. Capped at 0..1.
  const ageDays = daysSince(d);
  return Math.max(0, Math.min(1, Math.pow(0.5, ageDays / halfLifeDays)));
}

function stripTime(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
