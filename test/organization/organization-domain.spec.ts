import { GetCurrentManagerService } from '@src/modules/organization/domain/services/get-current-manager.service';
import { GetManagerScopeService } from '@src/modules/organization/domain/services/get-manager-scope.service';
import { GetOrgSubtreeService } from '@src/modules/organization/domain/services/get-org-subtree.service';
import { GetReportingChainAtDateService } from '@src/modules/organization/domain/services/get-reporting-chain-at-date.service';
import { OrgUnit } from '@src/modules/organization/domain/entities/org-unit.entity';
import { Person } from '@src/modules/organization/domain/entities/person.entity';
import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { EffectiveDateRange } from '@src/modules/organization/domain/value-objects/effective-date-range';
import { ReportingLineType } from '@src/modules/organization/domain/value-objects/reporting-line-type';
import { InMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-org-unit.repository';
import { InMemoryReportingLineRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-reporting-line.repository';

describe('Organization domain services', () => {
  const person = Person.register({
    displayName: 'Alice Employee',
    familyName: 'Employee',
    givenName: 'Alice',
    primaryEmail: 'alice@example.com',
  }, PersonId.from('00000000-0000-0000-0000-000000000001'));
  const lineManager = Person.register({
    displayName: 'Bob Manager',
    familyName: 'Manager',
    givenName: 'Bob',
    primaryEmail: 'bob@example.com',
  }, PersonId.from('00000000-0000-0000-0000-000000000002'));
  const futureManager = Person.register({
    displayName: 'Carol Future',
    familyName: 'Future',
    givenName: 'Carol',
    primaryEmail: 'carol@example.com',
  }, PersonId.from('00000000-0000-0000-0000-000000000003'));
  const dottedManager = Person.register({
    displayName: 'Dan Dotted',
    familyName: 'Dotted',
    givenName: 'Dan',
    primaryEmail: 'dan@example.com',
  }, PersonId.from('00000000-0000-0000-0000-000000000004'));
  const seniorManager = Person.register({
    displayName: 'Eve Senior',
    familyName: 'Senior',
    givenName: 'Eve',
    primaryEmail: 'eve@example.com',
  }, PersonId.from('00000000-0000-0000-0000-000000000005'));

  const rootOrgUnit = OrgUnit.create({
    code: 'HQ',
    name: 'Headquarters',
  }, OrgUnitId.from('10000000-0000-0000-0000-000000000001'));
  const deliveryOrgUnit = OrgUnit.create({
    code: 'DEL',
    name: 'Delivery',
    parentOrgUnitId: rootOrgUnit.orgUnitId,
  }, OrgUnitId.from('10000000-0000-0000-0000-000000000002'));
  const consultingOrgUnit = OrgUnit.create({
    code: 'CONS',
    name: 'Consulting',
    parentOrgUnitId: deliveryOrgUnit.orgUnitId,
  }, OrgUnitId.from('10000000-0000-0000-0000-000000000003'));

  const currentLine = ReportingLine.create({
    authority: 'APPROVER',
    effectiveDateRange: EffectiveDateRange.create(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-06-30T23:59:59.999Z'),
    ),
    isPrimary: true,
    managerId: lineManager.personId,
    subjectId: person.personId,
    type: ReportingLineType.solidLine(),
  });
  const futureLine = ReportingLine.create({
    authority: 'APPROVER',
    effectiveDateRange: EffectiveDateRange.create(new Date('2025-07-01T00:00:00.000Z')),
    isPrimary: true,
    managerId: futureManager.personId,
    subjectId: person.personId,
    type: ReportingLineType.solidLine(),
  });
  const dotted = ReportingLine.create({
    authority: 'REVIEWER',
    effectiveDateRange: EffectiveDateRange.create(new Date('2025-01-01T00:00:00.000Z')),
    isPrimary: false,
    managerId: dottedManager.personId,
    subjectId: person.personId,
    type: ReportingLineType.dottedLine(),
  });
  const managerToSenior = ReportingLine.create({
    authority: 'APPROVER',
    effectiveDateRange: EffectiveDateRange.create(new Date('2024-01-01T00:00:00.000Z')),
    isPrimary: true,
    managerId: seniorManager.personId,
    subjectId: lineManager.personId,
    type: ReportingLineType.solidLine(),
  });

  it('resolves the current solid-line manager', async () => {
    const service = new GetCurrentManagerService(
      new InMemoryReportingLineRepository([currentLine, dotted, futureLine, managerToSenior]),
    );

    const result = await service.execute({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      personId: person.personId,
    });

    expect(result?.managerId.equals(lineManager.personId)).toBe(true);
    expect(result?.type.equals(ReportingLineType.solidLine())).toBe(true);
  });

  it('keeps dotted-line managers alongside the solid-line manager', async () => {
    const reportingLineRepository = new InMemoryReportingLineRepository([
      currentLine,
      dotted,
      futureLine,
      managerToSenior,
    ]);
    const currentManagerService = new GetCurrentManagerService(reportingLineRepository);
    const managerScopeService = new GetManagerScopeService(reportingLineRepository);

    const currentManager = await currentManagerService.execute({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      personId: person.personId,
    });
    const dottedScope = await managerScopeService.execute({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      includeRelationshipTypes: [ReportingLineType.dottedLine()],
      managerId: dottedManager.personId,
    });

    expect(currentManager?.managerId.equals(lineManager.personId)).toBe(true);
    expect(dottedScope.directReportIds.map((item) => item.value)).toEqual([person.personId.value]);
  });

  it('supports a future-dated manager change', async () => {
    const service = new GetCurrentManagerService(
      new InMemoryReportingLineRepository([currentLine, dotted, futureLine, managerToSenior]),
    );

    const beforeChange = await service.execute({
      asOf: new Date('2025-06-15T00:00:00.000Z'),
      personId: person.personId,
    });
    const afterChange = await service.execute({
      asOf: new Date('2025-07-15T00:00:00.000Z'),
      personId: person.personId,
    });

    expect(beforeChange?.managerId.equals(lineManager.personId)).toBe(true);
    expect(afterChange?.managerId.equals(futureManager.personId)).toBe(true);
  });

  it('reconstructs the historical reporting chain at a date', async () => {
    const service = new GetReportingChainAtDateService(
      new InMemoryReportingLineRepository([currentLine, dotted, futureLine, managerToSenior]),
    );

    const chain = await service.execute({
      asOf: new Date('2025-03-01T00:00:00.000Z'),
      personId: person.personId,
    });

    expect(chain.map((entry) => entry.managerId.value)).toEqual([
      lineManager.personId.value,
      seniorManager.personId.value,
    ]);
  });

  it('resolves an org subtree from the hierarchy', async () => {
    const service = new GetOrgSubtreeService(
      new InMemoryOrgUnitRepository([rootOrgUnit, deliveryOrgUnit, consultingOrgUnit]),
    );

    const subtree = await service.execute({
      orgUnitId: rootOrgUnit.orgUnitId,
    });

    expect(subtree.map((item) => item.code)).toEqual(['HQ', 'DEL', 'CONS']);
  });
});
