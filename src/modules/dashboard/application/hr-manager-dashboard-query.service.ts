import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { ListCasesService } from '@src/modules/case-management/application/list-cases.service';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { loadAllPositionAssignmentViews } from '@src/shared/persistence/position-assignment-view';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { HrManagerDashboardResponseDto } from './contracts/hr-manager-dashboard.dto';

interface HrManagerDashboardQuery {
  asOf?: string;
  personId: string;
}

interface LifecyclePersonRecord {
  displayName: string;
  hiredAt?: Date;
  id: string;
  primaryEmail: string | null;
}

@Injectable()
export class HrManagerDashboardQueryService {

  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly personRepository: InMemoryPersonRepository,
    private readonly auditLoggerService: AuditLoggerService,
    private readonly listCasesService: ListCasesService,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: HrManagerDashboardQuery): Promise<HrManagerDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('HR manager dashboard asOf is invalid.');
    }

    const manager = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!manager) {
      throw new NotFoundException('HR manager dashboard person was not found.');
    }

    const people = await this.personRepository.listAll();
    const directory = await this.personDirectoryQueryService.listPeople(
      {
        page: 1,
        pageSize: Number.MAX_SAFE_INTEGER,
      },
      asOf,
    );
    const directoryMap = new Map(directory.items.map((item) => [item.id, item]));

    const headcountSummary = {
      activeHeadcount: people.filter((person) => person.status === 'ACTIVE').length,
      inactiveHeadcount: people.filter((person) => person.status === 'INACTIVE').length,
      totalHeadcount: people.length,
    };

    const orgDistribution = this.buildDistribution(
      people.map((person) => {
        const directoryPerson = directoryMap.get(person.personId.value);

        return {
          key: directoryPerson?.currentOrgUnit?.id ?? 'UNASSIGNED',
          label: directoryPerson?.currentOrgUnit?.name ?? 'Unassigned Org Unit',
        };
      }),
    );

    const gradeDistribution = this.buildDistribution(
      people.map((person) => ({
        key: person.grade?.trim() || 'UNSPECIFIED',
        label: person.grade?.trim() || 'UNSPECIFIED',
      })),
    );

    const roleDistribution = this.buildDistribution(
      people.map((person) => ({
        key: person.role?.trim() || 'UNSPECIFIED',
        label: person.role?.trim() || 'UNSPECIFIED',
      })),
    );

    const employeesWithoutManager = people
      .filter((person) => !(directoryMap.get(person.personId.value)?.currentLineManager))
      .map((person) => ({
        displayName: person.displayName,
        personId: person.personId.value,
        primaryEmail: person.primaryEmail ?? null,
        reason: 'NO_CURRENT_MANAGER',
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));

    const employeesWithoutOrgUnit = people
      .filter((person) => !(directoryMap.get(person.personId.value)?.currentOrgUnit))
      .map((person) => ({
        displayName: person.displayName,
        personId: person.personId.value,
        primaryEmail: person.primaryEmail ?? null,
        reason: 'NO_CURRENT_ORG_UNIT',
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));

    const dbLifecyclePeople = await this.prisma.person.findMany({
      select: { id: true, displayName: true, primaryEmail: true, createdAt: true },
    });
    const lifecyclePeople: LifecyclePersonRecord[] = dbLifecyclePeople.map((p) => ({
      displayName: p.displayName,
      hiredAt: p.createdAt,
      id: p.id,
      primaryEmail: p.primaryEmail ?? null,
    }));

    const recentJoinerActivity = [...lifecyclePeople]
      .filter((person) => person.hiredAt && person.hiredAt <= asOf)
      .sort((left, right) => (right.hiredAt?.getTime() ?? 0) - (left.hiredAt?.getTime() ?? 0))
      .slice(0, 5)
      .map((person) => ({
        activityType: 'JOINED',
        displayName: person.displayName,
        occurredAt: person.hiredAt?.toISOString() ?? asOf.toISOString(),
        personId: person.id,
      }));

    const peopleByPersonId = new Map(people.map((p) => [p.personId.value, p]));

    const recentDeactivationActivity = this.auditLoggerService
      .list({
        actionType: 'employee.deactivated',
        limit: 5,
        targetEntityType: 'EMPLOYEE',
      })
      .items.map((record) => ({
        activityType: 'DEACTIVATED',
        displayName:
          peopleByPersonId.get(record.targetEntityId ?? '')?.displayName ??
          record.targetEntityId ??
          'Unknown employee',
        occurredAt: record.occurredAt,
        personId: record.targetEntityId ?? 'unknown-person',
      }));

    // At-risk employees: over-allocated (>100%) OR has an open case (13-B15)
    // SoT PR 14b — sum allocations from canonical ProjectPosition fills.
    const allAssignments = await loadAllPositionAssignmentViews(this.prisma);
    const allocationByPerson = new Map<string, number>();
    for (const a of allAssignments.filter((a) => a.isActiveAt(asOf))) {
      const prev = allocationByPerson.get(a.personId) ?? 0;
      allocationByPerson.set(a.personId, prev + a.allocationPercent);
    }

    // F-49 / 20c-11 — `CaseRecord` exposes `status` + `subjectPersonId` as
    // typed public getters; the previous `as unknown as { status?: string }`
    // casts hid the real types and forced fallback handling. Drop the casts
    // and access the typed accessors directly.
    const { items: openCases } = await this.listCasesService.execute({});
    const openCasePersonIds = new Set(
      openCases
        .filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
        .map((c) => c.subjectPersonId)
        .filter((id): id is string => Boolean(id)),
    );

    const atRiskEmployees = people
      .filter((p) => p.status === 'ACTIVE')
      .flatMap((p) => {
        const personId = p.personId.value;
        const riskFactors: string[] = [];
        if ((allocationByPerson.get(personId) ?? 0) > 100) riskFactors.push('OVER_ALLOCATED');
        if (openCasePersonIds.has(personId)) riskFactors.push('OPEN_CASE');
        if (riskFactors.length === 0) return [];
        return [{
          displayName: p.displayName,
          personId,
          primaryEmail: p.primaryEmail ?? null,
          riskFactors,
        }];
      })
      .sort((a, b) => b.riskFactors.length - a.riskFactors.length || a.displayName.localeCompare(b.displayName));

    return {
      asOf: asOf.toISOString(),
      atRiskEmployees,
      dataSources: ['person_repository', 'person_directory', 'business_audit', 'assignments', 'cases'],
      employeesWithoutManager,
      employeesWithoutOrgUnit,
      gradeDistribution,
      headcountSummary,
      orgDistribution,
      person: {
        displayName: manager.displayName,
        id: manager.id,
        primaryEmail: manager.primaryEmail,
      },
      recentDeactivationActivity,
      recentJoinerActivity,
      roleDistribution,
    };
  }

  private buildDistribution(items: Array<{ key: string; label: string }>) {
    return Array.from(
      items.reduce((map, item) => {
        const current = map.get(item.key);
        if (current) {
          current.count += 1;
          return map;
        }

        map.set(item.key, {
          count: 1,
          key: item.key,
          label: item.label,
        });
        return map;
      }, new Map<string, { count: number; key: string; label: string }>()),
    )
      .map(([, value]) => value)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }
}
