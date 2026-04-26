# DeliveryCentral — Data Model Decisions

**Status:** v1.0 · 2026-04-17 · Phase DM deliverable
**Purpose:** capture every architecturally-significant data-modelling choice that would otherwise be lost to tribal knowledge. Future choices reference this file before diverging. Every decision has a **Status**, a **Context**, a **Decision**, and **Consequences**. Decisions are never deleted — they are superseded and linked.

---

## DMD-001 · CRUD with an event log, not event sourcing

**Status:** Accepted
**Context:** `DomainEvent` (DM-7) introduces a durable event spine that carries every aggregate mutation. It is tempting to go further and make aggregate state derive from events, eliminating mutable rows.
**Decision:** State lives in mutable rows. `DomainEvent` is an **audit + integration outbox** — not the source of truth. Aggregates mutate via plain Prisma updates inside a `$transaction` that **also** inserts the `DomainEvent` row; projections and consumers read `DomainEvent`.
**Consequences:**
- Read paths stay idiomatic Prisma queries; no event-replay overhead.
- Rebuilding state from scratch is not supported; backups are the source of recovery.
- CQRS read models (DM-8 `read_models.*`) are refreshable views, not replayable projections.
- No temptation to version event schemas via snapshot/epoch mechanics.

## DMD-002 · RLS-on-top, not application-only

**Status:** Accepted (DM-7.5)
**Context:** Tenant isolation can live in the application layer (every repository filters `tenantId`) or the database (Postgres Row-Level Security). Application-layer filtering is fragile — one missed `where` leaks tenant data.
**Decision:** RLS is the enforcement mechanism. Prisma filters are defence-in-depth only. Every tenant-scoped table has an `ENABLE ROW LEVEL SECURITY` + policy using `current_setting('app.current_tenant_id')`. The NestJS tenant resolver sets the GUC per request via a Prisma client extension. Cross-tenant workers use a dedicated `app_platform_admin` role with `BYPASSRLS`.
**Consequences:**
- A forgotten `where: { tenantId }` is not a data leak.
- Admin tooling that reads across tenants must explicitly assume the admin role.
- RLS policies are part of every migration that adds a tenant-scoped table.
- Local dev tooling sets a default tenant via `app.current_tenant_id = '<default-tenant-uuid>'` — documented in `README.md`.

## DMD-003 · Expand-contract for every schema change on populated tables

**Status:** Accepted
**Context:** `ALTER COLUMN ... TYPE`, `ALTER COLUMN ... SET NOT NULL` without a default, and similar operations take `ACCESS EXCLUSIVE` for the duration of a table rewrite. On a live 24/7 system this is unacceptable.
**Decision:** Any change that would rewrite a populated table is split into: (1) add new column/table alongside, (2) backfill in batches, (3) dual-maintain via triggers or application code for one release, (4) cut over, (5) drop the old shape a release later.
**Consequences:**
- Migrations proliferate (one conceptual change = 2–3 migrations); squash-baselines (DM-8-11) mitigate CI cost.
- Two-release contract (DMD-004) is required for any change that alters Prisma-Client TS signatures.
- Rollback is possible up to the cutover step by keeping the old shape live.

## DMD-004 · Two-release contract for Prisma-Client signature changes

**Status:** Accepted
**Context:** Rolling deploys mean old pods and new pods run against the same database. If the Prisma Client's generated TypeScript expects a column that the database does not yet have — or vice versa — the old pods crash.
**Decision:** Any change that alters the Prisma Client's generated types ships across three releases:
- **Release N** — add the new shape (column, table, field) additively.
- **Release N+1** — switch callers to the new shape; old shape still works.
- **Release N+2** — drop the old shape.
Schema and code go together only in the "switch callers" release; never in the additive or drop release.
**Consequences:**
- Planning a phase includes planning three releases, not one.
- CI gates on each release verify both old and new Prisma-Client-typed pods serve traffic against the migrated schema.

## DMD-005 · Foreign keys in the database, not the application

