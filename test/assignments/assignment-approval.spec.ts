import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { ApproveProjectAssignmentService } from '@src/modules/assignments/application/approve-project-assignment.service';
import { AssignmentConcurrencyConflictError } from '@src/modules/assignments/application/assignment-concurrency-conflict.error';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { RejectProjectAssignmentService } from '@src/modules/assignments/application/reject-project-assignment.service';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryAssignmentReferenceRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-assignment-reference.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

describe('Assignment approval workflow', () => {
  async function createPendingAssignment(
    repository: InMemoryProjectAssignmentRepository,
  ) {
    const createService = new CreateProjectAssignmentService(
      repository,
      new InMemoryAssignmentReferenceRepository(createSeededInMemoryPersonRepository()),
    );

    return createService.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      note: 'Needs approval.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });
  }

  it('approves from a valid state', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createPendingAssignment(repository);
    const service = new ApproveProjectAssignmentService(repository);

    const approved = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: assignment.assignmentId.value,
      comment: 'Approved for delivery capacity.',
    });

    expect(approved.status.value).toBe('APPROVED');
    expect(approved.approvedAt).toBeDefined();
    expect(approved.version).toBe(2);
    expect((await repository.findApprovalsByAssignmentId(assignment.assignmentId)).length).toBe(2);
  });

  it('rejects from a valid state', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createPendingAssignment(repository);
    const service = new RejectProjectAssignmentService(repository);

    const rejected = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: assignment.assignmentId.value,
      reason: 'Capacity unavailable this quarter.',
    });

    expect(rejected.status.value).toBe('REJECTED');
    expect((await repository.findApprovalsByAssignmentId(assignment.assignmentId)).length).toBe(2);
  });

  it('blocks invalid transition', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createPendingAssignment(repository);
    const approveService = new ApproveProjectAssignmentService(repository);
    const rejectService = new RejectProjectAssignmentService(repository);

    await approveService.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: assignment.assignmentId.value,
    });

    await expect(
      rejectService.execute({
        actorId: '11111111-1111-1111-1111-111111111005',
        assignmentId: assignment.assignmentId.value,
        reason: 'Too late.',
      }),
    ).rejects.toThrow('Assignment cannot transition from APPROVED to REJECTED.');
  });

  it('detects a concurrent approval conflict from stale assignment state', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createPendingAssignment(repository);
    const staleApprovalOne = await repository.findByAssignmentId(assignment.assignmentId);
    const staleApprovalTwo = await repository.findByAssignmentId(assignment.assignmentId);

    expect(staleApprovalOne).not.toBeNull();
    expect(staleApprovalTwo).not.toBeNull();

    staleApprovalOne!.approve(new Date('2025-03-16T00:00:00.000Z'));
    staleApprovalTwo!.approve(new Date('2025-03-16T00:05:00.000Z'));

    await repository.save(staleApprovalOne!);

    await expect(repository.save(staleApprovalTwo!)).rejects.toBeInstanceOf(
      AssignmentConcurrencyConflictError,
    );
  });

  it('detects a stale reject conflict after a concurrent approval succeeds', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createPendingAssignment(repository);
    const staleReject = await repository.findByAssignmentId(assignment.assignmentId);
    const approveService = new ApproveProjectAssignmentService(repository);

    expect(staleReject).not.toBeNull();

    await approveService.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: assignment.assignmentId.value,
      comment: 'Approved first.',
    });

    staleReject!.reject();

    await expect(repository.save(staleReject!)).rejects.toBeInstanceOf(
      AssignmentConcurrencyConflictError,
    );
  });

  it('returns missing assignment error', async () => {
    const service = new ApproveProjectAssignmentService(
      new InMemoryProjectAssignmentRepository(),
    );

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111005',
        assignmentId: 'missing-assignment',
      }),
    ).rejects.toThrow('Assignment not found.');
  });
});

describe('Assignment approval API', () => {
  let prisma: PrismaClient;

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

  it('POST /assignments/{id}/approve approves an assignment', async () => {
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
        endDate: '2025-04-30T23:59:59.999Z',
        note: 'Primary delivery allocation.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        startDate: '2025-03-15T00:00:00.000Z',
        staffingRole: 'Consultant',
      })
      .expect(201);

    const approved = await request(app.getHttpServer())
      .post(`/assignments/${created.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        comment: 'Approved for rollout.',
      })
      .expect(200);

    expect(approved.body.status).toBe('APPROVED');
    expect(approved.body.version).toBe(2);

    await app.close();
  });

  it('POST /assignments/{id}/reject rejects an assignment', async () => {
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
        allocationPercent: 25,
        note: 'Secondary allocation.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333001',
        startDate: '2025-05-01T00:00:00.000Z',
        staffingRole: 'Planner',
      })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .post(`/assignments/${created.body.id}/reject`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        reason: 'Project paused.',
      })
      .expect(200);

    expect(rejected.body.status).toBe('REJECTED');

    await app.close();
  });

  it('POST /assignments/{id}/approve returns conflict for a stale concurrent mutation', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ApproveProjectAssignmentService)
      .useValue({
        execute: jest.fn().mockRejectedValue(new AssignmentConcurrencyConflictError()),
      })
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const conflict = await request(app.getHttpServer())
      .post('/assignments/96666666-0000-0000-0000-000000000099/approve')
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        comment: 'Approve stale assignment.',
      })
      .expect(409);

    expect(conflict.body.message).toBe(
      'Assignment was changed by another operation. Refresh and try again.',
    );

    await app.close();
  });
});
