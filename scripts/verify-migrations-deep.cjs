#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * DM-R-1 deep migration verifier (Layer 2).
 *
 * Runs additional DB-level checks that `prisma migrate status` does NOT perform:
 *
 *   • Half-applied rows: `_prisma_migrations` with
 *     `finished_at IS NULL AND rolled_back_at IS NULL`. Indicates a migration
 *     that crashed mid-apply; the DB is in an undefined state.
 *
 *   • Migration name monotonicity: the most-recently-`finished_at` row's name
 *     must be ≥ the alphabetically-latest migration directory name (Prisma
 *     names timestamps first). A mismatch means the DB advanced past the
 *     in-tree migrations — i.e. someone ran `prisma migrate deploy` on a
 *     branch whose migrations aren't in this checkout.
 *
 * Exit codes:
 *   0 — deep checks pass.
 *   1 — at least one deep check failed; see stderr for which.
 *
 * Fail-open: if the Prisma Client is not yet generated (fresh container boot),
 * the script prints a warning and exits 0. Layer 1 of the prestart verifier
 * (`prisma migrate status`) has already caught the cases that matter most.
 */

const fs = require('node:fs');
const path = require('node:path');
const { emitEvent } = require('./lib/drift-events.cjs');

async function main() {
  let PrismaClient;
  try {
    ({ PrismaClient } = require('@prisma/client'));
  } catch (_err) {
    console.warn('⚠️  DM-R-1 deep: @prisma/client not generated yet; skipping deep check.');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: ['error'] });
  let exitCode = 0;

  try {
    // Half-applied detection.
    const halfApplied = await prisma.$queryRawUnsafe(
      'SELECT migration_name, started_at FROM "_prisma_migrations" ' +
        'WHERE finished_at IS NULL AND rolled_back_at IS NULL',
    );
    if (Array.isArray(halfApplied) && halfApplied.length > 0) {
      console.error(
        `❌ DM-R-1 deep: ${halfApplied.length} half-applied migration(s) detected ` +
          '(finished_at IS NULL AND rolled_back_at IS NULL).',
      );
      for (const row of halfApplied) {
        console.error(`   - ${row.migration_name}  (started_at=${row.started_at.toISOString()})`);
        // DM-R-14: structured event per half-applied row.
        emitEvent('migration.half_applied.detected', {
          migration_name: row.migration_name,
          started_at: row.started_at.toISOString(),
        });
      }
      console.error(
        '   Remediation: investigate `_prisma_migrations`; either finalize the migration manually ' +
          'or UPDATE rolled_back_at = NOW() if it should be discarded.',
      );
      exitCode = 1;
    }

    // Name monotonicity.
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const directoryNames = fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      const latestOnDisk = directoryNames[directoryNames.length - 1];

      const latestAppliedRows = await prisma.$queryRawUnsafe(
        'SELECT migration_name FROM "_prisma_migrations" ' +
          'WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1',
      );
      const latestApplied = Array.isArray(latestAppliedRows) && latestAppliedRows[0]
        ? latestAppliedRows[0].migration_name
        : null;

      if (latestApplied && latestOnDisk && latestApplied > latestOnDisk) {
        console.error(
          `❌ DM-R-1 deep: DB is ahead of the migrations directory ` +
            `(applied=${latestApplied}, on-disk-latest=${latestOnDisk}). ` +
            'Someone ran `prisma migrate deploy` on a branch whose migrations are not in this checkout.',
        );
        // DM-R-14: structured event.
        emitEvent('migration.name.monotonicity.violation', {
          latest_applied: latestApplied,
          latest_on_disk: latestOnDisk,
        });
        exitCode = 1;
      }
    }
  } catch (err) {
    console.error('❌ DM-R-1 deep: query failed:', err instanceof Error ? err.message : err);
    exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('❌ DM-R-1 deep: unexpected error:', err);
  process.exit(1);
});
