import { Injectable } from '@nestjs/common';

import {
  demoAssignments,
  demoOrgUnits,
  demoPeople,
  demoPersonOrgMemberships,
  demoReportingLines,
  demoResourcePoolMemberships,
  demoResourcePools,
} from '../../../../../prisma/seeds/demo-dataset';
import {
  ListPersonDirectoryResult,
  PersonDirectoryQueryRepositoryPort,
  PersonDirectoryRecord,
} from '../../application/ports/person-directory-query.repository.port';

@Injectable()
export class InMemoryPersonDirectoryQueryRepository
  implements PersonDirectoryQueryRepositoryPort
{
  public async findById(id: string, asOf: Date = new Date()): Promise<PersonDirectoryRecord | null> {
    const list = await this.list({
      asOf,
      page: 1,
      pageSize: demoPeople.length,
    });

    return list.items.find((item) => item.id === id) ?? null;
  }

  public async list(query: {
    asOf: Date;
    departmentId?: string;
    page: number;
    pageSize: number;
    resourcePoolId?: string;
  }): Promise<ListPersonDirectoryResult> {
    const asOf = query.asOf;
    const activeMemberships = demoPersonOrgMemberships.filter(
      (membership) =>
        membership.validFrom <= asOf &&
        (!('validTo' in membership) || !membership.validTo || membership.validTo >= asOf),
    );
    const activeReportingLines = demoReportingLines.filter(
      (line) =>
        line.validFrom <= asOf &&
        (!('validTo' in line) || !line.validTo || line.validTo >= asOf),
    );
    const activeAssignments = demoAssignments.filter(
      (assignment) =>
        ['APPROVED', 'ACTIVE'].includes(assignment.status) &&
        assignment.validFrom <= asOf &&
        (!assignment.validTo || assignment.validTo >= asOf),
    );
    const activePoolMemberships = demoResourcePoolMemberships.filter(
      (membership) =>
        membership.validFrom <= asOf &&
        (!('validTo' in membership) || !membership.validTo || membership.validTo >= asOf),
    );

    const items = demoPeople
      .map<PersonDirectoryRecord>((person) => {
        const membership = activeMemberships.find(
          (item) => item.personId === person.id && item.isPrimary,
        );
        const orgUnit = membership
          ? demoOrgUnits.find((item) => item.id === membership.orgUnitId) ?? null
          : null;
        const lineManagerLine = activeReportingLines.find(
          (item) => item.subjectPersonId === person.id && item.relationshipType === 'SOLID_LINE',
        );
        const lineManager = lineManagerLine
          ? demoPeople.find((item) => item.id === lineManagerLine.managerPersonId) ?? null
          : null;
        const dottedLineManagers = activeReportingLines
          .filter(
            (item) => item.subjectPersonId === person.id && item.relationshipType === 'DOTTED_LINE',
          )
          .map((line) => demoPeople.find((item) => item.id === line.managerPersonId))
          .filter((item): item is (typeof demoPeople)[number] => Boolean(item))
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
          }));
        const resourcePoolIds = activePoolMemberships
          .filter((membershipItem) => membershipItem.personId === person.id)
          .map((membershipItem) => membershipItem.resourcePoolId)
          .filter((poolId) => demoResourcePools.some((pool) => pool.id === poolId));
        const resourcePools = resourcePoolIds
          .map((poolId) => demoResourcePools.find((pool) => pool.id === poolId))
          .filter((pool): pool is (typeof demoResourcePools)[number] => Boolean(pool))
          .map((pool) => ({ id: pool.id, name: pool.name }));

        return {
          currentAssignmentCount: activeAssignments.filter(
            (assignment) => assignment.personId === person.id,
          ).length,
          currentLineManager: lineManager
            ? {
                displayName: lineManager.displayName,
                id: lineManager.id,
              }
            : null,
          currentOrgUnit: orgUnit
            ? {
                code: orgUnit.code,
                id: orgUnit.id,
                name: orgUnit.name,
              }
            : null,
          displayName: person.displayName,
          dottedLineManagers,
          id: person.id,
          lifecycleStatus: person.employmentStatus ?? 'ACTIVE',
          primaryEmail: person.primaryEmail ?? null,
          resourcePoolIds,
          resourcePools,
        };
      })
      .filter((item) =>
        query.departmentId ? item.currentOrgUnit?.id === query.departmentId : true,
      )
      .filter((item) =>
        query.resourcePoolId ? item.resourcePoolIds.includes(query.resourcePoolId) : true,
      );

    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;

    return {
      items: items.slice(start, end),
      total: items.length,
    };
  }

  public async listManagerScope(query: {
    asOf: Date;
    managerId: string;
    page: number;
    pageSize: number;
  }): Promise<{
    directReports: PersonDirectoryRecord[];
    dottedLinePeople: PersonDirectoryRecord[];
    managerId: string;
    page: number;
    pageSize: number;
    totalDirectReports: number;
    totalDottedLinePeople: number;
  }> {
    const fullDirectory = await this.list({
      asOf: query.asOf,
      page: 1,
      pageSize: demoPeople.length,
    });

    const asOf = query.asOf;
    const activeReportingLines = demoReportingLines.filter(
      (line) =>
        line.validFrom <= asOf &&
        (!('validTo' in line) || !line.validTo || line.validTo >= asOf),
    );

    const directReportIds = activeReportingLines
      .filter(
        (line) =>
          line.managerPersonId === query.managerId &&
          line.relationshipType === 'SOLID_LINE',
      )
      .map((line) => line.subjectPersonId);

    const dottedLineIds = activeReportingLines
      .filter(
        (line) =>
          line.managerPersonId === query.managerId &&
          line.relationshipType === 'DOTTED_LINE',
      )
      .map((line) => line.subjectPersonId);

    const directReportsAll = fullDirectory.items.filter((item) =>
      directReportIds.includes(item.id),
    );
    const dottedLinePeopleAll = fullDirectory.items.filter((item) =>
      dottedLineIds.includes(item.id),
    );

    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;

    return {
      directReports: directReportsAll.slice(start, end),
      dottedLinePeople: dottedLinePeopleAll.slice(start, end),
      managerId: query.managerId,
      page: query.page,
      pageSize: query.pageSize,
      totalDirectReports: directReportsAll.length,
      totalDottedLinePeople: dottedLinePeopleAll.length,
    };
  }
}
