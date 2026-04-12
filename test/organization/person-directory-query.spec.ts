import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { InMemoryPersonDirectoryQueryRepository } from '@src/modules/organization/infrastructure/queries/in-memory-person-directory-query.repository';

describe('Person directory query service', () => {
  const service = new PersonDirectoryQueryService(
    new InMemoryPersonDirectoryQueryRepository(),
  );

  it('lists people with current org unit, manager summary, assignment count, and pagination', async () => {
    const result = await service.listPeople({
      page: 1,
      pageSize: 5,
    });

    expect(result.items).toHaveLength(5);
    expect(result.total).toBeGreaterThanOrEqual(12);
    expect(result.items[0]?.currentOrgUnit).toBeDefined();
    expect(result.items[0]?.currentLineManager).toBeDefined();
  });

  it('filters people by department', async () => {
    const result = await service.listPeople({
      departmentId: '22222222-2222-2222-2222-222222222005',
      page: 1,
      pageSize: 20,
    });

    expect(result.items.every((item) => item.currentOrgUnit?.id === '22222222-2222-2222-2222-222222222005')).toBe(true);
  });

  it('filters people by resource pool', async () => {
    const result = await service.listPeople({
      page: 1,
      pageSize: 20,
      resourcePoolId: '26666666-0000-0000-0000-000000000001',
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.resourcePoolIds.includes('26666666-0000-0000-0000-000000000001'))).toBe(true);
  });

  it('gets a person by id with dotted-line manager summary', async () => {
    const person = await service.getPersonById('11111111-1111-1111-1111-111111111008');

    expect(person?.id).toBe('11111111-1111-1111-1111-111111111008');
    expect(person?.dottedLineManagers).toHaveLength(1);
    expect(person?.currentAssignmentCount).toBeGreaterThanOrEqual(1);
  });
});
