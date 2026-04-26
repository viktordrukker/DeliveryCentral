#!/usr/bin/env node

/**
 * DM-R-6 — `enum-single-step-rename` lint.
 *
 * Rejects any migration.sql that both ADDS and REMOVES enum values.
 * This is the single pattern that caused the 2026-04-18 outage (a 5→9
 * AssignmentStatus rename landed in one file). See
 * docs/planning/enum-evolution-playbook.md for the 4-migration pattern.
 *
 * Detection (regex; SQL parsing is overkill here — the patterns are
 * unambiguous):
 *
 *   ADD markers:
 *     - ALTER TYPE "<name>" ADD VALUE …
 *     - CREATE TYPE "<name>" AS ENUM (…) where a prior migration created
 *       the same type (approximated by name collision across files)
 *
 *   REMOVE markers:
 *     - ALTER TYPE "<name>" RENAME TO "<name>_old"
 *     - DROP TYPE "<name>_old"
 *     - A CREATE TYPE "<name>" AS ENUM (…) that re-declares a type this
 *       migration has just renamed away
 *
 * A migration that contains BOTH an ADD-marker AND a REMOVE-marker for
 * the same type name FAILS. That is the 2026-04-18 shape.
 *
 * Bypass: first-line comment `-- ALLOW_SINGLE_STEP_ENUM: <justification>`.
 * Emergency only; pairs with DM-R-29 two-person rule in the future.
 *
 * Exit code: 0 clean, 1 on any single-step rename.
 */

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'prisma', 'migrations');
const baselinePath = path.join(__dirname, 'enum-evolution-baseline.json');

const RE_ADD_VALUE = /ALTER\s+TYPE\s+"([^"]+)"\s+ADD\s+VALUE\b/gi;
const RE_RENAME_OLD = /ALTER\s+TYPE\s+"([^"]+)"\s+RENAME\s+TO\s+"([^"]+)"/gi;
const RE_DROP_TYPE = /DROP\s+TYPE\s+"([^"]+)"/gi;
const RE_CREATE_ENUM = /CREATE\s+TYPE\s+"([^"]+)"\s+AS\s+ENUM\s*\(/gi;
const RE_ALLOW_HEADER = /^\s*--\s*ALLOW_SINGLE_STEP_ENUM:/m;

function die(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

function scan(sql, file) {
  const adds = new Set();
  const drops = new Set();

  // ADD VALUE to an existing type.
  for (const m of sql.matchAll(RE_ADD_VALUE)) adds.add(m[1]);

  // RENAME TO <name>_old is the canonical drop dance.
  // The inverse variant "CREATE <name>_new + DROP <name> + RENAME <name>_new TO <name>"
  // is equivalently a single-step replacement — both paths are captured below.
  const renamedAway = new Map(); // canonical name -> alias
  const renamedBack = new Map(); // alias -> canonical name
  for (const m of sql.matchAll(RE_RENAME_OLD)) {
    const from = m[1];
    const to = m[2];
    if (to === `${from}_old`) {
      renamedAway.set(from, to);
      drops.add(from);
    }
    if (from === `${to}_new`) {
      // "_new RENAME TO canonical" — the canonical name is being adopted.
      renamedBack.set(from, to);
      adds.add(to);
    }
  }

  // DROP TYPE is always a drop signal (strip `_old` / `_new` aliases).
  for (const m of sql.matchAll(RE_DROP_TYPE)) {
    const name = m[1].replace(/_old$/, '').replace(/_new$/, '');
    drops.add(name);
  }

  // CREATE TYPE "X" AS ENUM — two cases count as an ADD:
  //   (a) the file already renamed "X" away (classic recreation).
  //   (b) the name is an "<X>_new" alias that will RENAME TO canonical later.
  for (const m of sql.matchAll(RE_CREATE_ENUM)) {
    const name = m[1];
    if (renamedAway.has(name)) {
      adds.add(name);
    }
    if (name.endsWith('_new')) {
      adds.add(name.slice(0, -'_new'.length));
    }
  }

  const overlap = [...adds].filter((t) => drops.has(t));
  return overlap;
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const out = new Set();
    for (const entry of raw.exempt || []) {
      out.add(`${entry.migration}::${entry.type}`);
    }
    return out;
  } catch (err) {
    die(`baseline file is malformed: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  if (!fs.existsSync(migrationsDir)) {
    die(`migrations dir not found: ${migrationsDir}`);
    process.exit(1);
  }

  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const baseline = loadBaseline();
  const violations = [];

  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, 'utf8');

    if (RE_ALLOW_HEADER.test(sql)) continue;

    const offending = scan(sql, sqlPath);
    for (const type of offending) {
      const key = `${dir}::${type}`;
      if (baseline.has(key)) continue;
      violations.push(
        `${dir}/migration.sql: enum "${type}" is ADDED and REMOVED in the same migration — split into 4 steps per docs/planning/enum-evolution-playbook.md`,
      );
    }
  }

  if (violations.length > 0) {
    console.error(`\nDM-R-6: ${violations.length} single-step enum rename(s) detected:\n`);
    for (const v of violations) die(v);
    console.error(
      `\nBypass (emergency only): prepend migration.sql with "-- ALLOW_SINGLE_STEP_ENUM: <justification>"`,
    );
    process.exit(1);
  }

  console.log(`\x1b[32m✓\x1b[0m DM-R-6: no single-step enum renames across ${dirs.length} migrations.`);
  process.exit(0);
}

main();
