import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-org-unit.repository';
import { InMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person-org-membership.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';

import { DirectorDashboardResponseDto } from './contracts/director-dashboard.dto';

interface DirectorDashboardQuery {
  asOf?: string;
}

@Injectable()
export class DirectorDashboardQueryService {
  public constructor(
    private readonly personRepository: InMemoryPersonRepository,
    private readonly orgUnitRepository: InMemoryOrgUnitRepository,
    private readonly personOrgMembershipRepository: InMemoryPersonOrgMembershipRepository,
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  public async execute(query: DirectorDashboardQuery): Promise<DirectorDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Director dashboard asOf is invalid.');
    }

    const settings = await this.platformSettingsService.getAll();
    const nearingClosureDays = settings.dashboard.nearingClosureDaysThreshold;

    const [allPeople, allOrgUnits, allProjects, allAssignments, recentEvidence] = await Promise.all([
      this.personRepository.listAll(),
      this.orgUnitRepository.listAll(),
      this.projectRepository.findAll(),
      this.projectAssignmentRepository.findAll(),
      this.workEvidenceRepository.list({ dateTo: asOf }),
    ]);

    // Active people only (exclude terminated/inactive)
    const activePeople = allPeople.filter(
      (person) => person.status === 'ACTIVE' || (person.status as string) === 'LEAVE',
    );
    const activePersonIds = new Set(activePeople.map((person) => person.personId.value));

    // Active projects
    const activeProjects = allProjects.filter((project) => project.status === 'ACTIVE');
    const activeProjectIds = new Set(activeProjects.map((project) => project.projectId.value));

    // Active assignments covering active projects
    const activeAssignments = allAssignments.filter(
      (assignment) => activeProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );

    // Staffed / unstaffed people
    const staffedPersonIds = new Set(
      activeAssignments
        .filter((assignment) => activePersonIds.has(assignment.personId))
        .map((assignment) => assignment.personId),
    );
    const staffedPersonCount = staffedPersonIds.size;
    const unstaffedActivePersonCount = activePeople.filter(
      (person) => !staffedPersonIds.has(person.personId.value),
    ).length;

    // Evidence coverage rate: % of active assignments that have evidence in last N days
    const evidenceCutoff = new Date(asOf);
    evidenceCutoff.setUTCDate(evidenceCutoff.getUTCDate() - nearingClosureDays);
    const recentEvidenceSet = new Set(
      recentEvidence
        .filter((item) => (item.occurredOn ?? item.recordedAt) >= evidenceCutoff)
        .map((item) => `${item.personId}:${item.projectId}`),
    );
    const coveredAssignmentCount = activeAssignments.filter((assignment) =>
      recentEvidenceSet.has(`${assignment.personId}:${assignment.projectId}`),
    ).length;
    const evidenceCoverageRate =
      activeAssignments.length > 0
        ? Number(((coveredAssignmentCount / activeAssignments.length) * 100).toFixed(1))
        : 0;

    // Unit utilisation — one entry per active org unit with members
    const unitUtilisation = (
      await Promise.all(
        allOrgUnits.map(async (unit) => {
          const memberships = await this.personOrgMembershipRepository.findActiveByOrgUnit(
            OrgUnitId.from(unit.orgUnitId.value),
            asOf,
          );
          const memberCount = memberships.length;
          if (memberCount === 0) {
            return null;
          }

          const memberPersonIds = new Set(
            memberships.map((membership) => membership.personId.value),
          );
          const staffedInUnit = [...memberPersonIds].filter((personId) =>
            staffedPersonIds.has(personId),
          ).length;
          const utilisation = Number(((staffedInUnit / memberCount) * 100).toFixed(1));

          return {
            memberCount,
            orgUnitId: unit.orgUnitId.value,
            orgUnitName: unit.name,
            staffedCount: staffedInUnit,
            utilisation,
          };
        }),
      )
    )
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => left.utilisation - right.utilisation);

    // Weekly trend — last 8 weeks, each Sunday as week start
    const weeklyTrend = this.buildWeeklyTrend(asOf, allProjects, allAssignments, recentEvidence);

    return {
      asOf: asOf.toISOString(),
      dataSources: ['people', 'org_units', 'projects', 'assignments', 'work_evidence'],
      summary: {
        activeAssignmentCount: activeAssignments.length,
        activeProjectCount: activeProjects.length,
        evidenceCoverageRate,
        staffedPersonCount,
        unstaffedActivePersonCount,
      },
      unitUtilisation,
      weeklyTrend,
    };
  }

  private buildWeeklyTrend(
    asOf: Date,
    allProjects: Awaited<ReturnType<typeof this.projectRepository.findAll>>,
    allAssignments: Awaited<ReturnType<typeof this.projectAssignmentRepository.findAll>>,
    allEvidence: Awaited<ReturnType<typeof this.workEvidenceRepository.list>>,
  ): { weekStarting: string; activeProjectCount: number; staffedPersonCount: number; evidenceCoverageRate: number }[] {
    const weeks: { weekStarting: string; activeProjectCount: number; staffedPersonCount: number; evidenceCoverageRate: number }[] = [];

    // Calculate the Sunday that starts the current week
    const startOfCurrentWeek = new Date(asOf);
    startOfCurrentWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - startOfCurrentWeek.getUTCDay());
    startOfCurrentWeek.setUTCHours(0, 0, 0, 0);

    for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(startOfCurrentWeek);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekOffset * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const activeProj = allProjects.filter((project) => project.status === 'ACTIVE').length;

      const activeAssign = allAssignments.filter(
        (assignment) => assignment.isActiveAt(weekEnd),
      );

      const staffed = new Set(activeAssign.map((a) => a.personId)).size;

      const evidenceInWeek = new Set(
        allEvidence
          .filter((item) => {
            const d = item.occurredOn ?? item.recordedAt;
            return d >= weekStart && d < weekEnd;
          })
          .map((item) => `${item.personId}:${item.projectId}`),
      );

      const covered = activeAssign.filter((a) =>
        evidenceInWeek.has(`${a.personId}:${a.projectId}`),
      ).length;

      const rate = activeAssign.length > 0
        ? Number(((covered / activeAssign.length) * 100).toFixed(1))
        : 0;

      weeks.push({
        activeProjectCount: activeProj,
        evidenceCoverageRate: rate,
        staffedPersonCount: staffed,
        weekStarting: weekStart.toISOString().split('T')[0],
      });
    }

    return weeks;
  }
}
