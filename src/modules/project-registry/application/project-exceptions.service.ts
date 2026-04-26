import { Injectable } from '@nestjs/common';

import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ExceptionRow, ExceptionSeverity, ExceptionsDto } from './contracts/project-exception.dto';
import { cadenceDays, deriveRiskCadence } from './project-risk.service';

const CACHE_TTL_MS = 60_000;

interface OrgThresholds {
  crStaleThresholdDays: number;
  milestoneSlippedGraceDays: number;
  timesheetGapDays: number;
}

const DEFAULT_ORG_THRESHOLDS: OrgThresholds = {
  crStaleThresholdDays: 7,
  milestoneSlippedGraceDays: 0,
  timesheetGapDays: 14,
};

function msDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

@Injectable()
export class ProjectExceptionsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getExceptions(projectId: string): Promise<ExceptionsDto> {
    const cacheKey = `exceptions:${projectId}`;
    const cached = getCached<ExceptionsDto>(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, shape: true },
    });
    if (!project) {
      return { projectId, asOf: new Date().toISOString(), rows: [] };
    }

    const thresholds = await this.loadThresholds();
    const includeTimesheetGap = project.shape !== 'SMALL';
    const includeVacantRole = project.shape !== 'SMALL';

    const [riskRows, milestoneRows, crRows, tsRows, vacantRoleRows] = await Promise.all([
      this.findOverdueRisks(projectId),
      this.findSlippedMilestones(projectId, thresholds.milestoneSlippedGraceDays),
      this.findStaleCrs(projectId, thresholds.crStaleThresholdDays),
      includeTimesheetGap ? this.findTimesheetGaps(projectId, thresholds.timesheetGapDays) : [],
      includeVacantRole ? this.findVacantRoles(projectId) : [],
    ]);

    const rows = [...riskRows, ...milestoneRows, ...crRows, ...tsRows, ...vacantRoleRows];

    const result: ExceptionsDto = {
      projectId,
      asOf: new Date().toISOString(),
      rows,
    };
    setCache(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  private async loadThresholds(): Promise<OrgThresholds> {
    const cfg = await this.prisma.organizationConfig.findUnique({ where: { id: 'default' } });
    if (!cfg) return DEFAULT_ORG_THRESHOLDS;
    return {
      crStaleThresholdDays: cfg.crStaleThresholdDays ?? DEFAULT_ORG_THRESHOLDS.crStaleThresholdDays,
      milestoneSlippedGraceDays:
        cfg.milestoneSlippedGraceDays ?? DEFAULT_ORG_THRESHOLDS.milestoneSlippedGraceDays,
      timesheetGapDays: cfg.timesheetGapDays ?? DEFAULT_ORG_THRESHOLDS.timesheetGapDays,
    };
  }

  private async findOverdueRisks(projectId: string): Promise<ExceptionRow[]> {
    const now = Date.now();
    const risks = await this.prisma.projectRisk.findMany({
      where: {
        projectId,
        status: { in: ['IDENTIFIED', 'ASSESSED', 'MITIGATING'] },
      },
      select: {
        id: true,
        title: true,
        probability: true,
        impact: true,
        lastReviewedAt: true,
        reviewCadence: true,
        dueDate: true,
      },
    });

    const rows: ExceptionRow[] = [];
    for (const r of risks) {
      // Risk past due date
      if (r.dueDate && r.dueDate.getTime() < now) {
        const daysOver = Math.floor((now - r.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        rows.push({
          id: `risk-past-due:${r.id}`,
          trigger: 'risk-past-due',
          severity: daysOver > 14 ? 'critical' : 'red',
          subjectId: r.id,
          subjectLabel: r.title,
          diagnostic: `Target date passed ${daysOver} day${daysOver === 1 ? '' : 's'} ago.`,
          action: {
            label: 'Open risk',
            kind: 'link',
            href: `/projects/${projectId}?tab=risks`,
          },
        });
        continue;
      }

      // Overdue review
      const cadence = r.reviewCadence ?? deriveRiskCadence(r.impact, r.probability);
      const cadenceMs = cadenceDays(cadence) * 24 * 60 * 60 * 1000;
      const lastReview = r.lastReviewedAt?.getTime() ?? 0;
      if (lastReview === 0) continue;
      const overdue = now - lastReview - cadenceMs;
      if (overdue > 0) {
        const overdueDays = Math.floor(overdue / (1000 * 60 * 60 * 24));
        const severity: ExceptionSeverity =
          overdueDays > cadenceDays(cadence) ? 'red' : 'amber';
        rows.push({
          id: `risk-overdue:${r.id}`,
          trigger: 'risk-overdue-review',
          severity,
          subjectId: r.id,
          subjectLabel: r.title,
          diagnostic: `Not reviewed in ${overdueDays + cadenceDays(cadence)} days (cadence: ${cadence.toLowerCase()}).`,
          action: {
            label: 'Mark reviewed',
            kind: 'mark-reviewed',
            postPath: `/projects/${projectId}/risks/${r.id}/mark-reviewed`,
          },
        });
      }
    }
    return rows;
  }

  private async findSlippedMilestones(projectId: string, graceDays: number): Promise<ExceptionRow[]> {
    const cutoff = msDaysAgo(graceDays);
    const milestones = await this.prisma.projectMilestone.findMany({
      where: {
        projectId,
        plannedDate: { lt: cutoff },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      select: { id: true, name: true, plannedDate: true },
    });
    const now = Date.now();
    return milestones.map((m) => {
      const daysOver = Math.floor((now - m.plannedDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: `milestone-slipped:${m.id}`,
        trigger: 'milestone-slipped',
        severity: daysOver > 14 ? 'critical' : daysOver > 7 ? 'red' : 'amber',
        subjectId: m.id,
        subjectLabel: m.name,
        diagnostic: `Planned ${daysOver} day${daysOver === 1 ? '' : 's'} ago; still ${m.name ? 'open' : ''}.`,
        action: {
          label: 'Reschedule',
          kind: 'link',
          href: `/projects/${projectId}?tab=milestones`,
        },
      };
    });
  }

  private async findStaleCrs(projectId: string, staleDays: number): Promise<ExceptionRow[]> {
    const cutoff = msDaysAgo(staleDays);
    const crs = await this.prisma.projectChangeRequest.findMany({
      where: {
        projectId,
        status: 'PROPOSED',
        createdAt: { lt: cutoff },
      },
      select: { id: true, title: true, createdAt: true, severity: true },
    });
    return crs.map((c) => {
      const ageDays = Math.floor((Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: `cr-stale:${c.id}`,
        trigger: 'cr-stale',
        severity: c.severity === 'CRITICAL' ? 'critical' : c.severity === 'HIGH' ? 'red' : 'amber',
        subjectId: c.id,
        subjectLabel: c.title,
        diagnostic: `Awaiting decision for ${ageDays} days.`,
        action: {
          label: 'Review CRs',
          kind: 'link',
          href: `/projects/${projectId}?tab=change-requests&filter=proposed`,
        },
      };
    });
  }

  private async findTimesheetGaps(projectId: string, gapDays: number): Promise<ExceptionRow[]> {
    const cutoff = msDaysAgo(gapDays);
    const now = new Date();

    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { personId: true, person: { select: { displayName: true } } },
    });
    if (assignments.length === 0) return [];
    const uniquePeople = new Map<string, string>();
    for (const a of assignments) {
      uniquePeople.set(a.personId, a.person?.displayName ?? a.personId);
    }

    const recent = await this.prisma.timesheetEntry.findMany({
      where: {
        projectId,
        date: { gte: cutoff },
        timesheetWeek: { personId: { in: [...uniquePeople.keys()] } },
      },
      select: { timesheetWeek: { select: { personId: true } } },
    });
    const activePeople = new Set(recent.map((r) => r.timesheetWeek.personId));

    const gaps: ExceptionRow[] = [];
    for (const [personId, name] of uniquePeople.entries()) {
      if (!activePeople.has(personId)) {
        gaps.push({
          id: `ts-gap:${personId}`,
          trigger: 'timesheet-gap',
          severity: 'amber',
          subjectId: personId,
          subjectLabel: name,
          diagnostic: `No approved hours in the last ${gapDays} days.`,
          action: {
            label: 'View timesheets',
            kind: 'link',
            href: `/dashboards/planned-vs-actual?projectId=${projectId}`,
          },
        });
      }
    }
    return gaps;
  }

  private async findVacantRoles(projectId: string): Promise<ExceptionRow[]> {
    const now = new Date();
    const rolePlans = await this.prisma.projectRolePlan.findMany({
      where: { projectId },
      select: { id: true, roleName: true, seniorityLevel: true, headcount: true, plannedEndDate: true },
    });
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { staffingRole: true },
    });
    const filledBy = new Map<string, number>();
    for (const a of assignments) {
      const key = (a.staffingRole ?? '').toLowerCase();
      filledBy.set(key, (filledBy.get(key) ?? 0) + 1);
    }

    const rows: ExceptionRow[] = [];
    for (const rp of rolePlans) {
      if (rp.plannedEndDate && rp.plannedEndDate < now) continue;
      const filled = filledBy.get(rp.roleName.toLowerCase()) ?? 0;
      const gap = rp.headcount - filled;
      if (gap > 0) {
        rows.push({
          id: `vacant-role:${rp.id}`,
          trigger: 'vacant-role',
          severity: gap >= rp.headcount ? 'red' : 'amber',
          subjectId: rp.id,
          subjectLabel: `${rp.roleName}${rp.seniorityLevel ? ` · ${rp.seniorityLevel}` : ''}`,
          diagnostic: `${gap} of ${rp.headcount} seat${rp.headcount === 1 ? '' : 's'} vacant.`,
          action: {
            label: 'Open staffing request',
            kind: 'link',
            href: `/staffing-requests/new?projectId=${projectId}`,
          },
        });
      }
    }
    return rows;
  }

  public invalidate(projectId: string): void {
    setCache(`exceptions:${projectId}`, null as unknown as ExceptionsDto, 0);
  }
}
