import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { PlannedVsActualQueryService } from '@src/modules/dashboard/application/planned-vs-actual-query.service';
import { RoleDashboardQueryService } from '@src/modules/dashboard/application/role-dashboard-query.service';
import { WorkloadDashboardQueryService } from '@src/modules/dashboard/application/workload-dashboard-query.service';
import { createSeededInMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/create-seeded-in-memory-project-assignment.repository';
import { createSeededInMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/create-seeded-in-memory-work-evidence.repository';

describe('Role dashboard query', () => {
  const createService = () =>
    new RoleDashboardQueryService(
      new WorkloadDashboardQueryService(),
      new PlannedVsActualQueryService(
        createSeededInMemoryProjectAssignmentRepository(),
        createSeededInMemoryWorkEvidenceRepository(),
      ),
    );

  it('returns different datasets for each supported role', async () => {
    const service = createService();
    const asOf = '2025-03-15T00:00:00.000Z';

    const employee = await service.execute({ asOf, role: 'employee' });
    const projectManager = await service.execute({ asOf, role: 'project_manager' });
    const resourceManager = await service.execute({ asOf, role: 'resource_manager' });
    const hrManager = await service.execute({ asOf, role: 'hr_manager' });

    expect(employee.summaryCards.map((item) => item.key)).toEqual([
      'activeAssignments',
      'matchedRecords',
      'anomalies',
    ]);
    expect(projectManager.sections.map((item) => item.key)).toEqual([
      'assignedButNoEvidence',
      'projectsWithEvidenceButNoApprovedAssignment',
      'matchedRecords',
    ]);
    expect(resourceManager.sections.map((item) => item.key)).toEqual([
      'peopleWithNoActiveAssignments',
      'projectsWithNoStaff',
      'assignedButNoEvidence',
    ]);
    expect(hrManager.sections.map((item) => item.key)).toEqual([
      'peopleWithNoActiveAssignments',
      'anomalies',
      'projectsWithNoStaff',
    ]);
  });
});

describe('Role dashboard API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /dashboard/{role} returns role-specific dashboard data', async () => {
    const employeeResponse = await request(app.getHttpServer())
      .get('/dashboard/employee?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    const resourceManagerResponse = await request(app.getHttpServer())
      .get('/dashboard/resource_manager?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(employeeResponse.body.role).toBe('employee');
    expect(resourceManagerResponse.body.role).toBe('resource_manager');
    expect(employeeResponse.body.sections.map((item: { key: string }) => item.key)).not.toEqual(
      resourceManagerResponse.body.sections.map((item: { key: string }) => item.key),
    );
  });

  it('GET /dashboard/{role} rejects unsupported roles', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/admin?asOf=2025-03-15T00:00:00.000Z')
      .expect(400);
  });
});
