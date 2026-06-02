#!/usr/bin/env ts-node
/**
 * LEAN-P0-1 — lean migration readiness check.
 *
 * Runs five reconciliation queries that together determine whether the
 * `ProjectAssignment` + `StaffingRequest` family can be safely retired in
 * favor of the lean `ProjectPosition` aggregate. See
 * docs/planning/lean-data-shape-audit.md for the full column mapping.
 *
 * Usage:
 *   docker compose exec backend sh -c \
 *     "npx ts-node --transpile-only --project tsconfig.json scripts/lean-readiness-check.ts"
 *
 *   pnpm tsx scripts/lean-readiness-check.ts   (alternative runner)
 *
 * Exit code:
 *   0 — every probe returned 0 violations (ready)
 *   1 — at least one probe returned > 0 violations (not ready)
 *   2 — unhandled runtime error
 *
 * Output:
 *   One line per probe:
 *     "ok    <probe_name> count=0"
 *     "FAIL  <probe_name> count=<n> sample=<id>"
 *
 * No writes. No deletions. Read-only audit.
 */

import { PrismaClient } from '@prisma/client';

/**
 * The legacy → lean fillStatus mapping. Mirrors
 * `mapLegacyAssignmentStatus` in
 * src/modules/project-positions/domain/value-objects/position-fill-status.ts.
 * Kept inline here so the script is standalone (no @src imports).
 */
const LEGACY_TO_LEAN_STATUS: Record<string, string> = {
  DRAFT: 'DRAFT',
  CREATED: 'OPEN',
  PROPOSED: 'PROPOSED',
  IN_REVIEW: 'PROPOSED',
  REJECTED: 'RELEASED',
  BOOKED: 'BOOKED',
  ONBOARDING: 'ONBOARDING',
  ASSIGNED: 'ASSIGNED',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'RELEASED',
  CANCELLED: 'RELEASED',
  // Pre-CSW legacy values.
  REQUESTED: 'PROPOSED',
  APPROVED: 'BOOKED',
  ACTIVE: 'ASSIGNED',
  ENDED: 'RELEASED',
  REVOKED: 'RELEASED',
  ARCHIVED: 'RELEASED',
};

export interface ReadinessProbe {
  /** Stable identifier referenced in CI logs and the audit doc. */
  name: string;
  /** Human description for the operator. */
  description: string;
  /**
   * Single SQL statement returning rows of the shape
   * `{ violation_count: bigint|number, sample_id: string|null }`.
   * Implementations may use the second row to surface a sample id.
   */
  sql: string;
}

/**
 * Build the static probe list. Exposed so the unit test can assert the
 * generated SQL is well-formed without hitting a live database.
 *
 * The legacy → lean mapping is inlined into the SQL via VALUES so the
 * probe stays a single round-trip.
 */
