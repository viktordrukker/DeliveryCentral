#!/usr/bin/env node
/**
 * Fresh-seed gate (issue 721 / PR-18).
 *
 * Runs after `SEED_PROFILE=it-company prisma/seed.ts` against a freshly-migrated
 * ephemeral Postgres in CI. Asserts the core aggregates seeded a non-zero number
 * of rows. The June 2026 seed crash shipped invisibly because no CI job ever ran
 * a true fresh-DB seed — this script makes that class of regression a hard fail.
 *
 * Exit code 0 = every required model has rows. Non-zero = a model is empty
 * (seed crashed or silently produced nothing) and the build fails.
 */

const { PrismaClient } = require('@prisma/client');

const REQUIRED_MODELS = [
  { name: 'Person', count: (p) => p.person.count() },
  { name: 'Project', count: (p) => p.project.count() },
  { name: 'ProjectPosition', count: (p) => p.projectPosition.count() },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const results = await Promise.all(
      REQUIRED_MODELS.map(async (m) => ({ name: m.name, rows: await m.count(prisma) })),
    );

    const empty = results.filter((r) => r.rows <= 0);
    for (const r of results) {
      console.log(`${r.rows > 0 ? '✓' : '✗'} ${r.name}: ${r.rows} rows`);
    }

    if (empty.length > 0) {
      console.error(
        `::error::Fresh seed produced 0 rows for: ${empty
          .map((r) => r.name)
          .join(', ')}. The it-company seed crashed or silently produced nothing.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log('✓ Fresh it-company seed populated all required aggregates.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`::error::Seed row-count assertion failed: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
