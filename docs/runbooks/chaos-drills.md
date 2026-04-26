# DM-R-28 — Chaos Game-Day Program

**Cadence:** quarterly, 4 hours. A drill that is not run becomes a lie —
if the team cannot commit to the cadence, the resilience tooling in
Waves 1–4 is worth less than we think.

**Commitment:** a failed drill is itself a **Sev-2 incident**. Fix the
gap before next quarter.

**Team:** at minimum an incident commander (IC) + an operator (OP) +
observer/scribe (OB). Rotate IC role each quarter so everyone learns
the ladder.

---

## Scenario catalogue

Each scenario has a **setup**, an **expected defense** (which DM-R item
stops it), a **pass criterion**, and a **blast-radius cap** (a safety
rail — if any observable OUTSIDE the named defense is breached, the
drill itself is a failure).

### Scenario A — Rogue migration drops ProjectAssignment
- **Setup:** In a branch, write a migration with `DROP TABLE "ProjectAssignment";`. Attempt to apply via `npm run db:migrate:safe:dev`.
- **Defense:** DM-R-21 DDL event-trigger lockout; even if migration is attempted, the `ALTER/DROP` runs as `app_migrator`, but the drop is logged in `ddl_audit`. Also: DM-R-11 round-trip would catch the destructive migration in CI on push-to-main.
- **Pass criterion:** (a) `db-migrate-safe.sh` refuses with DM-R-3 snapshot first, (b) `ddl_audit` logs the drop attempt, (c) operator uses `db-last-good.sh` to recover within 15 min.
- **Blast-radius cap:** dev DB only. Never run against staging or prod.

### Scenario B — DELETE FROM "AuditLog" via app role
- **Setup:** From the application layer or a direct psql session as `app_runtime`, run `DELETE FROM "AuditLog";`.
- **Defense:** DM-R-20 role grants revoke DELETE on AuditLog from app_runtime.
- **Pass criterion:** Postgres returns `ERROR: permission denied for table AuditLog`. Zero rows removed.

### Scenario C — Mass delete on Person
- **Setup:** `DELETE FROM "Person";` from a session connected as a role with permission (postgres or app_migrator).
- **Defense:** DM-R-23 mass-mutation circuit breaker.
- **Pass criterion:** Trigger raises with the threshold-exceeded message. Zero rows deleted.
- **Variation:** repeat with `SET LOCAL public.allow_bulk = 'true';` — delete should succeed. The bypass path must be exercised so operators trust it.

### Scenario D — Hostile seed tampers with AuditLog
- **Setup:** Author a seed that directly `UPDATE`s an AuditLog row (e.g., changes a `payload`).
- **Defense:** DM-R-20 revokes UPDATE on AuditLog. DM-R-22 hash chain catches any UPDATE that does slip through (e.g., via postgres superuser).
- **Pass criterion:** `scripts/verify-audit-hash-chain.cjs` detects the mismatch on the next run; `audit.hash_chain.mismatch.detected` event emitted.

### Scenario E — Prisma client / DB drift at runtime
- **Setup:** Manually drop a column from a table (as postgres): `ALTER TABLE "Person" DROP COLUMN "displayName";`. Restart the backend.
- **Defense:** DM-R-1 prestart verifier.
- **Pass criterion:** Backend container exits 1 at startup with the DM-R-1 drift error. Restore the column; backend starts cleanly.

### Scenario F — PITR restore from 2 hours ago
- **Setup:** Ensure WAL + base backup exist (run `scripts/pg-basebackup.sh` first). Pick a target time 2 hours in the past. Follow [docs/runbooks/pitr-restore.md](pitr-restore.md).
- **Defense:** DM-R-25 WAL archive + base backup.
- **Pass criterion:** DB boots at target time within RTO (15 min for single-instance). Verify: `/api/health/deep` green; hash chain intact; row counts match the pre-drill snapshot of `migration_audit` + `ddl_audit` at the target time.

### Scenario G — Concurrent `prisma migrate dev` race
- **Setup:** Start `npm run db:migrate:safe:dev` in two shells simultaneously.
- **Defense:** DM-R-3 `pg_try_advisory_lock(42042042)` + `flock` host lock.
- **Pass criterion:** Second invocation blocks or fails loudly with "another migration in flight" message. No interleaved writes to `_prisma_migrations`.

### Scenario H — Panic readonly drill
- **Setup:** Dev backend serving traffic. Operator runs `scripts/panic-readonly.sh` and measures TTC (time-to-contain).
- **Defense:** DM-R-24 panic kill-switches.
- **Pass criterion:** Writes fail within 10 seconds of script start. Operator runs `panic-readwrite.sh` and writes resume within 10 seconds of that. TTC + TTR each under 30 seconds.

### Scenario I — Honeypot tripwire (after DM-R-31 lands)
- **Setup:** Query one of the honeypot rows directly (e.g. `SELECT * FROM "Person" WHERE "publicId" = 'usr_HONEYPOT01';`).
- **Defense:** DM-R-31 honeypot trigger.
- **Pass criterion:** `ddl_audit` / event log records the access; DRIFT_EVENT `honeypot.canary.tripped` emitted.

---

## Drill run sheet

For each quarterly game-day:

1. **Pre-drill (T-1 week):** IC picks 3 scenarios from the catalogue above, rotating coverage each quarter. Picks must include at least one from {A, C, F} (destructive paths).

2. **Drill day (T-0):**
   - [ ] Notify the team 24h in advance (blocked calendars).
   - [ ] Capture pre-state: `pg_basebackup`, hash-chain verifier, `/api/health/deep`.
   - [ ] Execute each scenario in sequence. OP time each phase (TTD/TTC/TTR).
   - [ ] Observer captures deviations from expected defense.
   - [ ] Post-drill: verify dev DB is green; run full `verify:pr` + `db:roundtrip`.

3. **Post-drill write-up (T+3 days):**
   - Per-scenario: pass / fail + measured times + deviations.
   - Action items for any drill that failed or exceeded target times.
   - Filed in `docs/chaos-reports/YYYY-QN.md`.

4. **Between drills:**
   - Any defense that regresses (a CI gate turned off, a trigger dropped, a role grant drifted) is a Sev-2 incident. Fix before next drill.

---

## Targets (post-DM-R-25/27)

| Metric | Target | Measured by |
|--------|--------|-------------|
| Time-to-detect (TTD) | ≤ 10 min from bad change to DRIFT_EVENT | DM-R-14 events, operator dashboards |
| Time-to-contain (TTC) | ≤ 1 min from detection to panic script | scenario H timing |
| Time-to-recover (TTR) | ≤ 30 min for data-loss restore | scenario F timing |
| RPO | ≤ 60 s | archive_timeout in DM-R-25 |

A quarter that misses TTD/TTC/TTR targets ≥ 2 scenarios is a **Sev-2 write-up**.

---

## Ownership + cadence

- **IC rotation:** published in `docs/runbooks/chaos-ic-rotation.md` (to be created post-first-drill).
- **First drill:** scheduled ≤ 30 days after Wave 4 fully lands (all 13 DM-R-20..32 items).
- **Cadence:** every calendar quarter. If a quarter is missed, the following quarter is a **6-scenario** drill, not 3 — no "skipping" banked.