export function buildProbes(): ReadinessProbe[] {
  const mappingValues = Object.entries(LEGACY_TO_LEAN_STATUS)
    .map(([legacy, lean]) => `('${legacy}', '${lean}')`)
    .join(', ');

  return [
    {
      name: 'assignment_backfill_completeness',
      description:
        'Every non-archived ProjectAssignment has a ProjectPosition mirror via legacyAssignmentId.',
      sql: `
        SELECT
          COUNT(*)::bigint  AS violation_count,
          (SELECT pa.id
             FROM "ProjectAssignment" pa
             WHERE pa."archivedAt" IS NULL
               AND NOT EXISTS (
                 SELECT 1 FROM "ProjectPosition" pp
                 WHERE pp."legacyAssignmentId" = pa.id::uuid
               )
             LIMIT 1) AS sample_id
        FROM "ProjectAssignment" pa
        WHERE pa."archivedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "ProjectPosition" pp
            WHERE pp."legacyAssignmentId" = pa.id::uuid
          );
      `,
    },
    {
      name: 'staffing_request_backfill_completeness',
      description:
        'Every staffing_requests row has at least one ProjectPosition with matching legacyStaffingRequestId.',
      sql: `
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT sr.id
             FROM "staffing_requests" sr
             WHERE NOT EXISTS (
               SELECT 1 FROM "ProjectPosition" pp
               WHERE pp."legacyStaffingRequestId" = sr.id::uuid
             )
             LIMIT 1) AS sample_id
        FROM "staffing_requests" sr
        WHERE NOT EXISTS (
          SELECT 1 FROM "ProjectPosition" pp
          WHERE pp."legacyStaffingRequestId" = sr.id::uuid
        );
      `,
    },
    {
      name: 'status_mapping_consistency',
      description:
        'For every mirrored pair, the lean fillStatus equals mapLegacyAssignmentStatus(legacyStatus).',
      sql: `
        WITH mapping(legacy, lean) AS (
          VALUES ${mappingValues}
        )
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT pa.id
             FROM "ProjectAssignment" pa
             JOIN "ProjectPosition" pp ON pp."legacyAssignmentId" = pa.id::uuid
             LEFT JOIN mapping m ON m.legacy = pa.status::text
             WHERE pa."archivedAt" IS NULL
               AND (m.lean IS NULL OR m.lean <> pp."fillStatus"::text)
             LIMIT 1) AS sample_id
        FROM "ProjectAssignment" pa
        JOIN "ProjectPosition" pp ON pp."legacyAssignmentId" = pa.id::uuid
        LEFT JOIN mapping m ON m.legacy = pa.status::text
        WHERE pa."archivedAt" IS NULL
          AND (m.lean IS NULL OR m.lean <> pp."fillStatus"::text);
      `,
    },
    {
      name: 'candidate_backfill_completeness',
      description:
        'Every StaffingRequestProposalCandidate is represented by a ProjectPositionCandidate (resolved via slate → SR id → position).',
      sql: `
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT src.id
             FROM "StaffingRequestProposalCandidate" src
             JOIN "StaffingRequestProposalSlate" srs ON srs.id = src."slateId"
             WHERE NOT EXISTS (
               SELECT 1
                 FROM "ProjectPosition" pp
                 JOIN "ProjectPositionCandidate" ppc ON ppc."positionId" = pp.id
                 WHERE pp."legacyStaffingRequestId" = srs."staffingRequestId"::uuid
                   AND ppc."candidatePersonId" = src."candidatePersonId"
             )
             LIMIT 1) AS sample_id
        FROM "StaffingRequestProposalCandidate" src
        JOIN "StaffingRequestProposalSlate" srs ON srs.id = src."slateId"
        WHERE NOT EXISTS (
          SELECT 1
            FROM "ProjectPosition" pp
            JOIN "ProjectPositionCandidate" ppc ON ppc."positionId" = pp.id
            WHERE pp."legacyStaffingRequestId" = srs."staffingRequestId"::uuid
              AND ppc."candidatePersonId" = src."candidatePersonId"
        );
      `,
    },
    {
      name: 'headcount_parity',
      description:
        'For each staffing_requests row, the number of mirrored positions is at least headcountRequired.',
      sql: `
        WITH per_sr AS (
          SELECT
            sr.id AS sr_id,
            sr."headcountRequired" AS required,
            (SELECT COUNT(*) FROM "ProjectPosition" pp
              WHERE pp."legacyStaffingRequestId" = sr.id::uuid) AS mirrored
          FROM "staffing_requests" sr
        )
        SELECT
          COUNT(*)::bigint AS violation_count,
          (SELECT sr_id FROM per_sr WHERE mirrored < required LIMIT 1) AS sample_id
        FROM per_sr
        WHERE mirrored < required;
      `,
    },
  ];
}

interface ProbeResult {
  name: string;
  violationCount: number;
  sampleId: string | null;
  error: string | null;
}

async function runProbe(
  prisma: PrismaClient,
  probe: ReadinessProbe,
): Promise<ProbeResult> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ violation_count: bigint | number | null; sample_id: string | null }>
    >(probe.sql);
    const head = rows[0] ?? { violation_count: 0, sample_id: null };
    const raw = head.violation_count ?? 0;
    const violationCount = typeof raw === 'bigint' ? Number(raw) : raw;
    return {
      name: probe.name,
      violationCount,
      sampleId: head.sample_id ?? null,
      error: null,
    };
  } catch (e) {
    return {
      name: probe.name,
      violationCount: 0,
      sampleId: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ log: ['error'] });
  const probes = buildProbes();
  const results: ProbeResult[] = [];

  for (const probe of probes) {
    results.push(await runProbe(prisma, probe));
  }

  let failures = 0;
  let errors = 0;

  for (const r of results) {
    if (r.error) {
      errors++;
      console.error(`ERROR ${r.name} — ${r.error}`);
      continue;
    }
    if (r.violationCount === 0) {
      console.log(`ok    ${r.name} count=0`);
    } else {
      failures++;
      console.log(
        `FAIL  ${r.name} count=${r.violationCount} sample=${r.sampleId ?? '<null>'}`,
      );
    }
  }

  const summary =
    `\nSummary: ${failures} probe(s) failed, ${errors} error(s), ` +
    `${results.length - failures - errors} ok across ${results.length} probes.`;
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
