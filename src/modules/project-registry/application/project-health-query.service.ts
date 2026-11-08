import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InMemoryProjectRepository } from '../infrastructure/repositories/in-memory/in-memory-project.repository';

export interface ProjectHealthDto {
  projectId: string;
  score: number;
  grade: 'green' | 'yellow' | 'red';
  staffingScore: number;
  timeScore: number;
  timelineScore: number;
}

@Injectable()
export class ProjectHealthQueryService {
  public constructor(
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(projectId: string): Promise<ProjectHealthDto | null> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return null;
    }

    const now = new Date();

    // LEAN: staffing score derived from ProjectPosition rows in active fill states.
    const approvedPositions = await this.prisma.projectPosition.findMany({
      where: {
        projectId,
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      },
      select: { activeAllocationPercent: true },
    });
    const assignmentCount = approvedPositions.length;
    let staffingScore = 0;
    if (assignmentCount > 0) {
      const avgAllocation =
        approvedPositions.reduce(
          (sum, p) => sum + Number(p.activeAllocationPercent ?? 0),
          0,
        ) / assignmentCount;
      staffingScore = avgAllocation >= 80 ? 33 : 33;
    }

    // Time score (33 pts max) based on approved timesheet activity in the last 30 days.
    const cutoff30d = new Date(now);
    cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
    const approvedEntryCount = await this.prisma.timesheetEntry.count({
      where: {
        date: { gte: cutoff30d, lte: now },
        projectId,
        timesheetWeek: { status: 'APPROVED' },
      },
    });
    const timeScore = approvedEntryCount > 0 ? 33 : assignmentCount > 0 ? 16 : 0;

    // Timeline score (34 pts max)
    let timelineScore: number;
    if (!project.endsOn) {
      timelineScore = 17;
    } else if (project.endsOn < now) {
      timelineScore = 0;
    } else {
      timelineScore = 34;
    }

    const score = staffingScore + timeScore + timelineScore;
    const grade: 'green' | 'yellow' | 'red' =
      score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';

    return {
      grade,
      projectId,
      score,
      staffingScore,
      timeScore,
      timelineScore,
    };
  }

  /**
   * Sprint F-0.8 (B-14 / D-88) — batch variant. The previous FE pattern was
   * `Promise.all(items.map(p => fetchProjectHealth(p.id)))` which fired
   * 30+ parallel HTTP requests on the /projects list page. This method
   * computes all requested project healths from at most 3 underlying queries.
   *
   * Returns a Map from projectId → health DTO (omits unknown projects rather
   * than throwing).
   */
  public async executeMany(
    projectIds: string[],
  ): Promise<Map<string, ProjectHealthDto>> {
    const result = new Map<string, ProjectHealthDto>();
    if (projectIds.length === 0) return result;

    // 1. Resolve known projects (one repo call; filters absent ids)
    const projects = await Promise.all(
      projectIds.map((id) => this.projectRepository.findById(id)),
    );
    const presentProjects = projects.filter((p): p is NonNullable<typeof p> => p !== null);
    if (presentProjects.length === 0) return result;
    const presentIds = new Set(presentProjects.map((p) => p.projectId.value));

    const now = new Date();

    // 2. LEAN: ALL approved-state positions for the requested projects in ONE call.
    const allPositions = await this.prisma.projectPosition.findMany({
      where: {
        projectId: { in: [...presentIds] },
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      },
      select: { projectId: true, activeAllocationPercent: true },
    });
    const approvedByProject = new Map<string, number>();
    const allocationSumByProject = new Map<string, number>();
    for (const p of allPositions) {
      approvedByProject.set(p.projectId, (approvedByProject.get(p.projectId) ?? 0) + 1);
      allocationSumByProject.set(
        p.projectId,
        (allocationSumByProject.get(p.projectId) ?? 0) + Number(p.activeAllocationPercent ?? 0),
      );
    }

    // 3. Approved-timesheet counts grouped by projectId in ONE call.
    const cutoff30d = new Date(now);
    cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
    const grouped = await this.prisma.timesheetEntry.groupBy({
      by: ['projectId'],
      where: {
        date: { gte: cutoff30d, lte: now },
        projectId: { in: [...presentIds] },
        timesheetWeek: { status: 'APPROVED' },
      },
      _count: { _all: true },
    });
    const approvedEntriesByProject = new Map<string, number>();
    for (const row of grouped) {
      if (row.projectId) {
        approvedEntriesByProject.set(row.projectId, row._count._all);
      }
    }

    for (const project of presentProjects) {
      const id = project.projectId.value;
      const assignmentCount = approvedByProject.get(id) ?? 0;
      const staffingScore = assignmentCount > 0 ? 33 : 0;
      const approvedEntryCount = approvedEntriesByProject.get(id) ?? 0;
      const timeScore =
        approvedEntryCount > 0 ? 33 : assignmentCount > 0 ? 16 : 0;
      let timelineScore: number;
      if (!project.endsOn) timelineScore = 17;
      else if (project.endsOn < now) timelineScore = 0;
      else timelineScore = 34;
      const score = staffingScore + timeScore + timelineScore;
      const grade: 'green' | 'yellow' | 'red' =
        score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
      result.set(id, { grade, projectId: id, score, staffingScore, timeScore, timelineScore });
    }
    return result;
  }
}
