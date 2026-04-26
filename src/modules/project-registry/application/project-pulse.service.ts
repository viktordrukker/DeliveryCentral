import { Injectable, NotFoundException } from '@nestjs/common';

import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PulseService } from '@src/modules/pulse/application/pulse.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PulseActivityItem, PulseSignalKpi, PulseSummaryDto } from './contracts/pulse-summary.dto';

const CACHE_TTL_MS = 60_000;
const ACTIVITY_WINDOW_DAYS = 7;
const VELOCITY_WINDOW_DAYS = 28;
const MOOD_WINDOW_DAYS = 28;

function msDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function summariseAuditEvent(eventName: string, aggregateType: string): string {
  const e = eventName.toLowerCase();
  const t = aggregateType.toLowerCase();
  if (e.includes('created')) return `${t} created`;
  if (e.includes('updated') || e.includes('changed')) return `${t} updated`;
  if (e.includes('approved')) return `${t} approved`;
  if (e.includes('rejected')) return `${t} rejected`;
  if (e.includes('closed')) return `${t} closed`;
  if (e.includes('activated')) return `${t} activated`;
  return `${t}: ${eventName}`;
}

@Injectable()
export class ProjectPulseService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly pulseService: PulseService,
  ) {}

  public async getPulseSummary(projectId: string): Promise<PulseSummaryDto> {
    const cacheKey = `project-pulse:${projectId}`;
    const cached = getCached<PulseSummaryDto>(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const [signals, activity] = await Promise.all([
      this.collectSignals(projectId),
      this.collectActivity(projectId),
    ]);

    const result: PulseSummaryDto = {
      projectId,
      asOf: new Date().toISOString(),
      signals,
      activity,
    };

    setCache(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  private async collectSignals(projectId: string): Promise<PulseSignalKpi[]> {
    const velocityFrom = msDaysAgo(VELOCITY_WINDOW_DAYS);
    const moodFrom = msDaysAgo(MOOD_WINDOW_DAYS);
    const now = new Date();

    const [velocity, cpi, openRisks, openCases, teamPeopleIds] = await Promise.all([
      this.computeVelocity(projectId, velocityFrom),
      this.computeCpi(projectId),
      this.countOpenRisks(projectId),
      this.countOpenCases(projectId),
      this.getActiveTeamPersonIds(projectId),
    ]);

    const avgMood =
      teamPeopleIds.length > 0
        ? await this.pulseService.avgMoodForPeople(teamPeopleIds, moodFrom, now)
        : null;

    return [
      {
        key: 'velocity',
        label: 'Hours (28d)',
        value: velocity,
        unit: 'h',
        explanation: `Approved timesheet hours in the last ${VELOCITY_WINDOW_DAYS} days.`,
      },
      {
        key: 'cpi',
        label: 'CPI',
        value: cpi,
        unit: null,
        explanation: 'Cost Performance Index: earned value ÷ actual cost.',
      },
      {
        key: 'avgMood',
        label: 'Team mood',
        value: avgMood,
        unit: '/5',
        explanation: `Average pulse mood across ${teamPeopleIds.length} active team members (last ${MOOD_WINDOW_DAYS} days).`,
      },
      {
        key: 'openRisks',
        label: 'Open risks',
        value: openRisks,
        unit: null,
        explanation: 'Risks not yet resolved or closed.',
      },
      {
        key: 'openCases',
        label: 'Open cases',
        value: openCases,
        unit: null,
        explanation: 'Cases linked to this project with status OPEN or IN_PROGRESS.',
      },
      {
        key: 'teamSize',
        label: 'Active team',
        value: teamPeopleIds.length,
        unit: null,
        explanation: 'People with an active assignment on this project.',
      },
    ];
  }

  private async computeVelocity(projectId: string, from: Date): Promise<number | null> {
    const rows = await this.prisma.timesheetEntry.findMany({
      where: { projectId, date: { gte: from } },
      select: { hours: true },
    });
    if (rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + Number(r.hours), 0);
  }

  private async computeCpi(projectId: string): Promise<number | null> {
    const budget = await this.prisma.projectBudget.findFirst({
      where: { projectId },
      orderBy: { fiscalYear: 'desc' },
      select: { earnedValue: true, actualCost: true },
    });
    if (!budget || budget.earnedValue === null || budget.actualCost === null) return null;
    const ac = Number(budget.actualCost);
    if (ac === 0) return null;
    return Number(budget.earnedValue) / ac;
  }

  private async countOpenRisks(projectId: string): Promise<number> {
    return this.prisma.projectRisk.count({
      where: {
        projectId,
        status: { in: ['IDENTIFIED', 'ASSESSED', 'MITIGATING'] },
      },
    });
  }

  private async countOpenCases(projectId: string): Promise<number> {
    return this.prisma.caseRecord.count({
      where: {
        relatedProjectId: projectId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });
  }

  private async getActiveTeamPersonIds(projectId: string): Promise<string[]> {
    const now = new Date();
    const rows = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { personId: true },
    });
    return Array.from(new Set(rows.map((r) => r.personId)));
  }

  private async collectActivity(projectId: string): Promise<PulseActivityItem[]> {
    const since = msDaysAgo(ACTIVITY_WINDOW_DAYS);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: since },
        aggregateType: {
          in: [
            'Project',
            'ProjectAssignment',
            'ProjectRisk',
            'ProjectChangeRequest',
            'ProjectMilestone',
            'ProjectRagSnapshot',
            'ProjectRadiatorOverride',
          ],
        },
        OR: [
          { aggregateId: projectId },
          { AND: [{ aggregateType: { not: 'Project' } }, { correlationId: projectId }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { actor: { select: { displayName: true } } },
    });

    return logs.map((l) => ({
      id: l.id,
      occurredAt: l.createdAt.toISOString(),
      eventName: l.eventName,
      aggregateType: l.aggregateType,
      aggregateId: l.aggregateId,
      actorDisplayName: l.actor?.displayName ?? null,
      summary: summariseAuditEvent(l.eventName, l.aggregateType),
    }));
  }
}
