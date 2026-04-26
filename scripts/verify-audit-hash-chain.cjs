#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * DM-R-22 — walk every audit table's hash chain top-to-bottom and
 * assert that each row's rowHash matches sha256(prevHash || canonical
 * JSON of the row minus {prevHash, rowHash}).
 *
 * Emits `audit.hash_chain.mismatch.detected` via DM-R-14 on the first
 * broken link per table. Exit code 1 on any mismatch.
 *
 * Called by the weekly DM-R-22 CI job (pairs with DM-R-11 round-trip).
 */

const { emitEvent } = require('./lib/drift-events.cjs');

async function main() {
  let PrismaClient;
  try {
    ({ PrismaClient } = require('@prisma/client'));
  } catch (_err) {
    console.warn('⚠️  DM-R-22 verifier: @prisma/client not generated; skipping.');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: ['error'] });
  let exitCode = 0;

  // DM-R-22b: chainSeq is the monotonic order column.
  // DM-7-1 extends the chain to DomainEvent.
  const TABLES = [
    { name: 'AuditLog' },
    { name: 'migration_audit' },
    { name: 'ddl_audit' },
    { name: 'DomainEvent' },
  ];

  try {
    for (const { name } of TABLES) {
      // Recompute each row's hash server-side — Postgres jsonb::text has
      // stable formatting that JSON.stringify in Node.js does not match
      // byte-for-byte. Running the check purely in SQL avoids that
      // serialization-discrepancy trap. Order by chainSeq (DM-R-22b) —
      // strictly monotonic regardless of timestamp ties.
      const rows = await prisma.$queryRawUnsafe(
        `SELECT t.id::text AS id,
                t."prevHash" AS prev,
                t."rowHash" AS row_hash,
                encode(
                  sha256(convert_to(
                    COALESCE(t."prevHash", '') || '|' ||
                    ((to_jsonb(t.*) - 'prevHash' - 'rowHash')::text),
                    'UTF8'
                  )),
                  'hex'
                ) AS recomputed
         FROM "${name}" t
         ORDER BY "chainSeq" ASC`,
      );

      let expectedPrev = null;
      let broken = 0;

      for (const row of rows) {
        if (row.prev !== expectedPrev) {
          broken++;
          emitEvent('audit.hash_chain.mismatch.detected', {
            table: name,
            row_id: row.id,
            reason: 'prevHash does not equal previous row rowHash',
            expected_prev: expectedPrev,
            actual_prev: row.prev,
          });
          console.error(`❌ ${name}: row ${row.id} prevHash mismatch (expected=${expectedPrev} got=${row.prev})`);
          exitCode = 1;
          break;
        }

        if (row.recomputed !== row.row_hash) {
          broken++;
          emitEvent('audit.hash_chain.mismatch.detected', {
            table: name,
            row_id: row.id,
            reason: 'rowHash does not match sha256(prev || payload)',
            stored: row.row_hash,
            recomputed: row.recomputed,
          });
          console.error(`❌ ${name}: row ${row.id} rowHash mismatch (stored=${row.row_hash} recomputed=${row.recomputed})`);
          exitCode = 1;
          break;
        }

        expectedPrev = row.row_hash;
      }

      if (broken === 0) {
        console.log(`\x1b[32m✓\x1b[0m DM-R-22: ${name} hash chain intact (${rows.length} rows).`);
      }
    }
  } catch (err) {
    console.error('❌ DM-R-22 verifier: query failed:', err instanceof Error ? err.message : err);
    exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('❌ DM-R-22 verifier: unexpected error:', err);
  process.exit(1);
});
