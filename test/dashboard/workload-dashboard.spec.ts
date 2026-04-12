import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { WorkloadDashboardQueryService } from '@src/modules/dashboard/application/workload-dashboard-query.service';
import { demoDatasetSummary } from '../../prisma/seeds/demo-dataset';

describe('Workload dashboard summary', () => {
  it('aggregates workload signals from the demo dataset', async () => {
    const service = new WorkloadDashboardQueryService();

    const summary = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
    });

    expect(summary.totalActiveProjects).toBe(6);
    expect(summary.totalActiveAssignments).toBe(5);
    expect(summary.unassignedActivePeopleCount).toBe(7);
    expect(summary.projectsWithNoStaffCount).toBe(2);
    expect(summary.peopleWithNoActiveAssignmentsCount).toBe(7);
    expect(summary.projectsWithEvidenceButNoApprovedAssignmentCount).toBe(1);
    expect(summary.projectsWithNoStaff.map((item) => item.id)).toContain(
      demoDatasetSummary.scenarios.projectWithoutAssignmentsId,
    );
    expect(summary.peopleWithNoActiveAssignments.map((item) => item.id)).toContain(
      demoDatasetSummary.scenarios.personWithoutAssignmentId,
    );
  });
});

describe('Workload dashboard API', () => {
  it('GET /dashboard/workload/summary returns dashboard cards and lists', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/dashboard/workload/summary?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body.totalActiveProjects).toBe(6);
    expect(response.body.totalActiveAssignments).toBe(5);
    expect(response.body.projectsWithEvidenceButNoApprovedAssignmentCount).toBe(1);
    expect(response.body.projectsWithNoStaff.length).toBeGreaterThan(0);
    expect(response.body.peopleWithNoActiveAssignments.length).toBeGreaterThan(0);

    await app.close();
  });
});
