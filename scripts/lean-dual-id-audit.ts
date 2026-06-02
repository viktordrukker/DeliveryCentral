#!/usr/bin/env ts-node
/**
 * LEAN-P0-3 — dual-ID hazard audit runner.
 *
 * Runs the four read-only SQL probes documented in
 * docs/planning/lean-dual-id-hazards.md and surfaces rows that would
 * block the Phase 3 lean migration (drop of the legacy ProjectAssignment
 * + StaffingRequest family).
 *
 * The same SQL lives in scripts/lean-dual-id-audit.sql for psql /
 * operator use; this runner is the canonical entry point for CI gates
 * and the LEAN-P3 cutover runbook.
 *
 * Usage:
 *   docker compose exec backend sh -c \
 *     "npx ts-node --transpile-only --project tsconfig.json scripts/lean-dual-id-audit.ts"
 *
 *   pnpm tsx scripts/lean-dual-id-audit.ts   (alternative runner)
 *
 * Exit code:
 *   0 — every probe returned 0 violations (no AT-RISK rows)
 *   1 — at least one probe returned > 0 violations (hazards present)
 *   2 — unhandled runtime error
 *
 * Output (one line per probe):
 *   "ok    <probe_name> count=0"
 *   "FAIL  <probe_name> count=<n> sample=<id>"
 *
 * Read-only. No writes. No deletions.
 */

import { PrismaClient } from '@prisma/client';

export interface DualIdAudit {
  /** Stable identifier referenced in CI logs, the hazard doc, and the SQL file. */
  name: string;
  /** Index of the underlying hazard (1..4) per docs/planning/lean-dual-id-hazards.md. */
  hazard: 1 | 2 | 3 | 4;
  /** Human description for the operator. */
  description: string;
  /**
   * Single SQL statement returning a single row of the shape
   * `{ violation_count: bigint|number, sample_id: string|null }`.
   * Mirrors the corresponding block in scripts/lean-dual-id-audit.sql.
   */
  sql: string;
}

/**
 * Build the static audit list. Exposed so the unit test can assert the
 * generated SQL is well-formed without hitting a live database.
 *
 * Probe order is stable and matches scripts/lean-dual-id-audit.sql top
 * to bottom.
 */
export function buildAudits(): DualIdAudit[] {
  return [
    {
      name: 'staffing_request_id_promotion_ready',
      hazard: 1,
      description:
        'StaffingRequest rows missing `id_new` block the Phase-3 swap that promotes id_new into the canonical PK slot.',
      sql: `
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT id FROM "staffing_requests" WHERE "id_new" IS NULL LIMIT 1) AS sample_id
        FROM "staffing_requests"
        WHERE "id_new" IS NULL;
      `,
    },
    {
      name: 'staffing_request_fulfilment_id_promotion_ready',
      hazard: 2,
      description:
        'StaffingRequestFulfilment rows missing `id_new` block the Phase-3 swap on the fulfilment table.',
      sql: `
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT id FROM "staffing_request_fulfilments" WHERE "id_new" IS NULL LIMIT 1) AS sample_id
        FROM "staffing_request_fulfilments"
        WHERE "id_new" IS NULL;
      `,
    },
    {
      name: 'timesheet_entry_assignment_orphan_check',
      hazard: 3,
      description:
        'TimesheetEntry rows whose assignmentId points at a ProjectAssignment with no ProjectPosition mirror — these will lose their staffing link in Phase 3.',
      sql: `
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT te.id
             FROM "timesheet_entries" te
             WHERE te."assignmentId" IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM "ProjectPosition" pp
                 WHERE pp."legacyAssignmentId"::text = te."assignmentId"
               )
             LIMIT 1) AS sample_id
        FROM "timesheet_entries" te
        WHERE te."assignmentId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "ProjectPosition" pp
            WHERE pp."legacyAssignmentId"::text = te."assignmentId"
          );
      `,
    },
    {
      name: 'case_record_assignment_orphan_check',
      hazard: 4,
      description:
        'CaseRecord rows whose relatedAssignmentId points at a ProjectAssignment with no ProjectPosition mirror — these will lose their staffing link in Phase 3.',
      sql: `
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT cr.id
             FROM "CaseRecord" cr
             WHERE cr."relatedAssignmentId" IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM "ProjectPosition" pp
                 WHERE pp."legacyAssignmentId" = cr."relatedAssignmentId"
               )
             LIMIT 1) AS sample_id
        FROM "CaseRecord" cr
        WHERE cr."relatedAssignmentId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "ProjectPosition" pp
            WHERE pp."legacyAssignmentId" = cr."relatedAssignmentId"
          );
      `,
    },
  ];
}

interface AuditResult {
  name: string;
  hazard: 1 | 2 | 3 | 4;
  violationCount: number;
  sampleId: string | null;
  error: string | null;
}

async function runAudit(
  prisma: PrismaClient,
  audit: DualIdAudit,
): Promise<AuditResult> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ violation_count: bigint | number | null; sample_id: string | null }>
    >(audit.sql);
    const head = rows[0] ?? { violation_count: 0, sample_id: null };
    const raw = head.violation_count ?? 0;
    const violationCount = typeof raw === 'bigint' ? Number(raw) : raw;
    return {
      name: audit.name,
      hazard: audit.hazard,
      violationCount,
      sampleId: head.sample_id ?? null,
      error: null,
    };
  } catch (e) {
    return {
      name: audit.name,
      hazard: audit.hazard,
      violationCount: 0,
      sampleId: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ log: ['error'] });
  const audits = buildAudits();
  const results: AuditResult[] = [];

  for (const audit of audits) {
    results.push(await runAudit(prisma, audit));
  }

  let failures = 0;
  let errors = 0;

  for (const r of results) {
    if (r.error) {
      errors++;
      console.error(`ERROR ${r.name} (hazard ${r.hazard}) — ${r.error}`);
      continue;
    }
    if (r.violationCount === 0) {
      console.log(`ok    ${r.name} (hazard ${r.hazard}) count=0`);
    } else {
      failures++;
      console.log(
        `FAIL  ${r.name} (hazard ${r.hazard}) count=${r.violationCount} sample=${r.sampleId ?? '<null>'}`,
      );
    }
  }

  const summary =
    `\nSummary: ${failures} audit(s) failed, ${errors} error(s), ` +
    `${results.length - failures - errors} ok across ${results.length} audits.`;
  console.log(summary);

  await prisma.$disconnect();
  process.exit(failures > 0 || errors > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error(e);
    process.exit(2);
  });
}
