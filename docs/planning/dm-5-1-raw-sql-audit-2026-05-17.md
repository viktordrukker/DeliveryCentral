# DM-5-1 — Raw-SQL Audit (2026-05-17)

Deliverable for **DM-5-1** from the F-16 closure roadmap. Lists every
`$queryRaw` / `$executeRaw` / `$queryRawUnsafe` / `$executeRawUnsafe`
call site in `src/` with rationale, so future migrations / type
generation can either (a) drop the raw call in favour of a typed
Prisma query or (b) explicitly accept the raw boundary.

`grep -rE '\$queryRaw|\$executeRaw|\$queryRawUnsafe|\$executeRawUnsafe' src/`
→ **32 hits** across **8 files** as of 2026-05-17.

## By file

| File | Hits | Bucket |
|---|---|---|
| `src/modules/setup/application/setup.service.ts` | 9 | Setup wizard (intentional raw SQL) |
| `src/modules/admin/application/redact-person-audit.service.ts` | 7 | DM-R-22 hash-chain rebuild (intentional) |
| `src/modules/setup/application/preflight-checks.ts` | 4 | Setup wizard preflight (intentional) |
| `src/modules/setup/application/diagnostic-bundle.service.ts` | 4 | Setup wizard diagnostics (intentional) |
| `src/shared/persistence/tenant-resolver.middleware.ts` | 3 | RLS `SET LOCAL` (Postgres-only, intentional) |
| `src/modules/health/health.service.ts` | 2 | Deep-health connectivity + migration probe (intentional) |
| `src/modules/audit-observability/application/domain-event.service.ts` | 2 | DM-R-22 hash-chain insert (intentional) |
| `src/modules/setup/application/system-state.service.ts` | 1 | Setup wizard state (intentional) |

## Findings

All 32 sites are **intentional raw-SQL usage**:

1. **Setup wizard** (`setup.service.ts`, `preflight-checks.ts`,
   `diagnostic-bundle.service.ts`, `system-state.service.ts` — 18 sites):
   the wizard runs DDL (`CREATE DATABASE`, `DROP SCHEMA`, `pg_try_advisory_xact_lock`,
   `SHOW server_version`, `_prisma_migrations` table reads) before the
   Prisma client is even bound to the target database. Cannot be typed
   through Prisma's generated delegate.
2. **Hash-chained AuditLog** (`redact-person-audit.service.ts`,
   `domain-event.service.ts` — 9 sites): DM-R-22 hash-chain integrity
   requires deterministic SHA-256 digest computation inside a single
   transaction step, plus forward rebuild after a redact-payload v1
   update. Prisma's generated client doesn't support deterministic
   digest composition + chain rebuild without raw SQL.
3. **Tenant-resolver RLS** (`tenant-resolver.middleware.ts` — 3 sites):
   `SET LOCAL app.current_tenant = ...` for Postgres Row-Level Security
   is intentionally Postgres-specific and lives outside Prisma's typed
   path.
4. **Health probes** (`health.service.ts` — 2 sites): `SELECT version()`
   and `_prisma_migrations` read for deep-health diagnostics. Both
   reference Postgres-internal state Prisma can't model.

## Recommendation

**No code change required.** The raw-SQL audit confirms every call is
either DDL (setup wizard), Postgres-specific (RLS, version probe), or
load-bearing for an intentional invariant (hash chain). Closing
**DM-5-1** with this artifact.

If a future raw-SQL site lands in `application/` or `domain/`, it
should be evaluated against this list — the only acceptable raw-SQL
buckets are the four above. Add a `scripts/check-raw-sql-baseline.json`
ratchet if regressions become a concern.
