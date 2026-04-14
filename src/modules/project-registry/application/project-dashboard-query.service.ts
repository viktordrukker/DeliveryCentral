import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InMemoryProjectRepository } from '../infrastructure/repositories/in-memory/in-memory-project.repository';

interface ProjectDashboardQuery {
  asOf?: string;
  projectId: string;
}

export interface ProjectDashboardResponseDto {
  project: {
    id: string;
    projectCode: string;
    name: string;
    description: string | null;
    status: string;
    startsOn: string | null;
    endsOn: string | null;
    projectManagerId: string | null;
  };
  assignments: Array<{
    id: string;
    personId: string;
    personDisplayName: string;
    staffingRole: string;
    allocationPercent: number;
    status: string;
    validFrom: string;
    validTo: string | null;
  }>;
  evidenceByWeek: Array<{
    weekStarting: string;
    totalHours: number;
  }>;
  allocationByPerson: Array<{
    personId: string;
    displayName: string;
    allocationPercent: number;
  }>;
  staffingSummary: {
    totalAssignments: number;
    activeAssignmentCount: number;
    totalEvidenceHoursLast30d: number;
  };
  asOf: string;
}

@Injectable()
export class ProjectDashboardQueryService {
  public constructor(
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: ProjectDashboardQuery): Promise<ProjectDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Project dashboard asOf is invalid.');
    }

    const project = (await this.projectRepository.findAll()).find(
      (item) => item.projectId.value === query.projectId,
    );

    if (!project) {
      throw new Error('Project not found.');
    }

    const dbPeople = await this.prisma.person.findMany({ select: { id: true, displayName: true } });
    const allPeopleById = new Map(dbPeople.map((p) => [p.id, p]));

    const allAssignments = await this.projectAssignmentRepository.findAll();
    const projectAssignments = allAssignments.filter(
      (assignment) => assignment.projectId === query.projectId,
    );

    const activeAssignments = projectAssignments.filter(
      (assignment) => assignment.isActiveAt(asOf),
    );

    const allEvidence = await this.workEvidenceRepository.list({ projectId: query.projectId, dateTo: asOf });

    // Evidence by week — past 12 weeks from asOf
    const evidenceByWeek = this.buildEvidenceByWeek(allEvidence, asOf, 12);

    // Total evidence hours in last 30 days
    const cutoff30d = new Date(asOf);
    cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
    const totalEvidenceHoursLast30d = allEvidence
      .filter((item) => (item.occurredOn ?? item.recordedAt) >= cutoff30d)
      .reduce((sum, item) => sum + (item.durationMinutes ?? 0) / 60, 0);

    // Allocation by person (from active assignments)
    const allocationByPersonMap = new Map<string, { displayName: string; allocationPercent: number }>();
    for (const assignment of activeAssignments) {
      const existing = allocationByPersonMap.get(assignment.personId);
      const person = allPeopleById.get(assignment.personId);
      const percent = assignment.allocationPercent?.value ?? 0;
      if (existing) {
        existing.allocationPercent += percent;
      } else {
        allocationByPersonMap.set(assignment.personId, {
          allocationPercent: percent,
          displayName: person?.displayName ?? assignment.personId,
        });
      }
    }

    const allocationByPerson = Array.from(allocationByPersonMap.entries()).map(
      ([personId, data]) => ({ allocationPercent: data.allocationPercent, displayName: data.displayName, personId }),
    );

    return {
      allocationByPerson,
      asOf: asOf.toISOString(),
      assignments: projectAssignments.map((assignment) => {
        const person = allPeopleById.get(assignment.personId);
        return {
          allocationPercent: assignment.allocationPercent?.value ?? 0,
          id: assignment.assignmentId.value,
          personDisplayName: person?.displayName ?? assignment.personId,
          personId: assignment.personId,
          staffingRole: assignment.staffingRole,
          status: assignment.status.value,
          validFrom: assignment.validFrom.toISOString(),
          validTo: assignment.validTo?.toISOString() ?? null,
        };
      }),
      evidenceByWeek,
      project: {
        description: project.description ?? null,
        endsOn: project.endsOn?.toISOString() ?? null,
        id: project.projectId.value,
        name: project.name,
        projectCode: project.projectCode,
        projectManagerId: project.projectManagerId?.value ?? null,
        startsOn: project.startsOn?.toISOString() ?? null,
        status: project.status,
      },
      staffingSummary: {
        activeAssignmentCount: activeAssignments.length,
        totalAssignments: projectAssignments.length,
        totalEvidenceHoursLast30d: Number(totalEvidenceHoursLast30d.toFixed(2)),
      },
    };
  }

  private buildEvidenceByWeek(
    evidence: Awaited<ReturnType<InMemoryWorkEvidenceRepository['list']>>,
    asOf: Date,
    weeksBack: number,
  ): Array<{ weekStarting: string; totalHours: number }> {
    // Find the Monday of the current week
    const asOfDay = asOf.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
    const daysToMonday = asOfDay === 0 ? 6 : asOfDay - 1;
    const currentMonday = new Date(asOf);
    currentMonday.setUTCDate(asOf.getUTCDate() - daysToMonday);
    currentMonday.setUTCHours(0, 0, 0, 0);

    const weeks: Array<{ weekStarting: string; totalHours: number }> = [];

    for (let w = weeksBack - 1; w >= 0; w--) {
      const weekStart = new Date(currentMonday);
      weekStart.setUTCDate(currentMonday.getUTCDate() - w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

      const weekEvidence = evidence.filter((item) => {
        const date = item.occurredOn ?? item.recordedAt;
        return date >= weekStart && date < weekEnd;
      });

      const totalHours = weekEvidence.reduce(
        (sum, item) => sum + (item.durationMinutes ?? 0) / 60,
        0,
      );

      weeks.push({
        totalHours: Number(totalHours.toFixed(2)),
        weekStarting: weekStart.toISOString(),
      });
    }

    return weeks;
  }
}