**Status:** Accepted
**Context:** Several recent migrations (`20260405_timesheets`, `20260407_staffing_requests`, `20260408_leave_requests`) created tables with `personId TEXT` and `projectId TEXT` without FK constraints. Application-layer joins + documentation are supposed to compensate.
**Decision:** Every `<something>Id` column has a Postgres `FOREIGN KEY` constraint, declared via Prisma `@relation`. DM-3 closes all existing gaps. No new column ships without an FK unless the aggregate map explicitly documents why.
**Consequences:**
- Orphans surface at write time, not at report time.
- Cascade semantics are explicit (`onDelete` matrix in `schema-conventions.md` §6).
- `workforce-planner.service.ts` and similar manual-join services collapse to Prisma `include` after DM-3.
- FK constraints across `TEXT → UUID` boundaries are technically legal in Postgres; DM-3 does not wait for DM-2 (ID-type normalization).

## DMD-006 · Transactional outbox for audit and integration events

**Status:** Accepted (DM-7)
**Context:** `AuditLoggerService` has historical paths that write to memory; service-to-service notification was coupled via separate `NotificationRequest` inserts after the business transaction commits. On crash, we lose audit entries or send duplicates.
**Decision:** Every business mutation writes a `DomainEvent` row **inside the same Prisma `$transaction`** as the aggregate mutation. `OutboxEvent` is a **view** over unpublished `DomainEvent` rows, consumed by a relay worker that marks `publishedAt`. No second insert.
**Consequences:**
- On crash mid-mutation, either both the business row and the `DomainEvent` commit, or neither does.
- Relay worker is the only code that publishes to external sinks (SMTP, Slack, Kafka) — idempotency is the worker's problem, not every service's.
- `EmployeeActivityEvent` retires into a `DomainEvent`-backed view (DM-7-4) — consumers don't change.

## DMD-007 · Polymorphic associations must be bounded and validated

**Status:** Accepted
**Context:** `CustomFieldValue.entityType` and similar are free-form strings. Any value is accepted; `entityId` is a UUID with no guarantee the referenced row exists.
**Decision:** Three lawful patterns (see `schema-conventions.md` §10): discriminated union via enum + per-type FK; generic `aggregateType + aggregateId` with (a) `AggregateType` enum, (b) trigger-based existence validator, (c) Zod-schema-registered JSON payload; nothing else.
**Consequences:**
- DM-7-6 introduces the `AggregateType` enum and the existence validator.
- `pg_jsonschema` is an optional DB-side check; the primary validation is in the application write path.
- Adding a new polymorphic-consumer entity type requires an enum addition **and** an entry in `JsonSchemaRegistry`.

## DMD-008 · Soft delete is `archivedAt` only; `deletedAt` is deprecated

**Status:** Accepted
**Context:** Two conventions coexist: some models carry `archivedAt`, some `deletedAt`, some both. Repositories filter inconsistently (`prisma-person.repository.ts` does, `prisma-metadata-entry.repository.ts` does not).
**Decision:** Canonical soft-delete column is `archivedAt DateTime? @db.Timestamptz`. DM-8 removes remaining `deletedAt` columns. DM-8 Prisma middleware auto-filters `archivedAt IS NULL` with an explicit opt-out flag on repositories that need to see archived rows.
**Consequences:**
- Hard delete is reserved for GDPR / compliance erasure only; done via an explicit service method that also removes downstream `DomainEvent` references per policy.
- Reads are archive-safe by default.

## DMD-009 · Timezone: every `DateTime` is timestamptz, stored in UTC

**Status:** Accepted (DM-4)
**Context:** Every `DateTime` column today is `timestamp without time zone`. The application server runs in UTC but historically some crons have not. Converting to `timestamptz` interprets existing values against the session's `TimeZone` GUC — a silent offset shift if we're not careful.
**Decision:** Every `DateTime` column is `@db.Timestamptz`. DM-4 converts with `SET TIMEZONE='UTC'` at the top of each migration and a before/after verification query. Pre-migration gate: every app server, cron, and worker runs in UTC.
**Consequences:**
- Local display is the client's job; the DB always stores UTC.
- `@db.Date` remains for date-only business columns (week start, fiscal year anchor, leave start/end).
- A new timezone-aware column in application code uses `Date` in TS; the wire format is ISO 8601 with offset.

