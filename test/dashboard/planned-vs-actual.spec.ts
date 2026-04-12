import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { createSeededInMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/create-seeded-in-memory-project-assignment.repository';
import { PlannedVsActualQueryService } from '@src/modules/dashboard/application/planned-vs-actual-query.service';
import { createSeededInMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/create-seeded-in-memory-work-evidence.repository';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../helpers/db/seed-demo-project-runtime-data';
import { seedDemoWorkEvidenceRuntimeData } from '../helpers/db/seed-demo-work-evidence-runtime-data';

describe('Planned vs actual comparison', () => {
  it('returns major comparison categories', async () => {
    const service = new PlannedVsActualQueryService(
      createSeededInMemoryProjectAssignmentRepository(),
      createSeededInMemoryWorkEvidenceRepository(),
    );

    const result = await service.execute({
      asOf: '2025-03-15T00:00:00.000Z',
    });

    expect(result.assignedButNoEvidence.length).toBeGreaterThan(0);
    expect(result.evidenceButNoApprovedAssignment.length).toBeGreaterThan(0);
    expect(result.matchedRecords.length).toBeGreaterThan(0);
    expect(result.anomalies.length).toBeGreaterThan(0);
  });
});

describe('Planned vs actual API', () => {
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /dashboard/workload/planned-vs-actual returns comparison categories', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/dashboard/workload/planned-vs-actual?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body).toHaveProperty('assignedButNoEvidence');
    expect(response.body).toHaveProperty('evidenceButNoApprovedAssignment');
    expect(response.body).toHaveProperty('matchedRecords');
    expect(response.body).toHaveProperty('anomalies');

    await app.close();
  });
});
