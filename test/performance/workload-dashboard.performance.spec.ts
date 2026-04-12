import { WorkloadDashboardQueryService } from '@src/modules/dashboard/application/workload-dashboard-query.service';

describe('workload summary performance baseline', () => {
  it('computes the dashboard summary within an acceptable baseline for demo data', async () => {
    const service = new WorkloadDashboardQueryService();
    const startedAt = Date.now();

    await service.execute({ asOf: '2025-03-15T00:00:00.000Z' });

    expect(Date.now() - startedAt).toBeLessThan(1000);
  });
});
