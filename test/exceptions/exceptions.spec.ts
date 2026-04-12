import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { ExceptionQueueQueryService } from '@src/modules/exceptions/application/exception-queue-query.service';
import { M365DirectoryReconciliationRecord } from '@src/modules/integrations/m365/domain/entities/m365-directory-reconciliation-record.entity';
import { InMemoryM365DirectoryReconciliationRecordRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-m365-directory-reconciliation-record.repository';
import { RadiusReconciliationRecord } from '@src/modules/integrations/radius/domain/entities/radius-reconciliation-record.entity';
import { InMemoryRadiusReconciliationRecordRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-radius-reconciliation-record.repository';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { ApprovalState } from '@src/modules/assignments/domain/value-objects/approval-state';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceSource } from '@src/modules/work-evidence/domain/entities/work-evidence-source.entity';

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
  let workEvidenceRepository: InMemoryWorkEvidenceRepository;
  let m365ReconciliationRepository: InMemoryM365DirectoryReconciliationRecordRepository;
  let radiusReconciliationRepository: InMemoryRadiusReconciliationRecordRepository;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);

    m365ReconciliationRepository = new InMemoryM365DirectoryReconciliationRecordRepository();
    radiusReconciliationRepository = new InMemoryRadiusReconciliationRecordRepository();

    app = await createApiTestApp((builder) =>
      builder
        .overrideProvider(InMemoryM365DirectoryReconciliationRecordRepository)
        .useValue(m365ReconciliationRepository)
        .overrideProvider(InMemoryRadiusReconciliationRecordRepository)
        .useValue(radiusReconciliationRepository),
    );
    exceptionQueueQueryService = app.get(ExceptionQueueQueryService);
    projectRepository = app.get(InMemoryProjectRepository);
    projectAssignmentRepository = app.get(InMemoryProjectAssignmentRepository);
    workEvidenceRepository = app.get(InMemoryWorkEvidenceRepository);

    await seedExceptionScenarios();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('classifies staffing, project, approval, and reconciliation anomalies into one queue', async () => {
    const result = await exceptionQueueQueryService.getQueue({
      asOf: '2025-03-15T00:00:00.000Z',
    });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'ASSIGNMENT_WITHOUT_EVIDENCE',
          targetEntityType: 'ASSIGNMENT',
        }),
        expect.objectContaining({
          category: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT',
          targetEntityType: 'WORK_EVIDENCE',
        }),
        expect.objectContaining({
          category: 'WORK_EVIDENCE_AFTER_ASSIGNMENT_END',
          targetEntityType: 'WORK_EVIDENCE',
        }),
        expect.objectContaining({
          category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
          targetEntityType: 'PROJECT',
        }),
        expect.objectContaining({
          category: 'STALE_ASSIGNMENT_APPROVAL',
          targetEntityType: 'ASSIGNMENT',
        }),
        expect.objectContaining({
          category: 'M365_RECONCILIATION_ANOMALY',
          provider: 'm365',
        }),
        expect.objectContaining({
          category: 'RADIUS_RECONCILIATION_ANOMALY',
          provider: 'radius',
        }),
      ]),
    );

    expect(result.summary.total).toBeGreaterThanOrEqual(7);
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

    const activeProject = Project.create(
      {
        name: 'Evidence Gap Project',
        projectCode: 'PRJ-EXC-GAP',
        projectManagerId: PersonId.from('11111111-1111-1111-1111-111111111005'),
        startsOn: new Date('2025-01-01T00:00:00.000Z'),
        status: 'ACTIVE',
      },
      undefined,
    );
    await projectRepository.save(activeProject);

    const endedProject = Project.create(
      {
        name: 'Ended Evidence Project',
        projectCode: 'PRJ-EXC-END',
        projectManagerId: PersonId.from('11111111-1111-1111-1111-111111111005'),
        startsOn: new Date('2025-01-01T00:00:00.000Z'),
        status: 'ACTIVE',
      },
      undefined,
    );
    await projectRepository.save(endedProject);

    await projectAssignmentRepository.save(
      ProjectAssignment.create({
        allocationPercent: AllocationPercent.from(50),
        approvedAt: new Date('2025-02-01T00:00:00.000Z'),
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: activeProject.projectId.value,
        requestedAt: new Date('2025-01-25T00:00:00.000Z'),
        staffingRole: 'Analyst',
        status: ApprovalState.approved(),
        validFrom: new Date('2025-02-01T00:00:00.000Z'),
      }),
    );

    await projectAssignmentRepository.save(
      ProjectAssignment.create({
        allocationPercent: AllocationPercent.from(40),
        approvedAt: new Date('2025-02-10T00:00:00.000Z'),
        personId: '11111111-1111-1111-1111-111111111011',
        projectId: closedProject.projectId.value,
        requestedAt: new Date('2025-02-08T00:00:00.000Z'),
        staffingRole: 'Consultant',
        status: ApprovalState.approved(),
        validFrom: new Date('2025-02-10T00:00:00.000Z'),
      }),
    );

    await projectAssignmentRepository.save(
      ProjectAssignment.create({
        allocationPercent: AllocationPercent.from(20),
        approvedAt: new Date('2025-01-15T00:00:00.000Z'),
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: endedProject.projectId.value,
        requestedAt: new Date('2025-01-10T00:00:00.000Z'),
        staffingRole: 'Engineer',
        status: ApprovalState.approved(),
        validFrom: new Date('2025-01-15T00:00:00.000Z'),
        validTo: new Date('2025-02-10T00:00:00.000Z'),
      }),
    );

    await projectAssignmentRepository.save(
      ProjectAssignment.create({
        allocationPercent: AllocationPercent.from(30),
        personId: '11111111-1111-1111-1111-111111111009',
        projectId: activeProject.projectId.value,
        requestedAt: new Date('2025-02-20T00:00:00.000Z'),
        staffingRole: 'Reviewer',
        status: ApprovalState.requested(),
        validFrom: new Date('2025-02-20T00:00:00.000Z'),
      }),
    );

    const source = WorkEvidenceSource.create(
      {
        displayName: 'Manual Upload',
        provider: 'internal',
        sourceType: 'manual',
      },
      '55555555-5555-5555-5555-555555555555',
    );

    await workEvidenceRepository.save(
      WorkEvidence.create({
        durationMinutes: 360,
        evidenceType: 'manual_entry',
        personId: '11111111-1111-1111-1111-111111111006',
        projectId: activeProject.projectId.value,
        recordedAt: new Date('2025-03-05T00:00:00.000Z'),
        source,
        sourceRecordKey: 'evidence-no-assignment',
        summary: 'Shadow work observed',
      }),
    );

    await workEvidenceRepository.save(
      WorkEvidence.create({
        durationMinutes: 240,
        evidenceType: 'manual_entry',
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: endedProject.projectId.value,
        recordedAt: new Date('2025-03-01T00:00:00.000Z'),
        source,
        sourceRecordKey: 'evidence-after-end',
        summary: 'Late work recorded',
      }),
    );

    await m365ReconciliationRepository.save(
      M365DirectoryReconciliationRecord.create({
        candidatePersonIds: [],
        category: 'UNMATCHED',
        externalDisplayName: 'Unknown External User',
        externalEmail: 'unknown.external@example.com',
        externalUserId: 'm365-unmatched-001',
        lastEvaluatedAt: new Date('2025-03-14T00:00:00.000Z'),
        provider: 'm365',
        summary: 'External identity remains unmatched and requires operator review.',
      }),
    );

    await radiusReconciliationRepository.save(
      RadiusReconciliationRecord.create({
        candidatePersonIds: [],
        category: 'PRESENCE_DRIFT',
        externalAccountId: 'radius-drift-001',
        externalUsername: 'drift.user',
        lastEvaluatedAt: new Date('2025-03-14T12:00:00.000Z'),
        provider: 'radius',
        sourceType: 'vpn',
        summary: 'Previously linked RADIUS account was not observed in the latest sync.',
      }),
    );
  }
});
