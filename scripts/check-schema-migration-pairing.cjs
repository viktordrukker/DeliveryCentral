#!/usr/bin/env node

/**
 * DM-R-5 — schema.prisma / migration pairing check.
 *
 * If a commit (staged diff vs HEAD) modifies prisma/schema.prisma, the same
 * commit MUST also stage a NEW migration directory under prisma/migrations/.
 * The inverse is not enforced (a pure data migration can land without a
 * schema.prisma change).
 *
 * Run as a husky pre-commit hook (see .husky/pre-commit). It inspects the
 * staged diff via `git diff --cached --name-status --diff-filter=AMR`.
 *
 * Escape hatch: set `SKIP_SCHEMA_MIGRATION_CHECK=true` for the rare case
 * where you're fixing a whitespace comment in schema.prisma; the safer
 * default is to fail loudly.
 *
 * Exit code: 0 if paired (or no schema change), 1 if schema changed
 * without a new migration directory.
 */

const { execSync } = require('node:child_process');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function main() {
  if (process.env.SKIP_SCHEMA_MIGRATION_CHECK === 'true') {
    console.warn('⚠️  SKIP_SCHEMA_MIGRATION_CHECK=true — pairing check bypassed.');
    return;
  }

  let staged;
  try {
    staged = run('git diff --cached --name-status --diff-filter=ACMR');
  } catch (err) {
    // Not in a git repo or no staged changes — nothing to check.
    return;
  }

  if (!staged) return;

  const lines = staged.split('\n').filter(Boolean);
  const touchedSchema = lines.some((l) => /\bprisma\/schema\.prisma\b/.test(l));

  if (!touchedSchema) return;

  // A "new migration" = any file added (A) under a new prisma/migrations/<timestamp>_<name>/ directory.
  const newMigrationDirs = new Set();
  for (const line of lines) {
    const [status, ...rest] = line.split('\t');
    const filePath = rest[rest.length - 1];
    if (status === 'A' && /^prisma\/migrations\/[^/]+\//.test(filePath)) {
      const dir = filePath.split('/').slice(0, 3).join('/');
      newMigrationDirs.add(dir);
    }
  }

  if (newMigrationDirs.size === 0) {
    console.error('\n\x1b[31m✗ DM-R-5: prisma/schema.prisma was edited but no new migration directory was staged.\x1b[0m');
    console.error('  Every schema.prisma change needs a migration (use `npm run db:migrate:safe:dev`).');
    console.error('  If this is genuinely a no-op (comment/whitespace only), re-run with:');
    console.error('    SKIP_SCHEMA_MIGRATION_CHECK=true git commit ...');
    process.exit(1);
  }

  console.log(`✓ DM-R-5: schema.prisma change paired with ${[...newMigrationDirs].join(', ')}`);
}

main();
