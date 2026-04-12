import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { BulkCreateProjectAssignmentsService } from '@src/modules/assignments/application/bulk-create-project-assignments.service';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { InMemoryAssignmentReferenceRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-assignment-reference.repository';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';

import { roleHeaders } from '../helpers/api/auth-headers';

describe('Bulk project assignment', () => {
  function createBulkService(repository = new InMemoryProjectAssignmentRepository()) {
    const createProjectAssignmentService = new CreateProjectAssignmentService(
      repository,
      new InMemoryAssignmentReferenceRepository(createSeededInMemoryPersonRepository()),
    );

    return {
      repository,
      service: new BulkCreateProjectAssignmentsService(createProjectAssignmentService),
    };
  }

  it('creates all valid assignments in a bulk request', async () => {
    const { repository, service } = createBulkService();

    const result = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      entries: [
        {
          allocationPercent: 40,
          personId: '11111111-1111-1111-1111-111111111011',
          projectId: '33333333-3333-3333-3333-333333333002',
          staffingRole: 'Analyst',
          startDate: '2025-04-01T00:00:00.000Z',
        },
        {
          allocationPercent: 50,
          endDate: '2025-05-31T23:59:59.999Z',
          personId: '11111111-1111-1111-1111-111111111012',
          projectId: '33333333-3333-3333-3333-333333333006',
          staffingRole: 'Consultant',
          startDate: '2025-04-01T00:00:00.000Z',
        },
      ],
    });

    expect(result.strategy).toBe('PARTIAL_SUCCESS');
    expect(result.createdCount).toBe(2);
    expect(result.failedCount).toBe(0);

    const storedAssignments = await repository.findAll();
    expect(storedAssignments).toHaveLength(2);

    const createdHistory = await repository.findHistoryByAssignmentId(
      storedAssignments[0].assignmentId,
    );
    expect(createdHistory).toHaveLength(1);
    expect(createdHistory[0]?.changeType).toBe('ASSIGNMENT_REQUESTED');
  });

  it('returns mixed-validity results explicitly without hiding failures', async () => {
    const { service } = createBulkService();

    const result = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      entries: [
        {
          allocationPercent: 40,
          personId: '11111111-1111-1111-1111-111111111011',
          projectId: '33333333-3333-3333-3333-333333333002',
          staffingRole: 'Analyst',
          startDate: '2025-04-01T00:00:00.000Z',
        },
        {
          allocationPercent: 40,
          personId: 'missing-person',
          projectId: '33333333-3333-3333-3333-333333333002',
          staffingRole: 'Analyst',
          startDate: '2025-04-01T00:00:00.000Z',
        },
        {
          allocationPercent: 120,
          personId: '11111111-1111-1111-1111-111111111012',
          projectId: '33333333-3333-3333-3333-333333333006',
          staffingRole: 'Consultant',
          startDate: '2025-04-01T00:00:00.000Z',
        },
      ],
    });

    expect(result.createdCount).toBe(1);
    expect(result.failedCount).toBe(2);
    expect(result.failedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PERSON_NOT_FOUND',
          index: 1,
          message: 'Person does not exist.',
        }),
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          index: 2,
          message: 'Allocation percent must be between 0 and 100.',
        }),
      ]),
    );
  });

  it('reports duplicate conflicts as failed items while preserving created assignments', async () => {
    const repository = new InMemoryProjectAssignmentRepository();
    const createProjectAssignmentService = new CreateProjectAssignmentService(
      repository,
      new InMemoryAssignmentReferenceRepository(createSeededInMemoryPersonRepository()),
    );

    await createProjectAssignmentService.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 40,
      endDate: '2025-04-30T23:59:59.999Z',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    });

    const service = new BulkCreateProjectAssignmentsService(createProjectAssignmentService);

    const result = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      entries: [
        {
          allocationPercent: 20,
          endDate: '2025-04-15T23:59:59.999Z',
          personId: '11111111-1111-1111-1111-111111111012',
          projectId: '33333333-3333-3333-3333-333333333002',
          staffingRole: 'Consultant',
          startDate: '2025-04-05T00:00:00.000Z',
        },
        {
          allocationPercent: 30,
          personId: '11111111-1111-1111-1111-111111111011',
          projectId: '33333333-3333-3333-3333-333333333002',
          staffingRole: 'Analyst',
          startDate: '2025-04-05T00:00:00.000Z',
        },
      ],
    });

    expect(result.createdCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.failedItems[0]).toEqual(
      expect.objectContaining({
        code: 'ASSIGNMENT_CONFLICT',
        index: 0,
        message: 'Overlapping assignment for the same person and project already exists.',
      }),
    );
  });
});

describe('Bulk assignments API', () => {
  it('POST /assignments/bulk returns created and failed items explicitly', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post('/assignments/bulk')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        entries: [
          {
            allocationPercent: 40,
            personId: '11111111-1111-1111-1111-111111111011',
            projectId: '33333333-3333-3333-3333-333333333002',
            staffingRole: 'Analyst',
            startDate: '2025-04-01T00:00:00.000Z',
          },
          {
            allocationPercent: 40,
            personId: 'missing-person',
            projectId: '33333333-3333-3333-3333-333333333002',
            staffingRole: 'Analyst',
            startDate: '2025-04-01T00:00:00.000Z',
          },
        ],
      })
      .expect(200);

    expect(response.body.strategy).toBe('PARTIAL_SUCCESS');
    expect(response.body.createdCount).toBe(1);
    expect(response.body.failedCount).toBe(1);
    expect(response.body.createdItems[0].assignment.status).toBe('REQUESTED');
    expect(response.body.failedItems[0]).toEqual(
      expect.objectContaining({
        code: 'PERSON_NOT_FOUND',
        index: 1,
      }),
    );

    await app.close();
  });
});
