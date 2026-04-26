#!/usr/bin/env node

/**
 * DM-R-10 — post-seed verifier.
 *
 * Reads scripts/seed-manifest.json, queries Postgres for the actual row
 * counts per aggregate, and fails if anything differs from the expected
 * count for the given profile. Fastest way to notice a seed that
 * silently lost rows to a half-applied transaction, a broken
 * createMany, or a migration that changed a table's semantics.
 *
 * Usage:
 *   node scripts/verify-seed.cjs phase2
 *   node scripts/verify-seed.cjs phase2 --refresh   (rewrites the manifest
 *                                                    with current counts — use
 *                                                    only after intentional data changes)
 *
 * Uses docker compose postgres (same strategy as db-snapshot.sh / record-
 * migration-audit.sh) so it has no host dependency beyond the docker CLI.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'seed-manifest.json');

function die(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

function loadManifest() {
  if (!fs.existsSync(manifestPath)) {
    die(`manifest missing: ${manifestPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function countRows(table) {
  // Double-quote the identifier so mixed-case names (Person, OrgUnit) work.
  const sql = `SELECT count(*) FROM "${table.replace(/"/g, '""')}";`;
  try {
    const out = execSync(
      `docker compose -f ${rootDir}/docker-compose.yml exec -T postgres psql -U postgres -d workload_tracking -tAc ${JSON.stringify(sql)}`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
    return Number.parseInt(out, 10);
  } catch (err) {
    return NaN;
  }
}

function main() {
  const profile = process.argv[2];
  const refresh = process.argv.includes('--refresh');

  if (!profile) {
    die('usage: node scripts/verify-seed.cjs <profile> [--refresh]');
    process.exit(1);
  }

  const manifest = loadManifest();
  const profileEntry = manifest.profiles[profile];
  if (!profileEntry) {
    die(`profile "${profile}" not in manifest. Known: ${Object.keys(manifest.profiles).join(', ')}`);
    process.exit(1);
  }

  const expected = profileEntry.aggregates;
  const actual = {};
  for (const table of Object.keys(expected)) {
    actual[table] = countRows(table);
  }

  if (refresh) {
    profileEntry.aggregates = actual;
    profileEntry._captured_at = new Date().toISOString();
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`\x1b[32m✓\x1b[0m DM-R-10: manifest refreshed for profile "${profile}".`);
    process.exit(0);
  }

  const mismatches = [];
  for (const [table, exp] of Object.entries(expected)) {
    const got = actual[table];
    if (Number.isNaN(got)) {
      mismatches.push(`${table}: could not count (table missing or DB unreachable)`);
      continue;
    }
    if (got !== exp) {
      mismatches.push(`${table}: expected=${exp} actual=${got}`);
    }
  }

  if (mismatches.length > 0) {
    console.error(`\nDM-R-10: seed verification FAILED for profile "${profile}" (${mismatches.length} mismatch(es)):\n`);
    for (const m of mismatches) die(m);
    console.error(
      `\nIf these differences are intentional (seed data evolved), update the manifest:\n  node scripts/verify-seed.cjs ${profile} --refresh`,
    );
    process.exit(1);
  }

  console.log(`\x1b[32m✓\x1b[0m DM-R-10: all ${Object.keys(expected).length} counts match for profile "${profile}".`);
  process.exit(0);
}

main();
