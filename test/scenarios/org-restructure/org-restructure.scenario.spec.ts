import { createSeededInMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/create-seeded-in-memory-project-assignment.repository';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { GetCurrentManagerService } from '@src/modules/organization/domain/services/get-current-manager.service';
import { GetManagerScopeService } from '@src/modules/organization/domain/services/get-manager-scope.service';
import { GetReportingChainAtDateService } from '@src/modules/organization/domain/services/get-reporting-chain-at-date.service';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';
import { InMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person-org-membership.repository';
import { InMemoryReportingLineRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-reporting-line.repository';

import {
  buildOrgRestructureMemberships,
  buildOrgRestructureReportingLines,
  orgRestructureScenarioFixture,
} from './org-restructure.fixture';

describe('scenario: organization restructure', () => {
  it('changes current manager resolution after the restructure cutover', async () => {
    const reportingLines = new InMemoryReportingLineRepository(
      buildOrgRestructureReportingLines(),
    );
    const service = new GetCurrentManagerService(reportingLines);

    const before = await service.execute({
      asOf: orgRestructureScenarioFixture.timeline.beforeRestructureAsOf,
      personId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
    });
    const after = await service.execute({
      asOf: orgRestructureScenarioFixture.timeline.afterRestructureAsOf,
      personId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
    });

    expect(before?.managerId.value).toBe(orgRestructureScenarioFixture.ids.managers.sophiaKim);
    expect(after?.managerId.value).toBe(orgRestructureScenarioFixture.ids.managers.noahBennett);
  });

  it('preserves historical reporting chain while exposing the new chain after restructure', async () => {
    const reportingLines = new InMemoryReportingLineRepository(
      buildOrgRestructureReportingLines(),
    );
    const service = new GetReportingChainAtDateService(reportingLines);

    const before = await service.execute({
      asOf: orgRestructureScenarioFixture.timeline.beforeRestructureAsOf,
      personId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
    });
    const after = await service.execute({
      asOf: orgRestructureScenarioFixture.timeline.afterRestructureAsOf,
      personId: PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
    });

    expect(before.map((line) => line.managerId.value)).toEqual([
      orgRestructureScenarioFixture.ids.managers.sophiaKim,
      orgRestructureScenarioFixture.ids.managers.oliviaChen,
    ]);
    expect(after.map((line) => line.managerId.value)).toEqual([
      orgRestructureScenarioFixture.ids.managers.noahBennett,
      orgRestructureScenarioFixture.ids.managers.avaRowe,
    ]);
  });

  it('keeps existing assignments intact while org memberships change over time', async () => {
    const memberships = new InMemoryPersonOrgMembershipRepository(
      buildOrgRestructureMemberships(),
    );
    const assignments = createSeededInMemoryProjectAssignmentRepository();

    const beforeMembership = await memberships.findActiveByPerson(
      PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
      orgRestructureScenarioFixture.timeline.beforeRestructureAsOf,
    );
    const afterMembership = await memberships.findActiveByPerson(
      PersonId.from(orgRestructureScenarioFixture.ids.people.ethanBrooks),
      orgRestructureScenarioFixture.timeline.afterRestructureAsOf,
    );
    const assignment = await assignments.findByAssignmentId(
      AssignmentId.from(orgRestructureScenarioFixture.ids.seededAssignments.ethanAtlasAssignment),
    );

    expect(beforeMembership[0]?.orgUnitId.value).toBe(
      orgRestructureScenarioFixture.ids.orgUnits.applicationEngineering,
    );
    expect(afterMembership[0]?.orgUnitId.value).toBe(
      orgRestructureScenarioFixture.ids.orgUnits.strategicProgramsOffice,
    );

    expect(assignment?.personId).toBe(orgRestructureScenarioFixture.ids.people.ethanBrooks);
    expect(assignment?.projectId).toBe('33333333-3333-3333-3333-333333333003');
    expect(assignment?.isActiveAt(orgRestructureScenarioFixture.timeline.beforeRestructureAsOf)).toBe(true);
    expect(assignment?.isActiveAt(orgRestructureScenarioFixture.timeline.afterRestructureAsOf)).toBe(true);
  });

  it('updates manager scope to reflect the new structure while dotted-line visibility remains queryable', async () => {
    const reportingLines = new InMemoryReportingLineRepository(
      buildOrgRestructureReportingLines(),
    );
    const scopeService = new GetManagerScopeService(reportingLines);

    const sophiaBefore = await scopeService.execute({
      asOf: orgRestructureScenarioFixture.timeline.beforeRestructureAsOf,
      managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.sophiaKim),
    });
    const sophiaAfter = await scopeService.execute({
      asOf: orgRestructureScenarioFixture.timeline.afterRestructureAsOf,
      managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.sophiaKim),
    });
    const noahAfter = await scopeService.execute({
      asOf: orgRestructureScenarioFixture.timeline.afterRestructureAsOf,
      managerId: PersonId.from(orgRestructureScenarioFixture.ids.managers.noahBennett),
    });
    const lucasDottedAfter = await scopeService.execute({
      asOf: orgRestructureScenarioFixture.timeline.afterRestructureAsOf,
      includeRelationshipTypes: [ReportingLineType.dottedLine()],
      managerId: PersonId.from(orgRestructureScenarioFixture.ids.people.lucasReed),
    });

    expect(sophiaBefore.directReportIds.map((item) => item.value)).toEqual(
      expect.arrayContaining([
        orgRestructureScenarioFixture.ids.people.ethanBrooks,
        orgRestructureScenarioFixture.ids.people.miaLopez,
      ]),
    );
    expect(sophiaAfter.directReportIds).toEqual([]);
    expect(noahAfter.directReportIds.map((item) => item.value)).toEqual([
      orgRestructureScenarioFixture.ids.people.ethanBrooks,
      orgRestructureScenarioFixture.ids.people.miaLopez,
    ]);
    expect(lucasDottedAfter.directReportIds.map((item) => item.value)).toEqual(
      expect.arrayContaining([
        orgRestructureScenarioFixture.ids.people.ethanBrooks,
        orgRestructureScenarioFixture.ids.people.miaLopez,
      ]),
    );
  });
});