## DMD-010 · Dictionary-backed reference data over free-form strings

**Status:** Accepted (DM-6)
**Context:** `Person.grade`, `Project.domain`, `Person.role`, `Project.projectType`, and similar are free-form strings. Users type variants ("Senior", "Sr.", "senior consultant"); rollups fragment.
**Decision:** Every closed-vocabulary reference field is an entry in `MetadataDictionary` with a canonical `entityType` key (see `schema-conventions.md` §18). Scalar columns become nullable FKs. DM-6 migrates; a trigger-populated denorm keeps the old scalar column readable for one release.
**Consequences:**
- Dictionaries are per-tenant by default (tenants can diverge); a shared "platform dictionary" overlay exists where vocabularies are regulated.
- Admin UI to curate dictionaries is required; `MetadataAdminPage` already exists and is extended.
- Reports filter by dictionary IDs, not strings.

## DMD-011 · Currency codes on every monetary column

**Status:** Accepted (DM-6)
**Context:** `ProjectBudget.capexBudget`, `PersonCostRate.hourlyRate`, `ProjectVendorEngagement.monthlyRate/blendedDayRate` have no currency. Implicit global `AUD` is a latent FX bug.
**Decision:** `Currency` table (ISO 4217). Every monetary `Decimal(15,2)` column is paired with a `currencyCode @db.Char(3)` FK. Default `AUD` via DM-6 backfill.
**Consequences:**
- Cross-currency aggregations require an FX table (deferred until a second currency is in production).
- Reports display currency explicitly.

## DMD-012 · Optimistic concurrency via `version` column, enforced in repositories

**Status:** Accepted (DM-8)
**Context:** Only `Project`, `ProjectAssignment`, `TimesheetWeek` have `version` columns today. Where present, application code doesn't check them — `close-project.service.ts` compares in memory only.
**Decision:** Every mutable aggregate root has `version Int @default(1)`. Repositories update with `WHERE id = ? AND version = ?` + `SET version = version + 1`; zero-row result throws `ConflictError`. Read paths ignore `version`.
**Consequences:**
- Two concurrent edits of the same row → one succeeds, one retries (or surfaces a UI conflict).
- Read-modify-write services fetch, mutate in memory, update; no ambient locking needed.
- Bulk operations must carry a `version` per row or use explicit row locking via Prisma `$transaction` + `SELECT ... FOR UPDATE` (rare).

## DMD-013 · Partitioning deferred; `DomainEvent` partition-ready

**Status:** Accepted (DM-7 + DM-8)
**Context:** Projected volumes are under 10M rows per table over 24 months. Native Postgres partitioning is an operational tax not worth paying at that scale. But `DomainEvent` / `OutboxEvent` are candidates that grow faster than most.
**Decision:** No table is partitioned on day one. `DomainEvent` and `OutboxEvent` are **created** in DM-7 with `PARTITION BY RANGE (createdAt)` and a single default partition; retro-splitting into monthly partitions is cheap (`ATTACH PARTITION`). A capacity-audit job tracks row counts; partition-cutover runbook (DM-8-12) is rehearsed but not executed until a table crosses 5M rows.
**Consequences:**
- `pg_partman` is not installed until at least two tables are partitioned.
- Queries on `DomainEvent` must not assume non-partitioned behavior (e.g. no global `UNIQUE` index without the partition key).

## DMD-014 · Schema conventions enforced in CI via `@mrleebo/prisma-ast`

**Status:** Accepted (DM-1)
**Context:** Design-token discipline is enforced by a regex-based lint with a baseline. The same pattern works for schema discipline, but regex on `schema.prisma` is brittle.
**Decision:** `scripts/check-schema-conventions.cjs` uses `@mrleebo/prisma-ast` to parse the schema to an AST and evaluate rules. Existing violations are grandfathered in `scripts/schema-convention-baseline.json`; the baseline shrinks, never grows. Wired into `npm run verify:pr` and a pre-commit hook.
**Consequences:**
- Adding a new TEXT ID, missing FK, or untyped `DateTime` fails CI.
- The baseline file is a visible pressure lever — every DM sub-phase ships with a baseline shrinkage.

