#!/usr/bin/env node

/**
 * DM-R-4 — Migration classification lint.
 *
 * Every migration directory under prisma/migrations/ must declare its
 * rollback posture by containing exactly ONE of:
 *
 *   REVERSIBLE.md    → sibling rollback.sql is required and tested
 *   FORWARD_ONLY.md  → rollback requires restore from a pre-migration
 *                      snapshot (DM-R-3 flow: scripts/db-restore.sh)
 *
 * Rules enforced:
 *   1. Exactly one of {REVERSIBLE.md, FORWARD_ONLY.md} per migration dir.
 *   2. REVERSIBLE.md → rollback.sql MUST exist and be non-empty.
 *   3. FORWARD_ONLY.md → rollback.sql MUST NOT exist (a fake rollback is
 *      worse than none — runs cleanly and silently loses data).
 *   4. The canonical prisma/migrations/migration_lock.toml is ignored.
 *
 * Exit code: 0 on clean, 1 on any violation.
 *
 * Rationale: classification surfaces operational reality. Untested
 * rollback.sql files masquerading as reversible are the failure mode
 * DM-R-4 prevents.
 */

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'prisma', 'migrations');

function die(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function main() {
  if (!fs.existsSync(migrationsDir)) {
    die(`migrations dir not found: ${migrationsDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  if (dirs.length === 0) {
    die('no migration directories found');
    process.exit(1);
  }

  const violations = [];

  for (const dir of dirs) {
    const abs = path.join(migrationsDir, dir);
    const hasReversible = fs.existsSync(path.join(abs, 'REVERSIBLE.md'));
    const hasForwardOnly = fs.existsSync(path.join(abs, 'FORWARD_ONLY.md'));
    const hasRollback = fs.existsSync(path.join(abs, 'rollback.sql'));
    const hasMigration = fs.existsSync(path.join(abs, 'migration.sql'));

    if (!hasMigration) {
      violations.push(`${dir}: missing migration.sql (not a valid migration dir?)`);
      continue;
    }

    if (hasReversible && hasForwardOnly) {
      violations.push(`${dir}: has BOTH REVERSIBLE.md and FORWARD_ONLY.md — pick one`);
      continue;
    }

    if (!hasReversible && !hasForwardOnly) {
      violations.push(`${dir}: missing classification marker (add REVERSIBLE.md or FORWARD_ONLY.md)`);
      continue;
    }

    if (hasReversible) {
      if (!hasRollback) {
        violations.push(`${dir}: REVERSIBLE.md requires a sibling rollback.sql`);
        continue;
      }
      const rollbackSize = fs.statSync(path.join(abs, 'rollback.sql')).size;
      if (rollbackSize === 0) {
        violations.push(`${dir}: rollback.sql is empty`);
        continue;
      }
    }

    if (hasForwardOnly) {
      if (hasRollback) {
        violations.push(
          `${dir}: FORWARD_ONLY.md + rollback.sql is a trap — a fake rollback that silently loses data is worse than none. Delete rollback.sql or flip to REVERSIBLE.md.`,
        );
        continue;
      }
      const forwardOnlySize = fs.statSync(path.join(abs, 'FORWARD_ONLY.md')).size;
      if (forwardOnlySize < 50) {
        violations.push(
          `${dir}: FORWARD_ONLY.md must document the restore procedure (min ~50 chars; reference scripts/db-restore.sh).`,
        );
        continue;
      }
    }
  }

  if (violations.length > 0) {
    console.error(`\nDM-R-4: ${violations.length} migration(s) fail classification:\n`);
    for (const v of violations) {
      die(v);
    }
    console.error(`\nFix: add REVERSIBLE.md (with rollback.sql) or FORWARD_ONLY.md (documenting restore flow) to each directory above.`);
    process.exit(1);
  }

  ok(`DM-R-4: all ${dirs.length} migrations classified cleanly.`);
  process.exit(0);
}

main();
