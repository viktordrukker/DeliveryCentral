import { BadRequestException, Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-org-unit.repository';
import { InMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person-org-membership.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';

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
  ) {}

  public async execute(query: DirectorDashboardQuery): Promise<DirectorDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Director dashboard asOf is invalid.');
    }

    const [allPeople, allOrgUnits, allProjects, allAssignments] = await Promise.all([
      this.personRepository.listAll(),
      this.orgUnitRepository.listAll(),
      this.projectRepository.findAll(),
      this.projectAssignmentRepository.findAll(),
    ]);

    const activePeople = allPeople.filter(
      (person) => person.status === 'ACTIVE' || (person.status as string) === 'LEAVE',
    );
    const activePersonIds = new Set(activePeople.map((person) => person.personId.value));
    const activeProjects = allProjects.filter((project) => project.status === 'ACTIVE');
    const activeProjectIds = new Set(activeProjects.map((project) => project.projectId.value));
    const activeAssignments = allAssignments.filter(
      (assignment) => activeProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );

    const staffedPersonIds = new Set(
      activeAssignments
        .filter((assignment) => activePersonIds.has(assignment.personId))
        .map((assignment) => assignment.personId),
    );
    const staffedPersonCount = staffedPersonIds.size;
    const unstaffedActivePersonCount = activePeople.filter(
      (person) => !staffedPersonIds.has(person.personId.value),
    ).length;
    const staffingUtilisationRate =
      activePeople.length > 0
        ? Number(((staffedPersonCount / activePeople.length) * 100).toFixed(1))
        : 0;

    const allMemberships = await this.personOrgMembershipRepository.findActiveByOrgUnit(
      undefined as unknown as OrgUnitId,
      asOf,
    ).catch(() => [] as Awaited<ReturnType<typeof this.personOrgMembershipRepository.findActiveByOrgUnit>>);

    let membershipsByUnit: Map<string, string[]>;
    if (allMemberships.length === 0 && allOrgUnits.length > 0) {
      membershipsByUnit = new Map();
      const batchResults = await Promise.all(
        allOrgUnits.map(async (unit) => {
          const memberships = await this.personOrgMembershipRepository.findActiveByOrgUnit(
            OrgUnitId.from(unit.orgUnitId.value),
            asOf,
          );
          return { orgUnitId: unit.orgUnitId.value, personIds: memberships.map((m) => m.personId.value) };
        }),
      );
      for (const { orgUnitId, personIds } of batchResults) {
        membershipsByUnit.set(orgUnitId, personIds);
      }
    } else {
      membershipsByUnit = new Map();
      for (const membership of allMemberships) {
        const unitId = (membership as { orgUnitId?: { value: string } }).orgUnitId?.value ?? '';
        const personIds = membershipsByUnit.get(unitId);
        if (personIds) {
          personIds.push(membership.personId.value);
        } else {
          membershipsByUnit.set(unitId, [membership.personId.value]);
        }
      }
    }

    const unitUtilisation = allOrgUnits
      .map((unit) => {
        const memberPersonIds = membershipsByUnit.get(unit.orgUnitId.value) ?? [];
        const memberCount = memberPersonIds.length;
        if (memberCount === 0) return null;

        const staffedInUnit = memberPersonIds.filter((pid) => staffedPersonIds.has(pid)).length;
        const utilisation = Number(((staffedInUnit / memberCount) * 100).toFixed(1));

        return {
          memberCount,
          orgUnitId: unit.orgUnitId.value,
          orgUnitName: unit.name,
          staffedCount: staffedInUnit,
          utilisation,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => left.utilisation - right.utilisation);

    const weeklyTrend = this.buildWeeklyTrend(asOf, allProjects, allAssignments, activePeople.length);

    return {
      asOf: asOf.toISOString(),
      dataSources: ['people', 'org_units', 'projects', 'assignments', 'timesheets'],
      summary: {
        activeAssignmentCount: activeAssignments.length,
        activeProjectCount: activeProjects.length,
        staffedPersonCount,
        staffingUtilisationRate,
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
    activePeopleCount: number,
  ): { weekStarting: string; activeProjectCount: number; staffedPersonCount: number; staffingUtilisationRate: number }[] {
    const weeks: { weekStarting: string; activeProjectCount: number; staffedPersonCount: number; staffingUtilisationRate: number }[] = [];
    const activeProjectCount = allProjects.filter((project) => project.status === 'ACTIVE').length;

    const startOfCurrentWeek = new Date(asOf);
    startOfCurrentWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - startOfCurrentWeek.getUTCDay());
    startOfCurrentWeek.setUTCHours(0, 0, 0, 0);

    for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(startOfCurrentWeek);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekOffset * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const activeAssignments = allAssignments.filter((assignment) => assignment.isActiveAt(weekEnd));
      const staffedPersonCount = new Set(activeAssignments.map((assignment) => assignment.personId)).size;
      const staffingUtilisationRate =
        activePeopleCount > 0
          ? Number(((staffedPersonCount / activePeopleCount) * 100).toFixed(1))
          : 0;

      weeks.push({
        activeProjectCount,
        staffedPersonCount,
        staffingUtilisationRate,
        weekStarting: weekStart.toISOString().split('T')[0],
      });
    }

    return weeks;
  }
}
