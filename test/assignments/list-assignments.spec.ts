import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { GetAssignmentByIdService } from '@src/modules/assignments/application/get-assignment-by-id.service';
import { ListAssignmentsService } from '@src/modules/assignments/application/list-assignments.service';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

let prisma: PrismaClient;

beforeAll(() => {
  prisma = createAppPrismaClient();
});

beforeEach(async () => {
  await resetPersistenceTestDatabase(prisma);
  await seedDemoOrganizationRuntimeData(prisma);
  await seedDemoProjectRuntimeData(prisma);
  await seedDemoAssignmentRuntimeData(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('List assignments', () => {
  it('returns authoritative assignment summaries', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = moduleRef.get(ListAssignmentsService);

    const result = await service.execute({});

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toHaveProperty('person');
    expect(result.items[0]).toHaveProperty('project');
    expect(result.items[0]).toHaveProperty('approvalState');
  });

  it('filters assignments by person, project, and status', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = moduleRef.get(ListAssignmentsService);

    const result = await service.execute({
      personId: '11111111-1111-1111-1111-111111111008',
      projectId: '33333333-3333-3333-3333-333333333003',
      status: 'APPROVED',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.person.id).toBe('11111111-1111-1111-1111-111111111008');
  });
});

describe('Assignment details query', () => {
  it('returns assignment details by id', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = moduleRef.get(GetAssignmentByIdService);

    const result = await service.execute('36666666-0000-0000-0000-000000000001');

    expect(result).not.toBeNull();
    expect(result?.person.displayName).toBe('Ethan Brooks');
    expect(result?.project.displayName).toBe('Atlas ERP Rollout');
    expect(result?.canApprove).toBe(false);
  });
});

describe('Assignments query API', () => {
  it('GET /assignments returns assignment rows', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/assignments?status=APPROVED')
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0]).toHaveProperty('staffingRole');
    expect(response.body.items[0]).toHaveProperty('approvalState');

    await app.close();
  });

  it('GET /assignments/{id} returns details', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/assignments/36666666-0000-0000-0000-000000000001')
      .expect(200);

    expect(response.body.id).toBe('36666666-0000-0000-0000-000000000001');
    expect(response.body).toHaveProperty('canApprove');
    expect(response.body).toHaveProperty('canReject');

    await app.close();
  });

  it('reflects workflow changes after approve', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const created = await request(app.getHttpServer())
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 50,
        note: 'Needs approval.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/assignments/${created.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        comment: 'Approved for delivery capacity.',
      })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/assignments/${created.body.id}`)
      .expect(200);

    expect(detail.body.approvalState).toBe('APPROVED');
    expect(detail.body.canApprove).toBe(false);
    expect(detail.body.canReject).toBe(false);

    await app.close();
  });
});
