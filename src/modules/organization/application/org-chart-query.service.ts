import { Injectable } from '@nestjs/common';

import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { OrgUnitRepositoryPort } from '../domain/repositories/org-unit-repository.port';
import { PersonOrgMembershipRepositoryPort } from '../domain/repositories/person-org-membership-repository.port';
import { ReportingLineRepositoryPort } from '../domain/repositories/reporting-line-repository.port';
import { PersonId } from '../domain/value-objects/person-id';
import { ReportingLineType } from '../domain/value-objects/reporting-line-type';
import { OrgChartNodeDto, OrgChartResponseDto } from './contracts/org-chart.dto';

@Injectable()
export class OrgChartQueryService {
  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly orgUnitRepository: OrgUnitRepositoryPort,
    private readonly personOrgMembershipRepository: PersonOrgMembershipRepositoryPort,
    private readonly reportingLineRepository: ReportingLineRepositoryPort,
  ) {}

  public async getOrgChart(asOf: Date = new Date('2025-03-15T00:00:00.000Z')): Promise<OrgChartResponseDto> {
    const people = await this.personRepository.listAll();
    const orgUnits = await this.orgUnitRepository.listAll();

    const buildPersonSummary = async (personId: string) => {
      const person = await this.personRepository.findById(personId);
      const lineManagerLine = (
        await this.reportingLineRepository.findActiveBySubject(
          PersonId.from(personId),
          asOf,
          [ReportingLineType.solidLine()],
        )
      )[0];
      const lineManager = lineManagerLine
        ? await this.personRepository.findById(lineManagerLine.managerId.value)
        : null;

      return {
        displayName: person?.displayName ?? personId,
        id: personId,
        lineManagerId: lineManager?.id ?? null,
        lineManagerName: lineManager?.displayName ?? null,
      };
    };

    const buildNode = async (orgUnitId: string): Promise<OrgChartNodeDto> => {
      const orgUnit = await this.orgUnitRepository.findById(orgUnitId);

      if (!orgUnit) {
        throw new Error(`Org unit not found for ${orgUnitId}`);
      }

      const members = await Promise.all(
        (
          await this.personOrgMembershipRepository.findActiveByOrgUnit(orgUnit.orgUnitId, asOf)
        ).map((membership) => buildPersonSummary(membership.personId.value)),
      );

      const childUnits = await Promise.all(
        (await this.orgUnitRepository.findChildren(orgUnit.orgUnitId)).map((item) =>
          buildNode(item.orgUnitId.value),
        ),
      );

      return {
        children: childUnits,
        code: orgUnit.code,
        id: orgUnit.orgUnitId.value,
        kind: 'ORG_UNIT',
        manager: orgUnit.managerPersonId
          ? await buildPersonSummary(orgUnit.managerPersonId.value)
          : null,
        members,
        name: orgUnit.name,
      };
    };

    const roots = await Promise.all(
      orgUnits
        .filter((item) => !item.parentOrgUnitId)
        .map((item) => buildNode(item.orgUnitId.value)),
    );

    const dottedLineRelationships = (
      await Promise.all(
        people.map(async (person) => {
          const managers = await Promise.all(
            (
              await this.reportingLineRepository.findActiveBySubject(
                person.personId,
                asOf,
                [ReportingLineType.dottedLine()],
              )
            ).map((line) => buildPersonSummary(line.managerId.value)),
          );

          if (managers.length === 0) {
            return null;
          }

          return {
            managers,
            person: await buildPersonSummary(person.personId.value),
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      dottedLineRelationships,
      roots,
    };
  }
}
