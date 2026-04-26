#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * DM-R / DM-4-4 — UTC enforcement.
 *
 * Every app server, migrate container, and cron must run in UTC.
 * Rationale: DM-4-5 will convert every `DateTime` column to
 * `@db.Timestamptz`. Postgres interprets existing `timestamp without
 * time zone` values against the SESSION timezone during conversion —
 * so a container running in PST would silently shift every historical
 * timestamp by -8 hours. This script is the gate that prevents that
 * failure mode from reaching production.
 *
 * Failure modes caught:
 *   - `process.env.TZ` set to non-UTC (e.g. 'America/Los_Angeles')
 *   - Container without TZ env but OS default is not UTC
 *     (detected via `new Date().getTimezoneOffset() !== 0`)
 *
 * Usage:
 *   node scripts/check-tz-is-utc.cjs
 *
 * Exit 0 clean, 1 on non-UTC detected.
 */

const tzEnv = process.env.TZ;
const offset = new Date().getTimezoneOffset();

if (tzEnv && tzEnv !== 'UTC' && tzEnv !== 'Etc/UTC') {
  console.error(`\x1b[31m✗\x1b[0m DM-4-4: TZ=${tzEnv} — must be UTC.`);
  console.error(`  Set TZ=UTC in the container environment (docker-compose.yml).`);
  process.exit(1);
}

if (offset !== 0) {
  console.error(`\x1b[31m✗\x1b[0m DM-4-4: runtime timezone offset is ${offset} minutes — must be 0 (UTC).`);
  console.error(`  Root cause likely an OS-level default tz other than UTC.`);
  console.error(`  Fix: set TZ=UTC in the container environment.`);
  process.exit(1);
}

console.log(`\x1b[32m✓\x1b[0m DM-4-4: runtime is UTC (TZ=${tzEnv || 'unset'}, offset=0).`);
process.exit(0);
