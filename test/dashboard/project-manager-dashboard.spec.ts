import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { ProjectManagerDashboardQueryService } from '@src/modules/dashboard/application/project-manager-dashboard-query.service';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';
import { seedDemoWorkEvidenceRuntimeData } from '../helpers/db/seed-demo-work-evidence-runtime-data';

describe('Project manager dashboard query', () => {
  let moduleRef: TestingModule;
  let service: ProjectManagerDashboardQueryService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
    await seedDemoWorkEvidenceRuntimeData(prisma);

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = moduleRef.get(ProjectManagerDashboardQueryService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns managed projects and staffing data for a PM with owned projects', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111006',
    });

    expect(result.person.displayName).toBe('Sophia Kim');
    expect(result.managedProjects.length).toBeGreaterThan(0);
    expect(result.staffingSummary.managedProjectCount).toBe(3);
    expect(result.staffingSummary.activeAssignmentCount).toBeGreaterThan(0);
  });

  it('returns empty project-oriented slices for a PM without owned projects', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111001',
    });

    expect(result.person.displayName).toBe('Ava Rowe');
    expect(result.managedProjects).toHaveLength(0);
    expect(result.projectsWithStaffingGaps).toHaveLength(0);
    expect(result.projectsWithTimeVariance).toHaveLength(0);
  });

  it('surfaces anomaly aggregation for managed projects', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111006',
    });

    expect(result.projectsWithTimeVariance.map((item) => item.projectId)).toContain(
      '33333333-3333-3333-3333-333333333005',
    );
    expect(result.projectsWithStaffingGaps.map((item) => item.projectId)).toContain(
      '33333333-3333-3333-3333-333333333004',
    );
  });
});

describe('Project manager dashboard API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
    await seedDemoWorkEvidenceRuntimeData(prisma);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /dashboard/project-manager/{personId} returns project-oriented dashboard data', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard/project-manager/11111111-1111-1111-1111-111111111006?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body.person.displayName).toBe('Sophia Kim');
    expect(response.body).toHaveProperty('managedProjects');
    expect(response.body).toHaveProperty('staffingSummary');
    expect(response.body).toHaveProperty('projectsWithStaffingGaps');
    expect(response.body).toHaveProperty('projectsWithTimeVariance');
    expect(response.body).toHaveProperty('recentlyChangedAssignments');
  });
});