## DMD-015 · `PlatformSetting.key` is intentionally TEXT PK

**Status:** Accepted
**Context:** The schema-conventions lint forbids TEXT primary keys. `PlatformSetting` is a key/value store where the key *is* the identifier ("maintenance.scheduledWindow").
**Decision:** `PlatformSetting.key` is whitelisted in `schema-convention-baseline.json` as an intentional TEXT PK; no future TEXT PK is allowed without extending the whitelist with a linked DMD entry.
**Consequences:**
- The whitelist is the public list of "things reviewers should expect to see".

## DMD-016 · `PublicHoliday` and `Currency` are platform-scoped (no `tenantId`)

**Status:** Accepted (DM-7.5)
**Context:** Some reference data is universal (ISO 4217 currency codes, Australian public holidays). Forcing `tenantId` would duplicate rows and muddy reports.
**Decision:** `PublicHoliday`, `Currency`, `NotificationChannel`, `NotificationTemplate` (templates), `PlatformSetting`, `Tenant` itself, `CaseType` **defaults**, and `WorkflowDefinition` **defaults** are platform-scoped — no `tenantId`, no RLS. Tenant-scoped overrides layer on top (e.g. `CaseType` with `tenantId NOT NULL`).
**Consequences:**
- Two-level reference model: platform default + tenant override. Admin UIs make the distinction explicit.
- `PublicHoliday` may need to become tenant-scoped if multi-jurisdiction tenants become a requirement — re-evaluate at DM-7.5 close.

## DMD-017 · No DbContext-wide `deletedAt` filter; it's middleware

**Status:** Accepted (DM-8)
**Context:** Prisma lacks Entity Framework's global filter. We have two options: (1) every repository filters `archivedAt: null`; (2) a Prisma client extension auto-injects the filter.
**Decision:** A Prisma `$extends` middleware auto-injects `archivedAt IS NULL` on every `findMany`, `findFirst`, `findUnique`, `update`, `updateMany`, `aggregate`, `count`, `groupBy`, unless the caller passes `{ includeArchived: true }` explicitly. The extension lives in `src/infrastructure/prisma/prisma.module.ts`.
**Consequences:**
- Repositories don't sprinkle `archivedAt: null`; reviewers focus on when `includeArchived: true` is explicitly requested.
- Raw SQL must add the filter manually — the raw-SQL audit (DM-5-1) catches this.

## DMD-018 · JSON columns have registered Zod schemas; DB validation is optional

**Status:** Accepted (DM-7)
**Context:** Many `Json` columns carry ad-hoc payloads — `WorkEvidence.trace`, `AuditLog.payload`, `CustomFieldValue.value`, `ProjectRagSnapshot.dimensionDetails`.
**Decision:** Every `Json` column is registered in `src/infrastructure/json-schema-registry.ts` with a Zod schema. Writes validate before Prisma `create`/`update`. `pg_jsonschema` is installed optionally; when installed, the same schemas are compiled to JSON Schema and attached as CHECK constraints.
**Consequences:**
- Adding a column or changing a payload shape requires updating the registry in the same PR.
- A nightly sampler job reports payloads that fail the Zod schema — a retrofit finding surfaced to the owning service.

## DMD-019 · Read models live in `read_models.*` schema, refreshed by events

**Status:** Accepted (DM-8)
**Context:** Workforce-planner and planned-vs-actual queries are expensive joins. Materialising them is cheap; keeping them fresh is the question.
**Decision:** A `read_models` Postgres schema holds materialised views. `DomainEvent`-driven refresh via triggers or `pg_cron`-scheduled `REFRESH MATERIALIZED VIEW CONCURRENTLY`. First views: `mv_project_weekly_roster`, `mv_person_week_hours`. Access via a dedicated `app_reporting` role on a separate pool.
**Consequences:**
- OLTP does not compete with dashboard queries.
- Stale-data SLO is explicit per view (default: under 5 minutes).
- A view that becomes load-bearing for a feature gets its refresh SLA documented in `docs/testing/slo-budgets.json`.

