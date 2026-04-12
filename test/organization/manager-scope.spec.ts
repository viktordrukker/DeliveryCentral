import { ManagerScopeQueryService } from '@src/modules/organization/application/manager-scope-query.service';
import { InMemoryPersonDirectoryQueryRepository } from '@src/modules/organization/infrastructure/queries/in-memory-person-directory-query.repository';

describe('Manager scope query service', () => {
  const service = new ManagerScopeQueryService(
    new InMemoryPersonDirectoryQueryRepository(),
  );

  it('returns a manager with direct reports', async () => {
    const result = await service.getManagerScope({
      managerId: '11111111-1111-1111-1111-111111111006',
      page: 1,
      pageSize: 10,
    });

    expect(result.directReports.length).toBeGreaterThanOrEqual(2);
    expect(result.directReports.every((item) => item.currentLineManager?.id === '11111111-1111-1111-1111-111111111006')).toBe(true);
  });

  it('returns a manager with no direct reports', async () => {
    const result = await service.getManagerScope({
      managerId: '11111111-1111-1111-1111-111111111012',
      page: 1,
      pageSize: 10,
    });

    expect(result.directReports).toHaveLength(0);
    expect(result.dottedLinePeople).toHaveLength(0);
  });

  it('supports as-of placeholder logic for future scope changes', async () => {
    const result = await service.getManagerScope({
      asOf: '2025-03-15T00:00:00.000Z',
      managerId: '11111111-1111-1111-1111-111111111010',
      page: 1,
      pageSize: 10,
    });

    expect(result.dottedLinePeople.some((item) => item.id === '11111111-1111-1111-1111-111111111008')).toBe(true);
  });
});
