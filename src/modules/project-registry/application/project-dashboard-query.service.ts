import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import { PROJECT_POSITION_REPOSITORY } from '@src/modules/project-positions/application/tokens';

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

const ACTIVE_FILL_STATUSES = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] as const;
type ActiveFillStatus = typeof ACTIVE_FILL_STATUSES[number];

function isActiveFillStatus(value: string): value is ActiveFillStatus {
  return (ACTIVE_FILL_STATUSES as readonly string[]).includes(value);
}

@Injectable()
export class ProjectDashboardQueryService {
  public constructor(
    private readonly projectRepository: InMemoryProjectRepository,
    @Inject(PROJECT_POSITION_REPOSITORY)
    private readonly projectPositionRepository: ProjectPositionRepositoryPort,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: ProjectDashboardQuery): Promise<ProjectDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Project dashboard asOf is invalid.');
    }

    const project = (await this.projectRepository.findAll()).find(
      (item) => item.projectId.value === query.projectId,
    );

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const dbPeople = await this.prisma.person.findMany({ select: { id: true, displayName: true } });
    const allPeopleById = new Map(dbPeople.map((p) => [p.id, p]));

    // SoT PR 16a/1 — sourced from canonical ProjectPosition rows. Positions
    // with `activePersonId === null` represent unfilled demand and are
    // omitted from the assignments list (the legacy DTO had no concept of
    // "unfilled assignment" so this matches existing FE expectations).
    const projectPositions = await this.projectPositionRepository.findByQuery({
      projectId: query.projectId,
    });
    const positionsWithFill = projectPositions.filter(
      (position) => position.activePersonId !== undefined,
    );

    const activePositions = positionsWithFill.filter((position) => {
      if (!isActiveFillStatus(position.fillStatus.value)) return false;
      const validFrom = position.activeValidFrom;
      const validTo = position.activeValidTo;
      if (validFrom && validFrom > asOf) return false;
      if (validTo && validTo < asOf) return false;
      return true;
    });

    const allEvidence = await this.workEvidenceRepository.list({ projectId: query.projectId, dateTo: asOf });

    // Evidence by week — past 12 weeks from asOf
    const evidenceByWeek = this.buildEvidenceByWeek(allEvidence, asOf, 12);

    // Total evidence hours in last 30 days
    const cutoff30d = new Date(asOf);
    cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
    const totalEvidenceHoursLast30d = allEvidence
      .filter((item) => (item.occurredOn ?? item.recordedAt) >= cutoff30d)
      .reduce((sum, item) => sum + (item.durationMinutes ?? 0) / 60, 0);

    // Allocation by person (from active positions)
    const allocationByPersonMap = new Map<string, { displayName: string; allocationPercent: number }>();
    for (const position of activePositions) {
      const personId = position.activePersonId!;
      const existing = allocationByPersonMap.get(personId);
      const person = allPeopleById.get(personId);
      const percent = position.activeAllocationPercent ?? 0;
      if (existing) {
        existing.allocationPercent += percent;
      } else {
        allocationByPersonMap.set(personId, {
          allocationPercent: percent,
          displayName: person?.displayName ?? personId,
        });
      }
    }

    const allocationByPerson = Array.from(allocationByPersonMap.entries()).map(
      ([personId, data]) => ({ allocationPercent: data.allocationPercent, displayName: data.displayName, personId }),
    );

    return {
      allocationByPerson,
      asOf: asOf.toISOString(),
      assignments: positionsWithFill.map((position) => {
        const personId = position.activePersonId!;
        const person = allPeopleById.get(personId);
        return {
          allocationPercent: position.activeAllocationPercent ?? 0,
          id: position.positionId.value,
          personDisplayName: person?.displayName ?? personId,
          personId,
          staffingRole: position.role,
          status: position.fillStatus.value,
          validFrom: (position.activeValidFrom ?? position.startDate).toISOString(),
          validTo: position.activeValidTo?.toISOString() ?? null,
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
        activeAssignmentCount: activePositions.length,
        totalAssignments: positionsWithFill.length,
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