## DMD-020 · Secret columns are commented and selectively encrypted

**Status:** Accepted (DM-8)
**Context:** `LocalAccount.passwordHash` and token hashes are one-way; re-encrypting buys nothing. `LocalAccount.twoFactorSecret` is reversible and needs protection.
**Decision:**
- Every secret/PII column gets `COMMENT ON COLUMN ... IS 'pii:secret'` (or `'pii:pii'` for non-secret PII). Greppable in `pg_catalog`.
- `twoFactorSecret` (and any future reversible secret) uses application-layer envelope encryption with keys from the configured KMS. DB never sees plaintext.
- One-way hashes stay as-is.
**Consequences:**
- Secret handling is visible to compliance scans via `pg_catalog.pg_description`.
- Envelope encryption config lives in `src/infrastructure/crypto/*` (to be added in DM-8-6).

## DMD-021 · Accepted Postgres extensions; everything else requires a DMD entry

**Status:** Accepted (DM-1)
**Context:** Postgres extensions expand capability but also attack/maintenance surface.
**Decision:** Allowed: `pgcrypto`, `pg_trgm`, `pg_stat_statements`, `auto_explain`, `pg_jsonschema` (optional), `pg_partman` (conditional), `pgvector` (future). Every other extension requires a superseding DMD entry before it is installed.
**Consequences:**
- `dblink`, `postgres_fdw`, `plv8`, and similar are blocked by default.
- Managed-Postgres tenants verify that allowed extensions are available on their plan before we adopt one.

## DMD-022 · `hiredAt`/`terminatedAt` stay as denormalised scalars fed by `EmploymentEvent`

**Status:** Accepted (DM-6)
**Context:** A Person can be rehired. Modelling employment as a single `hiredAt`/`terminatedAt` pair loses history; modelling only as events loses the convenient "is this person currently employed" query.
**Decision:** `EmploymentEvent` (DM-6-5) is the source of truth for lifecycle. `Person.hiredAt` / `Person.terminatedAt` are denormalised from the latest event via a trigger. UI reads the scalars; audits query events.
**Consequences:**
- Rehires are naturally supported (new `HIRED` event after `TERMINATED`).
- Trigger-maintained denorm is a single code path; if the trigger is bypassed, consistency drifts — covered by a nightly consistency check job.

## DMD-023 · `ProjectRetrospective` extracted from `Project`

**Status:** Accepted (DM-6)
**Context:** `Project` carries `outcomeRating`, `lessonsLearned`, `wouldStaffSameWay` — post-closure review artefacts conflated with the project aggregate.
**Decision:** Extract to a 1:1 `ProjectRetrospective` with `onDelete: Cascade` from Project. Survey fields live there. The Project aggregate no longer knows about retrospective shape.
**Consequences:**
- New retrospective fields (future: "retention impact score", "NPS") land in `ProjectRetrospective`, not `Project`.
- Pre-DM-6 reads that fetch Project eagerly gain a `retrospective?: ProjectRetrospective` relation and an explicit opt-in include.

## DMD-024 · Bridge-table naming is `${Left}${Right}` PascalCase / `${left}_${right}` snake_case

**Status:** Accepted (DM-1)
**Context:** Existing bridges mix patterns: `PersonOrgMembership`, `PersonResourcePoolMembership`, `PersonSkill`, `CaseParticipant`, `AssignmentApproval`, `ProjectVendorEngagement`.
**Decision:** Prisma model name is `${Left}${Right}` or `${Left}${Right}${Role}` when a role is necessary (`AssignmentApproval` = Assignment+Approval+(implicit decision role)). `@@map("snake_case")` follows.
**Consequences:**
- Existing tables are grandfathered; new bridges follow the rule.
- A bridge that grows beyond a pure link (adds non-trivial lifecycle) is promoted to a full aggregate entity with its own root status.

