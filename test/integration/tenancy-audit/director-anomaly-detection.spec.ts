/**
 * TENANCY-AUDIT-3-AGGREGATORS — DirectorAnomalyDetectionService.
 *
 * Documented assumption: this aggregator does NOT filter by `tenantId`
 * today. The platform runs single-tenant (TENANT_ISOLATION_ENABLED=false)
 * and isolation will come from DM-7.5-5 RLS once enabled — see
 * `docs/planning/tenancy-assumptions.md` for the full audit.
 *
 * This test exercises the service against a real test database with rows
 * belonging to TWO tenants and asserts the CURRENT (pre-RLS) behavior:
 * the aggregator returns anomalies from BOTH tenants because no filter
 * is applied. When RLS is enabled, this test should be flipped to assert
 * the opposite (no cross-tenant leakage) by wrapping the `detect()` call
 * in `runInTenantScope`.
 */

import { PrismaClient } from '@prisma/client';

import { DirectorAnomalyDetectionService } from '@src/modules/dashboard/application/director-anomaly-detection.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const hasDb = !!(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('TENANCY-AUDIT — DirectorAnomalyDetectionService', () => {
  let prisma: PrismaClient;
  let service: DirectorAnomalyDetectionService;

  // Two tenants — fixed UUIDs so the test is deterministic.
  const tenantAId = 'aaaa1111-0000-0000-0000-000000000001';
  const tenantBId = 'aaaa1111-0000-0000-0000-000000000002';

  // One ACTIVE project per tenant.
  const projectAId = 'aaaa2222-0000-0000-0000-000000000001';
  const projectBId = 'aaaa2222-0000-0000-0000-000000000002';

  // ProjectRagSnapshot rows that produce a `project_rag_dropped` anomaly
  // for each project.
  const snapAHealthyId = 'aaaa3333-0000-0000-0000-000000000011';
  const snapADroppedId = 'aaaa3333-0000-0000-0000-000000000012';
  const snapBHealthyId = 'aaaa3333-0000-0000-0000-000000000021';
  const snapBDroppedId = 'aaaa3333-0000-0000-0000-000000000022';

  // ProjectRagSnapshot requires a `recordedByPersonId` FK to Person.
  // Use one shared recorder for both tenants (the field is not part of
  // the anomaly query so no cross-tenant interaction).
  const recorderId = 'aaaa4444-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;
    prisma = new PrismaClient({ datasources: { db: { url } } });
    service = new DirectorAnomalyDetectionService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Order matters: snapshots first (FK on project), then projects, then person, then tenants.
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectRagSnapshot" WHERE "id" = ANY($1::uuid[])`,
      [snapAHealthyId, snapADroppedId, snapBHealthyId, snapBDroppedId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Project" WHERE "id" = ANY($1::uuid[])`,
      [projectAId, projectBId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Person" WHERE "id" = $1::uuid`,
      recorderId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Tenant" WHERE "id" = ANY($1::uuid[])`,
      [tenantAId, tenantBId],
    );

    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, code: 'tenant-a-audit', name: 'Tenant A (audit)' },
        { id: tenantBId, code: 'tenant-b-audit', name: 'Tenant B (audit)' },
      ],
    });

    await prisma.person.create({
      data: {
        id: recorderId,
        displayName: 'Audit Recorder',
        givenName: 'Audit',
        familyName: 'Recorder',
      },
    });

    await prisma.project.createMany({
      data: [
        {
          id: projectAId,
          name: 'Tenant A Project',
          projectCode: 'PRJ-TA-AUDIT',
          status: 'ACTIVE',
          tenantId: tenantAId,
        },
        {
          id: projectBId,
          name: 'Tenant B Project',
          projectCode: 'PRJ-TB-AUDIT',
          status: 'ACTIVE',
          tenantId: tenantBId,
        },
      ],
    });

    // GREEN → RED drop for both projects so detectRagDrops() picks them up.
    await prisma.projectRagSnapshot.createMany({
      data: [
        {
          id: snapAHealthyId,
          projectId: projectAId,
          weekStarting: new Date('2026-05-25T00:00:00.000Z'),
          staffingRag: 'GREEN',
          scheduleRag: 'GREEN',
          budgetRag: 'GREEN',
          overallRag: 'GREEN',
          recordedByPersonId: recorderId,
        },
        {
          id: snapADroppedId,
          projectId: projectAId,
          weekStarting: new Date('2026-06-01T00:00:00.000Z'),
          staffingRag: 'RED',
          scheduleRag: 'GREEN',
          budgetRag: 'GREEN',
          overallRag: 'RED',
          recordedByPersonId: recorderId,
        },
        {
          id: snapBHealthyId,
          projectId: projectBId,
          weekStarting: new Date('2026-05-25T00:00:00.000Z'),
          staffingRag: 'GREEN',
          scheduleRag: 'GREEN',
          budgetRag: 'GREEN',
          overallRag: 'GREEN',
          recordedByPersonId: recorderId,
        },
        {
          id: snapBDroppedId,
          projectId: projectBId,
          weekStarting: new Date('2026-06-01T00:00:00.000Z'),
          staffingRag: 'RED',
          scheduleRag: 'GREEN',
          budgetRag: 'GREEN',
          overallRag: 'RED',
          recordedByPersonId: recorderId,
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectRagSnapshot" WHERE "id" = ANY($1::uuid[])`,
      [snapAHealthyId, snapADroppedId, snapBHealthyId, snapBDroppedId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Project" WHERE "id" = ANY($1::uuid[])`,
      [projectAId, projectBId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Person" WHERE "id" = $1::uuid`,
      recorderId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Tenant" WHERE "id" = ANY($1::uuid[])`,
      [tenantAId, tenantBId],
    );
  });

  it('returns RAG-drop anomalies from BOTH tenants (documents pre-RLS single-tenant assumption)', async () => {
    // The service has no tenantId in its `where` clause, so both tenants'
    // projects surface in the result. Once DM-7.5-5 RLS is enabled, only
    // the current-tenant rows will be visible — this expectation should
    // flip to length 1 + the in-scope project id.
    const anomalies = await service.detect({ limit: 50 });

    const ragDropAnomalies = anomalies.filter((a) => a.kind === 'project_rag_dropped');
    const seenProjectIds = new Set(
      ragDropAnomalies.map((a) => {
        const m = a.href.match(/\/projects\/([^?]+)/);
        return m ? m[1] : '';
      }),
    );

    expect(seenProjectIds.has(projectAId)).toBe(true);
    expect(seenProjectIds.has(projectBId)).toBe(true);
  });
});
