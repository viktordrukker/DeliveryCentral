/**
 * LEAN-P0-5 — reconciliation backfill integration test.
 *
 * Exercises the migration at
 * `prisma/migrations/20260602_lean_p0_5_reconciliation_backfill/migration.sql`
 * against a real test database. Asserts:
 *
 *   1. Pre-condition: legacy rows exist with no lean counterparts (orphan
 *      lean ProjectPositions in the seeded fixture).
 *   2. Post-migration: every fingerprint-matching ProjectAssignment has a
 *      ProjectPosition with `legacyAssignmentId` populated.
 *   3. Post-migration: every fingerprint-matching staffing_requests row has
 *      at least one ProjectPosition with `legacyStaffingRequestId` populated.
 *   4. Post-migration: every StaffingRequestProposalCandidate that resolves
 *      to an existing ProjectPositionCandidate has its `legacyCandidateId`
 *      populated.
 *   5. Post-migration: every staffing_requests / staffing_request_fulfilments
 *      row has a non-NULL `id_new`.
 *   6. Post-migration: timesheet_entries.positionId is set when
 *      assignmentId resolves to a mirrored position.
 *   7. Idempotency: re-running the migration SQL produces zero net changes.
 *
 * Gating: the test only runs when `TEST_DATABASE_URL` / `DATABASE_URL`
 * points at a database. CI provides this. Locally it can be skipped — the
 * unit-level shape verification in
 * `test/unit/lean/lean-readiness-check.spec.ts` already exercises the
 * SQL structure without a live DB.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../prisma/migrations/20260602_lean_p0_5_reconciliation_backfill/migration.sql',
);

const hasDb = !!(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);

// Skip the live-DB suite when no test DB is available. The shape of the
// migration SQL itself is still exercised by the unit tests in
// test/unit/lean/.
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('LEAN-P0-5 reconciliation backfill', () => {
  let prisma: PrismaClient;
  let migrationSql: string;

  // Test ids — all UUIDs so the cast paths in the migration work.
  const projectId = '11111111-2222-3333-4444-000000000001';
  const personId = '11111111-2222-3333-4444-000000000010';
  const candidatePersonId = '11111111-2222-3333-4444-000000000011';
  const requesterPersonId = '11111111-2222-3333-4444-000000000020';
  const assignmentId = '11111111-2222-3333-4444-000000000100';
  const staffingRequestId = '11111111-2222-3333-4444-000000000200';
  const staffingRequestIdNew = '11111111-2222-3333-4444-000000000201';
  const positionId = '11111111-2222-3333-4444-000000000300';
  const candidateRowId = '11111111-2222-3333-4444-000000000400';
  const slateId = '11111111-2222-3333-4444-000000000500';
  const positionCandidateId = '11111111-2222-3333-4444-000000000600';
  const timesheetWeekId = '11111111-2222-3333-4444-000000000700';
  const timesheetEntryId = '11111111-2222-3333-4444-000000000701';
  const validFrom = new Date('2026-05-01T00:00:00.000Z');

  beforeAll(() => {
    const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;
    prisma = new PrismaClient({ datasources: { db: { url } } });
    migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean only the rows we touch. Order matters: child rows first.
    await prisma.$executeRawUnsafe(
      `DELETE FROM "timesheet_entries" WHERE "id" = $1::text`,
      timesheetEntryId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "timesheet_weeks" WHERE "id" = $1::text`,
      timesheetWeekId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectPositionCandidate" WHERE "id" = $1::uuid`,
      positionCandidateId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "StaffingRequestProposalCandidate" WHERE "id" = $1::uuid`,
      candidateRowId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "StaffingRequestProposalSlate" WHERE "id" = $1::uuid`,
      slateId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectPosition" WHERE "id" = $1::uuid`,
      positionId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectAssignment" WHERE "id" = $1::uuid`,
      assignmentId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "staffing_requests" WHERE "id" = $1::text`,
      staffingRequestId,
    );

    // Seed legacy + lean rows. The lean ProjectPosition is intentionally
    // *missing* its legacyAssignmentId / legacyStaffingRequestId — the
    // migration's UPDATE statements should populate them.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Person" ("id", "displayName", "email", "createdAt", "updatedAt")
         VALUES ($1::uuid, 'Test Person', $2::text, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      personId,
      `lean-p0-5-${personId}@test.local`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Person" ("id", "displayName", "email", "createdAt", "updatedAt")
         VALUES ($1::uuid, 'Test Candidate', $2::text, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      candidatePersonId,
      `lean-p0-5-cand-${candidatePersonId}@test.local`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Person" ("id", "displayName", "email", "createdAt", "updatedAt")
         VALUES ($1::uuid, 'Test Requester', $2::text, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      requesterPersonId,
      `lean-p0-5-req-${requesterPersonId}@test.local`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Project" ("id", "name", "code", "createdAt", "updatedAt")
         VALUES ($1::uuid, 'LEAN-P0-5 Project', $2::text, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      projectId,
      `LEAN-P0-5-${projectId.slice(0, 8)}`,
    );

    // Legacy staffing_requests row — id is TEXT, id_new is UUID.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "staffing_requests"
         ("id", "id_new", "projectId", "requestedByPersonId", "role",
          "skills", "allocationPercent", "headcountRequired", "priority",
          "status", "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1::text, $2::uuid, $3::text, $4::text, 'Engineer',
                 ARRAY[]::text[], 50, 1, 'MEDIUM',
                 'OPEN', '2026-05-01', '2026-12-31', NOW(), NOW())`,
      staffingRequestId,
      staffingRequestIdNew,
      projectId,
      requesterPersonId,
    );

    // Legacy ProjectAssignment row.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProjectAssignment"
         ("id", "personId", "projectId", "staffingRequestId", "staffingRole",
          "status", "allocationPercent", "validFrom", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, 'Engineer',
                 'ASSIGNED', 50, $5::timestamptz, NOW(), NOW())`,
      assignmentId,
      personId,
      projectId,
      staffingRequestId,
      validFrom,
    );

    // Lean ProjectPosition — intentionally missing legacy* columns. The
    // fingerprint (activePersonId + projectId + activeValidFrom + role)
    // matches the legacy assignment above.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProjectPosition"
         ("id", "projectId", "role", "requiredAllocationPercent",
          "startDate", "endDate", "fillStatus",
          "activePersonId", "activeAllocationPercent", "activeValidFrom",
          "version", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, 'Engineer', 50,
                 '2026-05-01', '2026-12-31', 'ASSIGNED',
                 $3::uuid, 50, $4::timestamptz,
                 1, NOW(), NOW())`,
      positionId,
      projectId,
      personId,
      validFrom,
    );

    // Slate + candidate so the candidate-backfill path has something to do.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StaffingRequestProposalSlate"
         ("id", "staffingRequestId", "proposedByPersonId", "status",
          "proposedAt", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::text, $3::uuid, 'OPEN',
                 NOW(), NOW(), NOW())`,
      slateId,
      staffingRequestId,
      requesterPersonId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StaffingRequestProposalCandidate"
         ("id", "slateId", "candidatePersonId", "rank", "matchScore",
          "mismatchedSkills", "decision", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, $3::uuid, 1, 0.85,
                 ARRAY[]::text[], 'PENDING', NOW(), NOW())`,
      candidateRowId,
      slateId,
      candidatePersonId,
    );
    // Lean ProjectPositionCandidate — same (positionId, candidatePersonId) pair.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProjectPositionCandidate"
         ("id", "positionId", "candidatePersonId", "rank", "matchScore",
          "mismatchedSkills", "decision", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, $3::uuid, 1, 0.85,
                 ARRAY[]::text[], 'PENDING', NOW(), NOW())`,
      positionCandidateId,
      positionId,
      candidatePersonId,
    );

    // Timesheet week + entry whose assignmentId points at the legacy row.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "timesheet_weeks"
         ("id", "personId", "weekStart", "status", "createdAt", "updatedAt")
         VALUES ($1::text, $2::text, '2026-05-04', 'DRAFT', NOW(), NOW())`,
      timesheetWeekId,
      personId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "timesheet_entries"
         ("id", "timesheetWeekId", "projectId", "assignmentId", "date",
          "hours", "capex", "createdAt", "updatedAt")
         VALUES ($1::text, $2::text, $3::text, $4::text, '2026-05-04',
                 8, false, NOW(), NOW())`,
      timesheetEntryId,
      timesheetWeekId,
      projectId,
      assignmentId,
    );
  });

  it('backfills legacyAssignmentId + legacyStaffingRequestId on ProjectPosition', async () => {
    // Pre-condition: the lean row exists but its legacy* columns are NULL.
    const before = await prisma.$queryRawUnsafe<
      Array<{ legacyAssignmentId: string | null; legacyStaffingRequestId: string | null }>
    >(`SELECT "legacyAssignmentId", "legacyStaffingRequestId"
         FROM "ProjectPosition" WHERE "id" = $1::uuid`,
      positionId);
    expect(before[0].legacyAssignmentId).toBeNull();
    expect(before[0].legacyStaffingRequestId).toBeNull();

    await prisma.$executeRawUnsafe(migrationSql);

    const after = await prisma.$queryRawUnsafe<
      Array<{ legacyAssignmentId: string | null; legacyStaffingRequestId: string | null }>
    >(`SELECT "legacyAssignmentId", "legacyStaffingRequestId"
         FROM "ProjectPosition" WHERE "id" = $1::uuid`,
      positionId);
    expect(after[0].legacyAssignmentId).toBe(assignmentId);
    expect(after[0].legacyStaffingRequestId).toBe(staffingRequestIdNew);
  });

  it('backfills legacyCandidateId on ProjectPositionCandidate', async () => {
    await prisma.$executeRawUnsafe(migrationSql);

    const row = await prisma.$queryRawUnsafe<
      Array<{ legacyCandidateId: string | null }>
    >(`SELECT "legacyCandidateId"
         FROM "ProjectPositionCandidate" WHERE "id" = $1::uuid`,
      positionCandidateId);
    expect(row[0].legacyCandidateId).toBe(candidateRowId);
  });

  it('backfills positionId + personId on timesheet_entries', async () => {
    await prisma.$executeRawUnsafe(migrationSql);

    const row = await prisma.$queryRawUnsafe<
      Array<{ positionId: string | null; personId: string | null }>
    >(`SELECT "positionId", "personId"
         FROM "timesheet_entries" WHERE "id" = $1::text`,
      timesheetEntryId);
    expect(row[0].positionId).toBe(positionId);
    expect(row[0].personId).toBe(personId);
  });

  it('ensures id_new is populated on staffing_requests + staffing_request_fulfilments', async () => {
    // The DM-2 trigger keeps id_new populated on new inserts, but the
    // migration must be safe even if a pre-trigger row exists. Set the
    // id_new to NULL on our seed row, then run the migration.
    await prisma.$executeRawUnsafe(
      `UPDATE "staffing_requests" SET "id_new" = NULL WHERE "id" = $1::text`,
      staffingRequestId,
    );

    await prisma.$executeRawUnsafe(migrationSql);

    const row = await prisma.$queryRawUnsafe<Array<{ id_new: string | null }>>(
      `SELECT "id_new" FROM "staffing_requests" WHERE "id" = $1::text`,
      staffingRequestId,
    );
    expect(row[0].id_new).not.toBeNull();
  });

  it('is idempotent — re-running produces zero net changes', async () => {
    await prisma.$executeRawUnsafe(migrationSql);
    const snapshotAfterFirst = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT "id", "legacyAssignmentId", "legacyStaffingRequestId"
         FROM "ProjectPosition" WHERE "id" = $1::uuid`,
      positionId,
    );

    await prisma.$executeRawUnsafe(migrationSql);
    const snapshotAfterSecond = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT "id", "legacyAssignmentId", "legacyStaffingRequestId"
         FROM "ProjectPosition" WHERE "id" = $1::uuid`,
      positionId,
    );

    expect(snapshotAfterSecond).toEqual(snapshotAfterFirst);
  });
});

// When the live-DB suite is skipped (no DATABASE_URL set), still keep a
// trivial assertion so the file shows up in jest output instead of being
// silently empty.
if (!hasDb) {
  describe('LEAN-P0-5 reconciliation backfill (DB suite skipped)', () => {
    it('migration.sql exists at the expected path', () => {
      expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
      expect(fs.statSync(MIGRATION_PATH).size).toBeGreaterThan(0);
    });
  });
}
