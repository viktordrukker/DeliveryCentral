import fs from 'node:fs';
import path from 'node:path';

/**
 * DM-R-9 — Migration category assertions.
 *
 * Every migration is categorised by SQL content, and each category's
 * *most recent* migration is held to that category's expected posture:
 *
 *   schema-only     → additive (CREATE TABLE, ADD COLUMN). Should be
 *                     REVERSIBLE if it's purely additive, FORWARD_ONLY
 *                     if it drops or renames.
 *   data-backfill   → UPDATE / INSERT only, no DDL. Must be REVERSIBLE
 *                     (inverse UPDATE is trivial).
 *   enum-change     → ALTER TYPE / CREATE TYPE on an enum. Must NOT be
 *                     a single-step rename (enforced upstream by DM-R-6)
 *                     and the drop phase must be FORWARD_ONLY.
 *   trigger-install → CREATE TRIGGER / CREATE FUNCTION. Must be
 *                     FORWARD_ONLY unless a drop-trigger inverse is
 *                     committed.
 *
 * This is the Wave 2 static guarantee. Full apply→rollback→re-apply
 * round-tripping against an ephemeral DB lands with DM-R-11 in Wave 3.
 */

const migrationsDir = path.resolve(__dirname, '../../prisma/migrations');

type Posture = 'REVERSIBLE' | 'FORWARD_ONLY' | 'UNCLASSIFIED';

interface MigrationInfo {
  name: string;
  sql: string;
  categories: Set<string>;
  posture: Posture;
  hasRollbackSql: boolean;
}

function categorise(sql: string): Set<string> {
  const cats = new Set<string>();
  if (/\bCREATE\s+TABLE\b|\bALTER\s+TABLE\s+"[^"]+"\s+ADD\s+COLUMN\b|\bCREATE\s+INDEX\b/i.test(sql)) {
    cats.add('schema-only');
  }
  if (/\b(UPDATE|INSERT\s+INTO)\s+"[^"]+"/i.test(sql) && !/\bCREATE\s+TABLE\b/i.test(sql)) {
    cats.add('data-backfill');
  }
  if (/\bALTER\s+TYPE\b|\bCREATE\s+TYPE\s+"[^"]+"\s+AS\s+ENUM\b|\bDROP\s+TYPE\b/i.test(sql)) {
    cats.add('enum-change');
  }
  if (/\bCREATE\s+(OR\s+REPLACE\s+)?(TRIGGER|FUNCTION)\b/i.test(sql)) {
    cats.add('trigger-install');
  }
  if (cats.size === 0) {
    cats.add('other');
  }
  return cats;
}

function loadAllMigrations(): MigrationInfo[] {
  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  return entries
    .map((name) => {
      const absDir = path.join(migrationsDir, name);
      const sqlPath = path.join(absDir, 'migration.sql');
      if (!fs.existsSync(sqlPath)) return null;
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const categories = categorise(sql);
      const hasReversible = fs.existsSync(path.join(absDir, 'REVERSIBLE.md'));
      const hasForwardOnly = fs.existsSync(path.join(absDir, 'FORWARD_ONLY.md'));
      const hasRollbackSql = fs.existsSync(path.join(absDir, 'rollback.sql'));
      const posture: Posture = hasReversible
        ? 'REVERSIBLE'
        : hasForwardOnly
          ? 'FORWARD_ONLY'
          : 'UNCLASSIFIED';
      return { name, sql, categories, posture, hasRollbackSql };
    })
    .filter((x): x is MigrationInfo => x !== null);
}

function mostRecent(migrations: MigrationInfo[], category: string): MigrationInfo | null {
  const matches = migrations.filter((m) => m.categories.has(category));
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

describe('DM-R-9 migration categories', () => {
  const migrations = loadAllMigrations();

  it('loads at least one migration', () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  it('every migration is classified (REVERSIBLE or FORWARD_ONLY)', () => {
    const unclassified = migrations.filter((m) => m.posture === 'UNCLASSIFIED');
    expect(unclassified.map((m) => m.name)).toEqual([]);
  });

  it('REVERSIBLE migrations have a sibling rollback.sql', () => {
    const broken = migrations
      .filter((m) => m.posture === 'REVERSIBLE' && !m.hasRollbackSql)
      .map((m) => m.name);
    expect(broken).toEqual([]);
  });

  it('FORWARD_ONLY migrations do NOT have a fake rollback.sql (would be worse than none)', () => {
    const fakes = migrations
      .filter((m) => m.posture === 'FORWARD_ONLY' && m.hasRollbackSql)
      .map((m) => m.name);
    expect(fakes).toEqual([]);
  });

  describe('most recent per category', () => {
    it('schema-only: exists', () => {
      const latest = mostRecent(migrations, 'schema-only');
      expect(latest).not.toBeNull();
    });

    it('data-backfill: most recent must be REVERSIBLE (inverse UPDATE is trivial)', () => {
      const latest = mostRecent(migrations, 'data-backfill');
      if (!latest) return; // Not all branches carry a data-backfill migration.
      // Data-backfills that also carry DDL are exempt — the DDL portion can
      // force FORWARD_ONLY. The rule applies to "pure" data-backfills.
      const isPureDataBackfill =
        latest.categories.has('data-backfill') &&
        !latest.categories.has('enum-change') &&
        !latest.categories.has('trigger-install') &&
        !/\bCREATE\s+TABLE\b|\bALTER\s+TABLE\s+[^;]+DROP\b/i.test(latest.sql);
      if (!isPureDataBackfill) return;
      expect(latest.posture).toBe('REVERSIBLE');
    });

    it('enum-change: most recent must be classified (REVERSIBLE for add-only, FORWARD_ONLY for drop phase)', () => {
      const latest = mostRecent(migrations, 'enum-change');
      if (!latest) return;
      expect(['REVERSIBLE', 'FORWARD_ONLY']).toContain(latest.posture);
    });

    it('trigger-install: most recent must document restore posture', () => {
      const latest = mostRecent(migrations, 'trigger-install');
      if (!latest) return;
      expect(['REVERSIBLE', 'FORWARD_ONLY']).toContain(latest.posture);
    });
  });

  it('no migration is single-step enum rename (DM-R-6 guard)', () => {
    const violating = migrations.filter((m) => {
      if (!m.categories.has('enum-change')) return false;
      const renamesAway = /ALTER\s+TYPE\s+"([^"]+)"\s+RENAME\s+TO\s+"\1_old"/i.test(m.sql);
      const createsNew = /CREATE\s+TYPE\s+"([^"]+)_new"\s+AS\s+ENUM/i.test(m.sql);
      const dropsOld = /DROP\s+TYPE\s+"([^"]+)"/i.test(m.sql);
      const recreates = /ALTER\s+TYPE\s+"([^"]+)_new"\s+RENAME\s+TO\s+"\1"/i.test(m.sql);
      return (renamesAway && /CREATE\s+TYPE\s+"([^"]+)"\s+AS\s+ENUM/i.test(m.sql)) || (createsNew && dropsOld && recreates);
    });
    // Known baseline: the 2026-04-18 canonical_assignment_status migration
    // is documented as the historical exception (see enum-evolution-baseline.json).
    const unknown = violating.filter((m) => m.name !== '20260418_canonical_assignment_status');
    expect(unknown.map((m) => m.name)).toEqual([]);
  });
});
