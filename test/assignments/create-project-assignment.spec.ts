import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { signPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

describe('Create project assignment', () => {
  it('creates a valid assignment with initial approval state and persistence', async () => {
    const service = new CreateProjectAssignmentService(
      new InMemoryProjectAssignmentRepository(),
    );

    const assignment = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      note: 'Primary delivery allocation.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    expect(assignment.projectId).toBe('33333333-3333-3333-3333-333333333002');
    expect(assignment.personId).toBe('11111111-1111-1111-1111-111111111012');
    expect(assignment.staffingRole).toBe('Consultant');
    expect(assignment.status.value).toBe('REQUESTED');
  });

  it('rejects invalid person or project', async () => {
    const service = new CreateProjectAssignmentService(
      new InMemoryProjectAssignmentRepository(),
    );

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 50,
        personId: 'missing-person',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      }),
    ).rejects.toThrow('Person does not exist.');

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 50,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: 'missing-project',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      }),
    ).rejects.toThrow('Project does not exist.');
  });

  it('rejects invalid date range', async () => {
    const service = new CreateProjectAssignmentService(
      new InMemoryProjectAssignmentRepository(),
    );

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 50,
        endDate: '2025-03-01T00:00:00.000Z',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      }),
    ).rejects.toThrow('Assignment end date must be on or after the start date.');
  });

  it('rejects invalid allocation', async () => {
    const service = new CreateProjectAssignmentService(
      new InMemoryProjectAssignmentRepository(),
    );

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 150,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      }),
    ).rejects.toThrow('Allocation percent must be between 0 and 100.');
  });

  it('rejects conflicting overlapping assignment for the same person and project', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const service = new CreateProjectAssignmentService(repository);

    await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 40,
      endDate: '2025-04-30T23:59:59.999Z',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 30,
        endDate: '2025-04-15T23:59:59.999Z',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-04-01T00:00:00.000Z',
        staffingRole: 'Reviewer',
      }),
    ).rejects.toThrow(
      'Overlapping assignment for the same person and project already exists.',
    );
  });

  it('allows an explicit overlap override only when a reason is provided', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const service = new CreateProjectAssignmentService(repository);

    await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 40,
      endDate: '2025-04-30T23:59:59.999Z',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111004',
        allocationPercent: 30,
        allowOverlapOverride: true,
        endDate: '2025-04-15T23:59:59.999Z',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-04-01T00:00:00.000Z',
        staffingRole: 'Reviewer',
      }),
    ).rejects.toThrow('Assignment override reason is required.');

    const override = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 30,
      allowOverlapOverride: true,
      endDate: '2025-04-15T23:59:59.999Z',
      note: 'Urgent overlap approved.',
      overrideReason: 'Urgent shadow staffing approved by governance.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-04-01T00:00:00.000Z',
      staffingRole: 'Reviewer',
    });

    const history = await repository.findHistoryByAssignmentId(override.assignmentId);

    expect(override.status.value).toBe('REQUESTED');
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          changeReason: 'Urgent shadow staffing approved by governance.',
          changeType: 'ASSIGNMENT_OVERRIDE_APPLIED',
        }),
      ]),
    );
  });
});

describe('Assignments API', () => {
  let prisma: PrismaClient;

  function overrideRoleHeaders(
    personId: string,
    ...roles: string[]
  ): Record<string, string> {
    const token = signPlatformJwt(
      {
        person_id: personId,
        roles,
        sub: personId,
      },
      {
        audience: process.env.AUTH_AUDIENCE ?? 'deliverycentral-api',
        issuer: process.env.AUTH_ISSUER ?? 'deliverycentral-local',
        secret: process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret',
      },
    );

    return {
      authorization: `Bearer ${token}`,
    };
  }

  beforeAll(() => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /assignments creates an assignment', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 50,
        endDate: '2025-04-30T23:59:59.999Z',
        note: 'Primary delivery allocation.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      })
      .expect(201);

    expect(response.body.projectId).toBe('33333333-3333-3333-3333-333333333002');
    expect(response.body.personId).toBe('11111111-1111-1111-1111-111111111012');
    expect(response.body.status).toBe('REQUESTED');

    await app.close();
  });

  it('POST /assignments/override creates an assignment through explicit overlap override', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 50,
        endDate: '2025-04-30T23:59:59.999Z',
        note: 'Primary delivery allocation.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      })
      .expect(201);

    const overrideResponse = await request(app.getHttpServer())
      .post('/assignments/override')
      .set(overrideRoleHeaders('11111111-1111-1111-1111-111111111004', 'director'))
      .send({
        allocationPercent: 30,
        endDate: '2025-04-15T23:59:59.999Z',
        note: 'Urgent overlap approved.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        reason: 'Urgent shadow staffing approved by governance.',
        startDate: '2025-04-01T00:00:00.000Z',
        staffingRole: 'Reviewer',
      })
      .expect(201);

    expect(overrideResponse.body).toEqual(
      expect.objectContaining({
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        staffingRole: 'Reviewer',
        status: 'REQUESTED',
      }),
    );

    const auditResponse = await request(app.getHttpServer())
      .get('/audit/business')
      .set(roleHeaders('admin'))
      .query({
        actionType: 'assignment.override_applied',
        targetEntityId: overrideResponse.body.id,
      })
      .expect(200);

    expect(auditResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: 'assignment.override_applied',
          actorId: '11111111-1111-1111-1111-111111111004',
          metadata: expect.objectContaining({
            overrideReason: 'Urgent shadow staffing approved by governance.',
            overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
          }),
          targetEntityId: overrideResponse.body.id,
        }),
      ]),
    );

    await app.close();
  });

  it('POST /assignments/override rejects callers without override authority', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post('/assignments/override')
      .set(roleHeaders('project_manager'))
      .send({
        allocationPercent: 30,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        reason: 'Trying to bypass overlap rule without elevated authority.',
        startDate: '2025-04-01T00:00:00.000Z',
        staffingRole: 'Reviewer',
      })
      .expect(403);

    expect(response.body.message).toBe('Insufficient role for this operation.');

    await app.close();
  });
});
