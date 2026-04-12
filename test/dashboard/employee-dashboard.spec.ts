import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { ListAssignmentsService } from '@src/modules/assignments/application/list-assignments.service';
import { EmployeeDashboardQueryService } from '@src/modules/dashboard/application/employee-dashboard-query.service';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import {
  ListPersonDirectoryResult,
  PersonDirectoryQueryRepositoryPort,
  PersonDirectoryRecord,
} from '@src/modules/organization/application/ports/person-directory-query.repository.port';
import { ListWorkEvidenceService } from '@src/modules/work-evidence/application/list-work-evidence.service';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';
import { seedDemoWorkEvidenceRuntimeData } from '../helpers/db/seed-demo-work-evidence-runtime-data';

class StaticPersonDirectoryQueryRepository implements PersonDirectoryQueryRepositoryPort {
  public constructor(private readonly items: PersonDirectoryRecord[]) {}

  public async findById(id: string): Promise<PersonDirectoryRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async listManagerScope(): Promise<{
    directReports: PersonDirectoryRecord[];
    dottedLinePeople: PersonDirectoryRecord[];
    managerId: string;
    page: number;
    pageSize: number;
    totalDirectReports: number;
    totalDottedLinePeople: number;
  }> {
    return {
      directReports: [],
      dottedLinePeople: [],
      managerId: '',
      page: 1,
      pageSize: this.items.length,
      totalDirectReports: 0,
      totalDottedLinePeople: 0,
    };
  }

  public async list(): Promise<ListPersonDirectoryResult> {
    return {
      items: [...this.items],
      total: this.items.length,
    };
  }
}

describe('Employee dashboard query', () => {
  let moduleRef: TestingModule;
  let service: EmployeeDashboardQueryService;
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

    service = moduleRef.get(EmployeeDashboardQueryService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns self-oriented data for an employee with assignments', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111008',
    });

    expect(result.person.displayName).toBe('Ethan Brooks');
    expect(result.currentAssignments).toHaveLength(1);
    expect(result.futureAssignments).toHaveLength(0);
    expect(result.currentWorkloadSummary.totalAllocationPercent).toBe(50);
    expect(result.recentWorkEvidenceSummary.recentEntryCount).toBe(1);
    expect(result.pendingWorkflowItems.itemCount).toBe(0);
  });

  it('returns empty current/future assignment slices for an employee without assignments', async () => {
    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111012',
    });

    expect(result.person.displayName).toBe('Zoe Turner');
    expect(result.currentAssignments).toHaveLength(0);
    expect(result.futureAssignments).toHaveLength(0);
    expect(result.currentWorkloadSummary.totalAllocationPercent).toBe(0);
    expect(result.recentWorkEvidenceSummary.recentEntryCount).toBe(0);
  });

  it('returns evidence summary even when an employee has no current assignments', async () => {
    const personDirectoryService = new PersonDirectoryQueryService(
      new StaticPersonDirectoryQueryRepository([
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: {
            code: 'DEP-APP',
            id: '22222222-2222-2222-2222-222222222005',
            name: 'Application Engineering',
          },
          displayName: 'Evidence Only User',
          dottedLineManagers: [],
          id: 'person-evidence-only',
          lifecycleStatus: 'ACTIVE',
          primaryEmail: 'evidence.only@example.com',
          resourcePoolIds: [],
          resourcePools: [],
        },
      ]),
    );
    const assignmentRepository = new InMemoryProjectAssignmentRepository();
    const evidenceRepository = new InMemoryWorkEvidenceRepository([
      WorkEvidence.create(
        {
          durationMinutes: 180,
          evidenceType: 'TIMESHEET_ENTRY',
          occurredOn: new Date('2025-03-10T00:00:00.000Z'),
          personId: 'person-evidence-only',
          projectId: '33333333-3333-3333-3333-333333333002',
          recordedAt: new Date('2025-03-10T18:00:00.000Z'),
          source: WorkEvidenceSource.create({
            connectionKey: 'internal-timesheet',
            displayName: 'Internal Timesheet',
            provider: 'INTERNAL',
            sourceType: 'TIMESHEET',
          }, 'source:TIMESHEET'),
          sourceRecordKey: 'TS-EVIDENCE-ONLY-1',
          summary: 'Incident support work.',
        },
        WorkEvidenceId.from('50000000-0000-0000-0000-000000000001'),
      ),
    ]);
    const isolatedService = new EmployeeDashboardQueryService(
      personDirectoryService,
      new ListAssignmentsService(assignmentRepository),
      new ListWorkEvidenceService(evidenceRepository),
    );

    const result = await isolatedService.execute({
      asOf: '2025-03-15T00:00:00.000Z',
      personId: 'person-evidence-only',
    });

    expect(result.currentAssignments).toHaveLength(0);
    expect(result.futureAssignments).toHaveLength(0);
    expect(result.recentWorkEvidenceSummary.recentEntryCount).toBe(1);
    expect(result.recentWorkEvidenceSummary.totalEffortHours).toBe(3);
    expect(result.recentWorkEvidenceSummary.sourceTypes).toEqual(['TIMESHEET']);
  });
});

describe('Employee dashboard API', () => {
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

  it('GET /dashboard/employee/{personId} returns employee dashboard data', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard/employee/11111111-1111-1111-1111-111111111008?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body.person.displayName).toBe('Ethan Brooks');
    expect(response.body.currentAssignments).toHaveLength(1);
    expect(response.body).toHaveProperty('currentWorkloadSummary');
    expect(response.body).toHaveProperty('recentWorkEvidenceSummary');
    expect(response.body).toHaveProperty('pendingWorkflowItems');
    expect(response.body).toHaveProperty('notificationsSummary');
  });

  it('GET /dashboard/employee/{personId} rejects a missing employee', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/employee/not-a-real-person?asOf=2025-03-15T00:00:00.000Z')
      .expect(404);
  });
});
