import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { ApproveProjectAssignmentService } from '@src/modules/assignments/application/approve-project-assignment.service';
import { AssignmentConcurrencyConflictError } from '@src/modules/assignments/application/assignment-concurrency-conflict.error';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { EndProjectAssignmentService } from '@src/modules/assignments/application/end-project-assignment.service';
import { InMemoryAssignmentReferenceRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-assignment-reference.repository';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';

import { roleHeaders } from '../helpers/api/auth-headers';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';

describe('Assignment end workflow', () => {
  async function createApprovedAssignment(repository: InMemoryProjectAssignmentRepository) {
    const createService = new CreateProjectAssignmentService(
      repository,
      new InMemoryAssignmentReferenceRepository(createSeededInMemoryPersonRepository()),
    );
    const approveService = new ApproveProjectAssignmentService(repository);

    const created = await createService.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      note: 'Needs lifecycle management.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    return approveService.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: created.assignmentId.value,
      comment: 'Approved for delivery capacity.',
    });
  }

  it('ends an approved assignment and preserves history', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createApprovedAssignment(repository);
    const service = new EndProjectAssignmentService(repository);

    const ended = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: assignment.assignmentId.value,
      endDate: '2025-04-15T00:00:00.000Z',
      reason: 'Delivered earlier than planned.',
    });

    const history = await repository.findHistoryByAssignmentId(assignment.assignmentId);
    const latestHistory = history[history.length - 1];

    expect(ended.status.value).toBe('ENDED');
    expect(ended.validTo?.toISOString()).toBe('2025-04-15T00:00:00.000Z');
    expect(ended.version).toBe(3);
    expect(history).toHaveLength(3);
    expect(latestHistory?.changeType).toBe('ASSIGNMENT_ENDED');
    expect(latestHistory?.changeReason).toBe('Delivered earlier than planned.');
    expect(latestHistory?.previousSnapshot).toEqual(
      expect.objectContaining({
        status: 'APPROVED',
        validTo: '2025-04-30T23:59:59.999Z',
      }),
    );
  });

  it('blocks invalid end state transitions', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const service = new EndProjectAssignmentService(repository);

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111005',
        assignmentId: 'missing-assignment',
        endDate: '2025-04-15T00:00:00.000Z',
      }),
    ).rejects.toThrow('Assignment not found.');

    const approved = await createApprovedAssignment(repository);
    await service.execute({
      actorId: '11111111-1111-1111-1111-111111111005',
      assignmentId: approved.assignmentId.value,
      endDate: '2025-04-15T00:00:00.000Z',
    });

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111005',
        assignmentId: approved.assignmentId.value,
        endDate: '2025-04-16T00:00:00.000Z',
      }),
    ).rejects.toThrow('Assignment is already ended.');
  });

  it('validates end date consistency', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createApprovedAssignment(repository);
    const service = new EndProjectAssignmentService(repository);

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111005',
        assignmentId: assignment.assignmentId.value,
        endDate: '2025-03-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('Assignment end date must be on or after the assignment start date.');

    await expect(
      service.execute({
        actorId: '11111111-1111-1111-1111-111111111005',
        assignmentId: assignment.assignmentId.value,
        endDate: '2025-05-15T00:00:00.000Z',
      }),
    ).rejects.toThrow('Assignment end date cannot be after the current assignment end date.');
  });

  it('detects a concurrent end conflict from stale assignment state', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const assignment = await createApprovedAssignment(repository);
    const staleEndOne = await repository.findByAssignmentId(assignment.assignmentId);
    const staleEndTwo = await repository.findByAssignmentId(assignment.assignmentId);

    expect(staleEndOne).not.toBeNull();
    expect(staleEndTwo).not.toBeNull();

    staleEndOne!.end(new Date('2025-04-15T00:00:00.000Z'));
    staleEndTwo!.end(new Date('2025-04-14T00:00:00.000Z'));

    await repository.save(staleEndOne!);

    await expect(repository.save(staleEndTwo!)).rejects.toBeInstanceOf(
      AssignmentConcurrencyConflictError,
    );
  });
});

describe('Assignment end API', () => {
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

  it('POST /assignments/{id}/end ends an assignment', async () => {
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

    await request(app.getHttpServer())
      .post(`/assignments/${created.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
      })
      .expect(200);

    const ended = await request(app.getHttpServer())
      .post(`/assignments/${created.body.id}/end`)
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111005',
        endDate: '2025-04-15T00:00:00.000Z',
        reason: 'Rolled off cleanly.',
      })
      .expect(200);

    expect(ended.body.status).toBe('ENDED');
    expect(ended.body.endDate).toBe('2025-04-15T00:00:00.000Z');
    expect(ended.body.version).toBe(3);

    await app.close();
  });
});