## DMD-026 · UUIDs never leave the API boundary; every user-facing entity has a `publicId`

**Status:** Accepted (DM-2.5)
**Context:** The user flagged raw UUIDs appearing in URLs, request/response bodies, and frontend state as a **heavy security vulnerability**. Reasons: (a) leaks enumeration signal across tenant boundaries, (b) mixes primary-key material with a public surface — any bug in the authorization layer that accepts a UUID from one context leaks across contexts, (c) UUIDs land in browser history, third-party referer headers, analytics, and screenshots, (d) UUIDv7 carries timestamp bits that leak creation-order info.
**Decision:** Every aggregate root that is addressable by a user carries two identifier columns: internal `id` (`String @id @db.Uuid`) for FKs and joins, and `publicId` (`String @unique @db.VarChar(32)`, prefixed by entity type, base62-encoded Sqid over a tenant-scoped salt) for every external surface. The API layer is the only place that maps between the two: path/query params and response bodies only speak publicId; services and repositories only see UUIDs. Lint + test guardrails enforce the boundary. DM-2.5 is the programmatic rollout; DM-2 per-table migrations add the `publicId` column alongside the `uuid` PK in the same expand-contract cycle so tables are touched once, not twice. Documented in `schema-conventions.md` §20.
**Consequences:**
- Every controller, DTO, serializer, and frontend route is touched once to switch to publicId. Two-release contract: release N accepts both UUID and publicId; release N+1 frontend uses publicId only; release N+2 drops UUID acceptance.
- Frontend URL shape changes: `/projects/6a5c...` → `/projects/prj_2zJ9QfXk`. Bookmarks, logs, and external links that embedded UUIDs must be communicated in the rollout.
- E2E tests assert on `^[a-z]+_[A-Za-z0-9]{8,}$` — never on UUID shapes. Test fixtures regenerated.
- Sub-entities (CaseStep, AssignmentApproval) do not get their own publicId unless independently addressable; they appear under their root's publicId plus a stable sequence key.
- Reference/platform data (Currency, PublicHoliday, NotificationChannel) uses its natural business key (ISO 4217, date+country, channel key) as the public identifier — no publicId needed.
- Multi-tenant: two tenants can legitimately have the same publicId string; uniqueness is `(tenantId, publicId)`. RLS from DM-7.5 makes this safe.
- Generation: Sqids library (MIT) with a per-tenant salt; a Prisma client extension populates the column on insert.
- Without RLS (before DM-7.5 lands), publicIds are still safer than UUIDs because they carry no embedded entropy about creation order or tenant, but true isolation requires DM-7.5.
**Implementation notes:** DM-2.5 sub-phases: (1) ship `publicId` on every aggregate root via DM-2 migrations; (2) build the resolver pipe (NestJS `ParseEntityByPublicIdPipe`) + response serializer; (3) add lint rules `public-id-missing` + `controller-uuid-leak`; (4) migrate controllers top-down by aggregate; (5) migrate frontend routes; (6) drop UUID acceptance; (7) audit SSR-rendered HTML and outbound email templates.

## DMD-025 · ApprovalDecision.REQUESTED is deprecated; use PENDING

**Status:** Accepted (DM-1-9)
**Context:** The `ApprovalDecision` enum has both `REQUESTED` and `PENDING`. They mean the same thing; filter logic mistakes one for the other.
**Decision:** `PENDING` is canonical. `REQUESTED` is deprecated: new rows must not use it; existing rows are migrated to `PENDING` in DM-4 enum cleanup. A lint rule (DM-1 schema check) flags any new `REQUESTED` write.
**Consequences:**
- Filter predicates simplify: `status === 'PENDING'` captures all pending approvals.
- After DM-4 enum migration, `REQUESTED` is dropped from the enum entirely.

---

## Superseded Decisions

_None yet._

## Template for new decisions

```
## DMD-### · <short title>

**Status:** Proposed / Accepted / Superseded by DMD-###
**Context:** <what prompted this>
**Decision:** <what we chose>
**Consequences:** <what follows; positive and negative>
```
