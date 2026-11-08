/**
 * TENANCY-AUDIT-3-AGGREGATORS — UnifiedApprovalQueueService.
 *
 * Documented assumption: this aggregator does NOT filter by `tenantId`
 * today. The platform runs single-tenant (TENANT_ISOLATION_ENABLED=false)
 * and isolation will come from DM-7.5-5 RLS once enabled — see
 * `docs/planning/tenancy-assumptions.md` for the full audit.
 *
 * This test exercises the service's `list()` aggregation path against a
 * real test database with rows belonging to TWO tenants and asserts the
 * CURRENT (pre-RLS) behavior: the queue returns items from BOTH tenants
 * because no filter is applied. When RLS is enabled, this test should be
 * flipped to assert isolation by wrapping the `list()` call in
 * `runInTenantScope`.
 */

import { PrismaClient } from '@prisma/client';

import { UnifiedApprovalQueueService } from '@src/modules/dashboard/application/unified-approval-queue.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const hasDb = !!(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

// Stubs for the 6 non-Prisma collaborator services. `list()` only touches
// `SkillEndorsementService.listPending()`; everything else is dispatched
// from `decide()` which this test does NOT exercise.
const stubLeave = {} as never;
const stubBudget = {} as never;
const stubActivation = {} as never;
const stubApproveCase = {} as never;
const stubTimesheets = {} as never;
const stubTransition = {} as never;
const stubSkillEndorsement = { listPending: async () => [] } as never;

describeIfDb('TENANCY-AUDIT — UnifiedApprovalQueueService', () => {
  let prisma: PrismaClient;
  let service: UnifiedApprovalQueueService;

  // Two tenants.
  const tenantAId = 'bbbb1111-0000-0000-0000-000000000001';
  const tenantBId = 'bbbb1111-0000-0000-0000-000000000002';

  // Owner persons (one per tenant — referenced by CaseRecord.ownerPersonId).
  const ownerAId = 'bbbb2222-0000-0000-0000-000000000001';
  const ownerBId = 'bbbb2222-0000-0000-0000-000000000002';
  const subjectAId = 'bbbb2222-0000-0000-0000-000000000011';
  const subjectBId = 'bbbb2222-0000-0000-0000-000000000012';

  const caseTypeId = 'bbbb3333-0000-0000-0000-000000000001';

  // One OPEN CaseRecord per tenant — surfaces via `loadCases()`.
  const caseAId = 'bbbb4444-0000-0000-0000-000000000001';
  const caseBId = 'bbbb4444-0000-0000-0000-000000000002';

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;
    prisma = new PrismaClient({ datasources: { db: { url } } });
    service = new UnifiedApprovalQueueService(
      prisma as unknown as PrismaService,
      stubLeave,
      stubBudget,
      stubActivation,
      stubApproveCase,
      stubTimesheets,
      stubTransition,
      stubSkillEndorsement,
    );
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  async function cleanup(): Promise<void> {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CaseRecord" WHERE "id" = ANY($1::uuid[])`,
      [caseAId, caseBId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CaseType" WHERE "id" = $1::uuid`,
      caseTypeId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Person" WHERE "id" = ANY($1::uuid[])`,
      [ownerAId, ownerBId, subjectAId, subjectBId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Tenant" WHERE "id" = ANY($1::uuid[])`,
      [tenantAId, tenantBId],
    );
  }

  beforeEach(async () => {
    await cleanup();

    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, code: 'tenant-a-uaq', name: 'Tenant A (uaq)' },
        { id: tenantBId, code: 'tenant-b-uaq', name: 'Tenant B (uaq)' },
      ],
    });

    await prisma.person.createMany({
      data: [
        { id: ownerAId, displayName: 'Owner A', givenName: 'Owner', familyName: 'A', tenantId: tenantAId },
        { id: ownerBId, displayName: 'Owner B', givenName: 'Owner', familyName: 'B', tenantId: tenantBId },
        { id: subjectAId, displayName: 'Subject A', givenName: 'Subject', familyName: 'A', tenantId: tenantAId },
        { id: subjectBId, displayName: 'Subject B', givenName: 'Subject', familyName: 'B', tenantId: tenantBId },
      ],
    });

    await prisma.caseType.create({
      data: { id: caseTypeId, key: 'EMPLOYEE_ISSUE', displayName: 'Tenancy Audit Case' },
    });

    await prisma.caseRecord.createMany({
      data: [
        {
          id: caseAId,
          caseNumber: 'AUDIT-CASE-A',
          caseTypeId,
          subjectPersonId: subjectAId,
          ownerPersonId: ownerAId,
          status: 'OPEN',
          summary: 'Tenant A audit case',
          tenantId: tenantAId,
        },
        {
          id: caseBId,
          caseNumber: 'AUDIT-CASE-B',
          caseTypeId,
          subjectPersonId: subjectBId,
          ownerPersonId: ownerBId,
          status: 'OPEN',
          summary: 'Tenant B audit case',
          tenantId: tenantBId,
        },
      ],
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  it('returns OPEN cases from BOTH tenants in the case source (documents pre-RLS single-tenant assumption)', async () => {
    // The service applies no tenantId filter, so both tenants' OPEN cases
    // surface. Once DM-7.5-5 RLS is enabled, only the in-scope tenant's
    // case is visible — flip the expectation then.
    const out = await service.list({ sources: ['case'], page: 1, pageSize: 50 });

    const caseItems = out.items.filter((i) => i.source === 'case');
    const seenIds = new Set(caseItems.map((i) => i.id));

    expect(seenIds.has(caseAId)).toBe(true);
    expect(seenIds.has(caseBId)).toBe(true);
  });
});
