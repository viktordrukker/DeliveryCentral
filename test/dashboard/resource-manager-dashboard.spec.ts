import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { ResourceManagerDashboardQueryService } from '@src/modules/dashboard/application/resource-manager-dashboard-query.service';

describe('Resource manager dashboard query', () => {
  let moduleRef: TestingModule;
  let service: ResourceManagerDashboardQueryService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = moduleRef.get(ResourceManagerDashboardQueryService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('returns team and capacity data for a manager with resources', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111003',
    });

    expect(result.person.displayName).toBe('Olivia Chen');
    expect(result.summary.managedTeamCount).toBe(1);
    expect(result.summary.totalManagedPeopleCount).toBe(4);
    expect(result.teamCapacitySummary[0]?.teamName).toBe('Engineering Pool');
  });

  it('returns empty resource slices for a person with no managed teams', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111001',
    });

    expect(result.person.displayName).toBe('Ava Rowe');
    expect(result.teamCapacitySummary).toHaveLength(0);
    expect(result.peopleWithoutAssignments).toHaveLength(0);
    expect(result.teamsInMultipleActiveProjects).toHaveLength(0);
  });

  it('renders capacity indicators and actionable summaries correctly', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111003',
    });

    expect(result.peopleWithoutAssignments.map((item) => item.personId)).toEqual(
      expect.arrayContaining([
        '11111111-1111-1111-1111-111111111006',
        '11111111-1111-1111-1111-111111111007',
      ]),
    );
    expect(result.allocationIndicators.find((item) => item.personId === '11111111-1111-1111-1111-111111111008')?.indicator).toBe(
      'UNDERALLOCATED',
    );
    expect(result.teamsInMultipleActiveProjects.map((item) => item.teamId)).toContain(
      '26666666-0000-0000-0000-000000000001',
    );
  });
});

describe('Resource manager dashboard API', () => {
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

  it('GET /dashboard/resource-manager/{personId} returns resource-oriented dashboard data', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard/resource-manager/11111111-1111-1111-1111-111111111003?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body.person.displayName).toBe('Olivia Chen');
    expect(response.body).toHaveProperty('summary');
    expect(response.body).toHaveProperty('teamCapacitySummary');
    expect(response.body).toHaveProperty('peopleWithoutAssignments');
    expect(response.body).toHaveProperty('futureAssignmentPipeline');
    expect(response.body).toHaveProperty('teamsInMultipleActiveProjects');
  });
});
