import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { ExceptionQueueQueryService } from '@src/modules/exceptions/application/exception-queue-query.service';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

import { createApiTestClient } from '../helpers/api-test-client.helper';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createApiTestApp } from '../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';

describe('Exception queue', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let exceptionQueueQueryService: ExceptionQueueQueryService;
  let projectRepository: InMemoryProjectRepository;
  let projectAssignmentRepository: InMemoryProjectAssignmentRepository;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);

    app = await createApiTestApp();
    exceptionQueueQueryService = app.get(ExceptionQueueQueryService);
    projectRepository = app.get(InMemoryProjectRepository);
    projectAssignmentRepository = app.get(InMemoryProjectAssignmentRepository);

    await seedExceptionScenarios();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('classifies core project lifecycle and approval exceptions into one queue', async () => {
    const result = await exceptionQueueQueryService.getQueue({
      asOf: '2025-03-15T00:00:00.000Z',
    });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
          targetEntityType: 'PROJECT',
        }),
        expect.objectContaining({
          category: 'STALE_ASSIGNMENT_APPROVAL',
          targetEntityType: 'ASSIGNMENT',
        }),
      ]),
    );

    expect(result.summary.total).toBeGreaterThanOrEqual(2);
  });

  it('GET /exceptions exposes the derived queue with filters', async () => {
    const client = createApiTestClient(app);

    const response = await client
      .get('/exceptions?category=STALE_ASSIGNMENT_APPROVAL&asOf=2025-03-15T00:00:00.000Z')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({
        category: 'STALE_ASSIGNMENT_APPROVAL',
        status: 'OPEN',
        targetEntityType: 'ASSIGNMENT',
      }),
    ]);
  });

  it('GET /exceptions/:id returns a specific exception item', async () => {
    const client = createApiTestClient(app);
    const queue = await exceptionQueueQueryService.getQueue({
      asOf: '2025-03-15T00:00:00.000Z',
    });
    const target = queue.items.find((item) => item.category === 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS');

    expect(target).toBeDefined();

    const response = await client
      .get(`/exceptions/${target!.id}?asOf=2025-03-15T00:00:00.000Z`)
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
        id: target!.id,
        targetEntityType: 'PROJECT',
      }),
    );
  });

  async function seedExceptionScenarios(): Promise<void> {
    const closedProject = Project.create(
      {
        name: 'Closed Conflict Project',
        projectCode: 'PRJ-EXC-CLOSED',
        projectManagerId: PersonId.from('11111111-1111-1111-1111-111111111005'),
        startsOn: new Date('2025-01-01T00:00:00.000Z'),
        status: 'CLOSED',
      },
      undefined,
    );
    await projectRepository.save(closedProject);

    await projectAssignmentRepository.save(
      ProjectAssignment.create({
        allocationPercent: AllocationPercent.from(40),
        approvedAt: new Date('2025-02-10T00:00:00.000Z'),
        personId: '11111111-1111-1111-1111-111111111011',
        projectId: closedProject.projectId.value,
        requestedAt: new Date('2025-02-08T00:00:00.000Z'),
        staffingRole: 'Consultant',
        status: AssignmentStatus.booked(),
        validFrom: new Date('2025-02-10T00:00:00.000Z'),
      }),
    );

    await projectAssignmentRepository.save(
      ProjectAssignment.create({
        allocationPercent: AllocationPercent.from(30),
        personId: '11111111-1111-1111-1111-111111111009',
        projectId: closedProject.projectId.value,
        requestedAt: new Date('2025-02-20T00:00:00.000Z'),
        staffingRole: 'Reviewer',
        status: AssignmentStatus.created(),
        validFrom: new Date('2025-02-20T00:00:00.000Z'),
      }),
    );
  }
});
