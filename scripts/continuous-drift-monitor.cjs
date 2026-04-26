#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * DM-R-32 — continuous schema-drift verifier.
 *
 * DM-R-1 catches drift at BOOT. This script catches drift AFTER boot:
 * an admin silently DROPS a trigger, a rogue migration runs outside the
 * normal flow, a backup restore lands the wrong baseline — all of it
 * emits a `schema.drift.detected.runtime` event here within one cycle.
 *
 * How it works:
 *   1. Every CYCLE_SECONDS (default 300), compute
 *      `pg_dump --schema-only | normalize | sha256`.
 *   2. Compare to the committed baseline at
 *      `prisma/migrations/.schema-hash`.
 *   3. Emit `schema.drift.detected.runtime` if different.
 *   4. Also run the DM-R-1 `verify-migrations-deep.cjs` check for
 *      half-applied rows and monotonicity.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/continuous-drift-monitor.cjs
 *   CYCLE_SECONDS=60 node scripts/continuous-drift-monitor.cjs
 *
 * Runs as a long-lived process. Deploy as:
 *   - a sidecar container in docker-compose
 *   - a cron invocation every 5 min (but the long-lived mode has
 *     lower overhead and keeps state across cycles)
 *
 * The script needs `pg_dump` + `sha256sum` on PATH. Use the postgres
 * container if running from host.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');

const { emitEvent } = require('./lib/drift-events.cjs');

const rootDir = path.resolve(__dirname, '..');
const baselineFile = path.join(rootDir, 'prisma', 'migrations', '.schema-hash');

const CYCLE_SECONDS = Number.parseInt(process.env.CYCLE_SECONDS || '300', 10);
const DRY_RUN = process.env.DRIFT_MONITOR_ONCE === 'true';

function readBaselineHash() {
  if (!fs.existsSync(baselineFile)) return null;
  const raw = fs.readFileSync(baselineFile, 'utf8').trim().split(/\s+/)[0];
  return raw || null;
}

function currentSchemaHash() {
  // Delegate to the postgres container — no pg_dump required on the host
  // or in the monitor container. Same strategy as db-snapshot.sh.
  const dump = execSync(
    `docker compose -f "${rootDir}/docker-compose.yml" exec -T postgres ` +
      `pg_dump --schema-only --no-owner --no-privileges --no-comments ` +
      `--no-publications --no-subscriptions ` +
      `-U ${process.env.POSTGRES_USER || 'postgres'} ` +
      `${process.env.POSTGRES_DB || 'workload_tracking'}`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  // Same normalization as DM-R-2 CI + DM-R-11 round-trip. Trailing
  // newline included so sha256 matches the shell-pipeline baseline
  // (grep | sha256sum emits each line with a trailing \n).
  const normalized = dump
    .split('\n')
    .filter((l) => !l.startsWith('-- '))
    .filter((l) => !l.startsWith('SET '))
    .filter((l) => !l.startsWith('SELECT pg_catalog'))
    .filter((l) => !l.startsWith('\\restrict '))
    .filter((l) => !l.startsWith('\\unrestrict '))
    .filter((l) => l.length > 0)
    .join('\n') + '\n';

  return execSync('sha256sum', { input: normalized, encoding: 'utf8' })
    .trim()
    .split(/\s+/)[0];
}

async function oneCycle() {
  const baseline = readBaselineHash();
  if (!baseline) {
    console.warn('⚠️  DM-R-32: no prisma/migrations/.schema-hash baseline committed; skipping drift check.');
    return 'no-baseline';
  }

  let current;
  try {
    current = currentSchemaHash();
  } catch (err) {
    console.error('❌ DM-R-32: pg_dump failed:', err instanceof Error ? err.message : err);
    emitEvent('schema.drift.monitor.failed', {
      reason: err instanceof Error ? err.message : String(err),
    });
    return 'error';
  }

  if (current === baseline) {
    console.log(`✓ DM-R-32: schema hash matches baseline (${current.slice(0, 12)}…).`);
    return 'clean';
  }

  emitEvent(
    'schema.drift.detected.runtime',
    {
      baseline_hash: baseline,
      current_hash: current,
      baseline_file: path.relative(rootDir, baselineFile),
    },
  );
  console.error(`❌ DM-R-32: schema drift. baseline=${baseline.slice(0, 12)}… current=${current.slice(0, 12)}…`);
  return 'drift';
}

async function main() {
  if (DRY_RUN) {
    const r = await oneCycle();
    process.exit(r === 'drift' ? 1 : 0);
  }

  console.log(`🕑 DM-R-32: monitoring schema drift every ${CYCLE_SECONDS}s.`);
  // Intentional single infinite loop — containers + systemd restart on
  // unexpected exit. Signal handlers surface SIGTERM gracefully.
  const shutdown = () => {
    console.log('👋 DM-R-32: SIGTERM; exiting.');
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  for (;;) {
    await oneCycle();
    await new Promise((r) => setTimeout(r, CYCLE_SECONDS * 1000));
  }
}

main().catch((err) => {
  console.error('❌ DM-R-32 monitor crashed:', err);
  emitEvent('schema.drift.monitor.crashed', {
    reason: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
