import { PersonOrgMembership } from '@src/modules/organization/domain/entities/person-org-membership.entity';
import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';

export const orgRestructureScenarioFixture = {
  timeline: {
    afterRestructureAsOf: new Date('2025-06-15T00:00:00.000Z'),
    beforeRestructureAsOf: new Date('2025-05-15T00:00:00.000Z'),
    restructureEffectiveAt: new Date('2025-06-01T00:00:00.000Z'),
  },
  ids: {
    managers: {
      avaRowe: '11111111-1111-1111-1111-111111111001',
      noahBennett: '11111111-1111-1111-1111-111111111002',
      oliviaChen: '11111111-1111-1111-1111-111111111003',
      sophiaKim: '11111111-1111-1111-1111-111111111006',
    },
    orgUnits: {
      applicationEngineering: '22222222-2222-2222-2222-222222222005',
      dataEngineering: '22222222-2222-2222-2222-222222222006',
      strategicProgramsOffice: '52222222-2222-2222-2222-222222222001',
    },
    people: {
      ethanBrooks: '11111111-1111-1111-1111-111111111008',
      harperAli: '11111111-1111-1111-1111-111111111011',
      lucasReed: '11111111-1111-1111-1111-111111111010',
      miaLopez: '11111111-1111-1111-1111-111111111009',
    },
    seededAssignments: {
      ethanAtlasAssignment: '36666666-0000-0000-0000-000000000001',
    },
  },
  summary: {
    description:
      'Enterprise restructure moving application engineering staff into a strategic programs operating model while preserving dotted-line delivery visibility and historical reporting truth.',
    scenarioKey: 'org-restructure-2025-06',
  },
};

export function buildOrgRestructureReportingLines(): ReportingLine[] {
  const beforeStart = new Date('2024-01-01T00:00:00.000Z');
  const beforeEnd = new Date('2025-05-31T23:59:59.999Z');
  const afterStart = orgRestructureScenarioFixture.timeline.restructureEffectiveAt;

  return [
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(beforeStart, beforeEnd),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.sophiaKim),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
        type: ReportingLineType.solidLine(),
      },
      'scenario:ethan:sophia:solid:before',
    ),
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(beforeStart, beforeEnd),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.sophiaKim),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.miaLopez),
        type: ReportingLineType.solidLine(),
      },
      'scenario:mia:sophia:solid:before',
    ),
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(beforeStart),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.oliviaChen),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.managers.sophiaKim),
        type: ReportingLineType.solidLine(),
      },
      'scenario:sophia:olivia:solid',
    ),
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(afterStart),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.noahBennett),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
        type: ReportingLineType.solidLine(),
      },
      'scenario:ethan:noah:solid:after',
    ),
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(afterStart),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.noahBennett),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.miaLopez),
        type: ReportingLineType.solidLine(),
      },
      'scenario:mia:noah:solid:after',
    ),
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(afterStart),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.avaRowe),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.managers.noahBennett),
        type: ReportingLineType.solidLine(),
      },
      'scenario:noah:ava:solid:after',
    ),
    ReportingLine.create(
      {
        authority: 'REVIEWER',
        effectiveDateRange: EffectiveDateRange.create(beforeStart),
        isPrimary: false,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.people.lucasReed),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
        type: ReportingLineType.dottedLine(),
      },
      'scenario:ethan:lucas:dotted',
    ),
    ReportingLine.create(
      {
        authority: 'VIEWER',
        effectiveDateRange: EffectiveDateRange.create(beforeStart),
        isPrimary: false,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.people.lucasReed),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.miaLopez),
        type: ReportingLineType.dottedLine(),
      },
      'scenario:mia:lucas:dotted',
    ),
    ReportingLine.create(
      {
        authority: 'APPROVER',
        effectiveDateRange: EffectiveDateRange.create(beforeStart),
        isPrimary: true,
        managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.oliviaChen),
        subjectId: PersonId.from(orgRestructureScenarioFixture.ids.people.harperAli),
        type: ReportingLineType.solidLine(),
      },
      'scenario:harper:olivia:solid',
    ),
  ];
}

export function buildOrgRestructureMemberships(): PersonOrgMembership[] {
  const beforeStart = new Date('2024-01-01T00:00:00.000Z');
  const beforeEnd = new Date('2025-05-31T23:59:59.999Z');
  const afterStart = orgRestructureScenarioFixture.timeline.restructureEffectiveAt;

  return [
    PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(beforeStart, beforeEnd),
        isPrimary: true,
        orgUnitId: OrgUnitId.from(orgRestructureScenarioFixture.ids.orgUnits.applicationEngineering),
        personId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
      },
      'scenario-membership:ethan:app:before',
    ),
    PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(afterStart),
        isPrimary: true,
        orgUnitId: OrgUnitId.from(orgRestructureScenarioFixture.ids.orgUnits.strategicProgramsOffice),
        personId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
      },
      'scenario-membership:ethan:spo:after',
    ),
    PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(beforeStart, beforeEnd),
        isPrimary: true,
        orgUnitId: OrgUnitId.from(orgRestructureScenarioFixture.ids.orgUnits.applicationEngineering),
        personId: PersonId.from(orgRestructureScenarioFixture.ids.people.miaLopez),
      },
      'scenario-membership:mia:app:before',
    ),
    PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(afterStart),
        isPrimary: true,
        orgUnitId: OrgUnitId.from(orgRestructureScenarioFixture.ids.orgUnits.dataEngineering),
        personId: PersonId.from(orgRestructureScenarioFixture.ids.people.miaLopez),
      },
      'scenario-membership:mia:data:after',
    ),
    PersonOrgMembership.create(
      {
        effectiveDateRange: EffectiveDateRange.create(beforeStart),
        isPrimary: true,
        orgUnitId: OrgUnitId.from(orgRestructureScenarioFixture.ids.orgUnits.dataEngineering),
        personId: PersonId.from(orgRestructureScenarioFixture.ids.people.harperAli),
      },
      'scenario-membership:harper:data',
    ),
  ];
}
