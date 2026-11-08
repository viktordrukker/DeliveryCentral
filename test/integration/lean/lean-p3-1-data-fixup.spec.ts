/**
 * LEAN-P3-1 — pre-migration data fixup integration test.
 *
 * Exercises the migration at
 * `prisma/migrations/20260606_lean_p3_1_data_fixup/migration.sql`
 * against a real test database. Asserts the four data-fixup operations
 * leave the prod schema in the state Phase 3 step 2 (LEAN-P3-2) needs:
 *
 *   1. CaseRecord.relatedAssignmentId is NULL on every row after run.
 *   2. rate_card_entries.pinnedPositions is populated with the JSONB
 *      snapshot of every pin previously held through
 *      ProjectAssignment.appliedRateCardEntryId.
 *   3. timesheet_entries.positionId is non-null for every entry whose
 *      assignmentId resolved to a ProjectPosition via legacyAssignmentId.
 *   4. AuditLog rows whose aggregateType was ProjectAssignment AND whose
 *      aggregateId resolves to a ProjectPosition via legacyAssignmentId
 *      are flipped to ProjectPosition with aggregateId rewritten.
 *
 * Plus idempotency: re-running the migration is a no-op.
 *
 * Gating: TEST_DATABASE_URL / DATABASE_URL must point at a database. CI
 * provides this. Locally it skips with the file existence check below.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../prisma/migrations/20260606_lean_p3_1_data_fixup/migration.sql',
);

const hasDb = !!(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('LEAN-P3-1 data fixup', () => {
  let prisma: PrismaClient;
  let migrationSql: string;

  // Test ids — UUIDs so cast paths work.
  const projectId = '22222222-3333-4444-5555-000000000001';
  const personId = '22222222-3333-4444-5555-000000000010';
  const assignmentId = '22222222-3333-4444-5555-000000000100';
  const positionId = '22222222-3333-4444-5555-000000000300';
  let caseTypeId = '';
  const caseRecordId = '22222222-3333-4444-5555-000000000401';
  const rateCardId = '22222222-3333-4444-5555-000000000500';
  const rateCardEntryId = '22222222-3333-4444-5555-000000000501';
  const timesheetWeekId = '22222222-3333-4444-5555-000000000600';
  const timesheetEntryId = '22222222-3333-4444-5555-000000000601';
  const auditLogId = '22222222-3333-4444-5555-000000000700';
  const validFrom = new Date('2026-05-01T00:00:00.000Z');

  beforeAll(() => {
    const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;
    prisma = new PrismaClient({ datasources: { db: { url } } });
    migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  });

  /**
   * Prisma's $executeRawUnsafe rejects multi-statement scripts when any
   * statement is a DO $$ … END $$ block. Strip line comments, then split
   * on top-level semicolons (respecting `$$` markers), and run each
   * statement sequentially.
   */
  async function runMigration() {
    const stripped = migrationSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    const statements: string[] = [];
    let current = '';
    let inDollarQuote = false;
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i];
      if (
        ch === '$' &&
        stripped[i + 1] === '$' &&
        (i === 0 || stripped[i - 1] !== '$')
      ) {
        inDollarQuote = !inDollarQuote;
        current += '$$';
        i++;
        continue;
      }
      if (ch === ';' && !inDollarQuote) {
        const trimmed = current.trim();
        if (trimmed.length > 0) statements.push(trimmed);
        current = '';
        continue;
      }
      current += ch;
    }
    const tail = current.trim();
    if (tail.length > 0) statements.push(tail);
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
  }

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean only the rows we touch. Child rows first.
    await prisma.$executeRawUnsafe(
      `DELETE FROM "AuditLog" WHERE "id" = $1::uuid`,
      auditLogId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "timesheet_entries" WHERE "id" = $1::text`,
      timesheetEntryId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "timesheet_weeks" WHERE "id" = $1::text`,
      timesheetWeekId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CaseRecord" WHERE "id" = $1::uuid`,
      caseRecordId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "rate_card_entries" WHERE "id" = $1::uuid`,
      rateCardEntryId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "rate_cards" WHERE "id" = $1::uuid`,
      rateCardId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectPosition" WHERE "id" = $1::uuid`,
      positionId,
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProjectAssignment" WHERE "id" = $1::uuid`,
      assignmentId,
    );

    // Seed Person + Project (idempotent).
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Person" ("id", "givenName", "familyName", "displayName",
         "primaryEmail", "createdAt", "updatedAt")
         VALUES ($1::uuid, 'Test', 'Person', 'Test Person',
                 $2::text, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      personId,
      `lean-p3-1-${personId}@test.local`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Project" ("id", "name", "projectCode", "createdAt", "updatedAt")
         VALUES ($1::uuid, 'LEAN-P3-1 Project', $2::text, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      projectId,
      `LEAN-P3-1-${projectId.slice(0, 8)}`,
    );

    // Seed a RateCard + RateCardEntry.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "rate_cards"
         ("id", "name", "currencyCode", "validFrom", "isActive",
          "createdAt", "updatedAt")
         VALUES ($1::uuid, 'LEAN-P3-1 Card', 'USD', '2026-01-01', true,
                 NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
      rateCardId,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "rate_card_entries"
         ("id", "rateCardId", "staffingRole", "grade", "hourlyRate",
          "isActive", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, 'Engineer', 'L3', 100, true, NOW(), NOW())`,
      rateCardEntryId,
      rateCardId,
    );

    // Legacy ProjectAssignment with appliedRateCardEntryId pinned.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProjectAssignment"
         ("id", "personId", "projectId", "staffingRole", "status",
          "allocationPercent", "validFrom", "appliedRateCardEntryId",
          "effectiveBillRate", "effectiveBillCurrency",
          "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'Engineer', 'ASSIGNED',
                 50, $4::timestamptz, $5::uuid, 100, 'USD',
                 NOW(), NOW())`,
      assignmentId,
      personId,
      projectId,
      validFrom,
      rateCardEntryId,
    );

    // Lean ProjectPosition pre-mirrored to the legacy assignmentId.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProjectPosition"
         ("id", "projectId", "role", "requiredAllocationPercent",
          "startDate", "endDate", "fillStatus",
          "activePersonId", "activeAllocationPercent", "activeValidFrom",
          "legacyAssignmentId", "version",
          "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, 'Engineer', 50,
                 '2026-05-01', '2026-12-31', 'ASSIGNED',
                 $3::uuid, 50, $4::timestamptz,
                 $5::uuid, 1,
                 NOW(), NOW())`,
      positionId,
      projectId,
      personId,
      validFrom,
      assignmentId,
    );

    // Reuse an existing CaseType — the closed enum + unique key means
    // seeding our own collides with the seeded ones. The migration treats
    // caseTypeId opaquely, so any valid id is fine.
    const caseTypeRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "CaseType" LIMIT 1`,
    );
    if (caseTypeRows.length === 0) {
      throw new Error('No CaseType rows in test DB — seed required.');
    }
    caseTypeId = caseTypeRows[0].id;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CaseRecord"
         ("id", "caseNumber", "caseTypeId", "subjectPersonId",
          "ownerPersonId", "relatedAssignmentId", "status",
          "version", "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::text, $3::uuid, $4::uuid,
                 $4::uuid, $5::uuid, 'OPEN',
                 1, NOW(), NOW())`,
      caseRecordId,
      `LEAN-P3-1-${caseRecordId.slice(0, 8)}`,
      caseTypeId,
      personId,
      assignmentId,
    );

    // Timesheet week + entry whose assignmentId points at the legacy row
    // (positionId left NULL so the backfill has something to do).
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

    // AuditLog row typed ProjectAssignment, aggregateId = assignmentId.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog"
         ("id", "aggregateType", "aggregateId", "eventName",
          "payload", "createdAt")
         VALUES ($1::uuid, 'ProjectAssignment', $2::uuid,
                 'LEAN_P3_1_FIXTURE', '{}'::jsonb, NOW())`,
      auditLogId,
      assignmentId,
    );
  });

  it('nulls CaseRecord.relatedAssignmentId after run', async () => {
    const before = await prisma.$queryRawUnsafe<
      Array<{ relatedAssignmentId: string | null }>
    >(
      `SELECT "relatedAssignmentId" FROM "CaseRecord" WHERE "id" = $1::uuid`,
      caseRecordId,
    );
    expect(before[0].relatedAssignmentId).toBe(assignmentId);

    await runMigration();

    const after = await prisma.$queryRawUnsafe<
      Array<{ relatedAssignmentId: string | null }>
    >(
      `SELECT "relatedAssignmentId" FROM "CaseRecord" WHERE "id" = $1::uuid`,
      caseRecordId,
    );
    expect(after[0].relatedAssignmentId).toBeNull();
  });

  it('populates rate_card_entries.pinnedPositions with the lean-mapped snapshot', async () => {
    await runMigration();

    const rows = await prisma.$queryRawUnsafe<
      Array<{ pinnedPositions: Array<Record<string, unknown>> }>
    >(
      `SELECT "pinnedPositions" FROM "rate_card_entries" WHERE "id" = $1::uuid`,
      rateCardEntryId,
    );
    const pins = rows[0].pinnedPositions;
    expect(Array.isArray(pins)).toBe(true);
    expect(pins.length).toBe(1);
    expect(pins[0]).toMatchObject({
      assignmentId,
      positionId,
      role: 'Engineer',
    });
  });

  it('backfills timesheet_entries.positionId from assignmentId via legacyAssignmentId', async () => {
    const before = await prisma.$queryRawUnsafe<
      Array<{ positionId: string | null }>
    >(
      `SELECT "positionId" FROM "timesheet_entries" WHERE "id" = $1::text`,
      timesheetEntryId,
    );
    expect(before[0].positionId).toBeNull();

    await runMigration();

    const after = await prisma.$queryRawUnsafe<
      Array<{ positionId: string | null }>
    >(
      `SELECT "positionId" FROM "timesheet_entries" WHERE "id" = $1::text`,
      timesheetEntryId,
    );
    expect(after[0].positionId).toBe(positionId);
  });

  it('migrates AuditLog rows from ProjectAssignment → ProjectPosition when aggregateId resolves', async () => {
    await runMigration();

    const rows = await prisma.$queryRawUnsafe<
      Array<{ aggregateType: string; aggregateId: string }>
    >(
      `SELECT "aggregateType", "aggregateId" FROM "AuditLog" WHERE "id" = $1::uuid`,
      auditLogId,
    );
    expect(rows[0].aggregateType).toBe('ProjectPosition');
    expect(rows[0].aggregateId).toBe(positionId);
  });

  it('is idempotent — re-running produces zero net changes', async () => {
    await runMigration();
    const snapshotAfterFirst = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT "id", "relatedAssignmentId"
         FROM "CaseRecord" WHERE "id" = $1::uuid`,
      caseRecordId,
    );
    const auditFirst = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT "aggregateType", "aggregateId"
         FROM "AuditLog" WHERE "id" = $1::uuid`,
      auditLogId,
    );

    await runMigration();
    const snapshotAfterSecond = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT "id", "relatedAssignmentId"
         FROM "CaseRecord" WHERE "id" = $1::uuid`,
      caseRecordId,
    );
    const auditSecond = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT "aggregateType", "aggregateId"
         FROM "AuditLog" WHERE "id" = $1::uuid`,
      auditLogId,
    );

    expect(snapshotAfterSecond).toEqual(snapshotAfterFirst);
    expect(auditSecond).toEqual(auditFirst);
  });
});

// When the live-DB suite is skipped (no DATABASE_URL set), still keep a
// trivial assertion so the file shows up in jest output instead of empty.
if (!hasDb) {
  describe('LEAN-P3-1 data fixup (DB suite skipped)', () => {
    it('migration.sql exists at the expected path', () => {
      expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
      expect(fs.statSync(MIGRATION_PATH).size).toBeGreaterThan(0);
    });
  });
}
