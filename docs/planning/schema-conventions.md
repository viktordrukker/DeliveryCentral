# DeliveryCentral — Prisma Schema Conventions

**Status:** v1.0 · Created 2026-04-17 · Authored as part of Phase DM (Data Model Remediation)
**Scope:** every `.prisma` file and every migration emitted from `prisma/migrations/`
**Enforcement:** `scripts/check-schema-conventions.cjs` via `npm run schema:check`. Existing violations are grandfathered in `scripts/schema-convention-baseline.json` — the baseline only shrinks.

These conventions are not optional. Every new model, column, relation, enum, and migration must follow them. Legacy exceptions are whitelisted explicitly; nothing new ships outside the rules.

---

## 1. Identifiers

| Rule | Why | How |
|---|---|---|
| Every `id` primary key is `String @id @default(uuid()) @db.Uuid` | Native Postgres `uuid` column; fast, 16 bytes, sort-friendly | `id String @id @default(uuid()) @db.Uuid` |
| Every `<something>Id` foreign-key column is `String @db.Uuid` | Match the parent's type exactly so the FK constraint is cheap | `projectId String @db.Uuid` |
| Every `<something>Id` column has a corresponding Prisma `@relation` | DB-level FK is mandatory; Prisma `@relation` is how we declare it | `project Project @relation(fields: [projectId], references: [id])` |
| **Exception whitelist for TEXT PKs:** `PlatformSetting.key` (key/value store by design) | The key *is* the natural identifier; no uuid needed | No action |

> During DM-2 expand-contract, temporary `id_old TEXT` columns are allowed; the baseline lists them explicitly and the script flags any new one outside the list.

## 2. Temporal Vocabulary

One word per concept. Pick the column name from the table below by the **kind of time** the column represents:

| Concept | Column names | When to use |
|---|---|---|
| Bitemporal validity of a record | `validFrom` + `validTo` | Memberships, assignments, reporting lines, positions, cost rates — records that are *valid* between two dates and can have successors |
| Business event duration | `startsOn` + `endsOn` (dates) or `startsAt` + `endsAt` (timestamps) | Leave requests, staffing requests, vendor engagements, planned work |
| Lifecycle points | `openedAt`, `closedAt`, `submittedAt`, `approvedAt`, `decidedAt`, `completedAt` | Single-point events in an entity's lifecycle |
| Ownership/audit | `createdAt`, `updatedAt`, `archivedAt` | Row-level metadata, always on every table (see §4) |

Banned synonyms in new code: `effectiveFrom/effectiveTo`, `startDate/endDate`, `plannedStartDate/plannedEndDate`. DM-5 normalises existing usages.

## 3. Enums vs Strings

A column is a Prisma `enum` whenever its domain is a **closed, known set of values**. A free-form text field stays `String`.

Existing `String` columns that MUST become enums (tracked in DM-4):
- `OvertimePolicy.approvalStatus`
- `EmployeeActivityEvent.eventType`
- `OutboxEvent.status`
- `WorkEvidence.evidenceType`
- `WorkEvidenceLink.linkType`
- `ExternalAccountLink.accountPresenceState`
- `PersonCostRate.rateType`
- `LocalAccount.source`
- `TimesheetEntry.benchCategory`
- `IntegrationSyncState.resourceType`
- `PersonExternalIdentityLink.matchedByStrategy`

Free-form strings legitimately remain `String`: `CaseType.key` (dictionary-joined), `CustomFieldDefinition.entityType` (handled by the polymorphic discipline in §10), `MetadataEntry.entryKey`/`entryValue`, display names, descriptions, notes.

### Enum hygiene
- No duplicate semantics in one enum. `ApprovalDecision.REQUESTED` + `.PENDING` is a duplicate and is deprecated (DM-1-9 retires `REQUESTED`; code reads fall back to `PENDING`).
- Enum values are `SCREAMING_SNAKE_CASE`.
- Enum members are ordered narrative-first (lifecycle order), not alphabetical.

## 4. Audit Columns

Every model has, at minimum:
```prisma
createdAt DateTime @default(now()) @db.Timestamptz
updatedAt DateTime @updatedAt      @db.Timestamptz
```

Mutable aggregates also have `version Int @default(1)` and must be updated via `prisma.X.update({ where: { id, version }, data: { ..., version: { increment: 1 } } })`. Enforced in DM-8.

Auditable aggregates (write-heavy, person-attributable) also have:
```prisma
createdByPersonId String? @db.Uuid
updatedByPersonId String? @db.Uuid
```
with `@relation`s on `Person` (`onDelete: SetNull`). DM-5 rolls these in where the audit value is high.

## 5. Soft Delete

Canonical column is `archivedAt DateTime? @db.Timestamptz`. `deletedAt` is deprecated (DM-8 removes remaining uses).

All read paths filter `where: { archivedAt: null, ... }` unless an explicit opt-in is documented. The DM-8 Prisma middleware enforces this automatically; explicit opt-out is a named flag on the repository method.

Hot tables with an `archivedAt` column get a partial index:
```sql
CREATE INDEX ... ON "Table" (...) WHERE "archivedAt" IS NULL;
```

## 6. `onDelete` Policy Matrix

Every `@relation` **must** declare `onDelete` explicitly. Default (`NO ACTION`) is banned — it silently blocks deletes with cryptic errors.

| Relation kind | `onDelete` | Examples |
|---|---|---|
| Component-of-aggregate (child cannot exist without parent) | `Cascade` | `CaseRecord → CaseStep`, `NotificationRequest → NotificationDelivery`, `TimesheetWeek → TimesheetEntry` |
| Historical / audit (must never disappear when parent goes) | `Restrict` | `ProjectAssignment → AssignmentHistory`, `Person → AuditLog.actorId`, `DomainEvent` rows |
| Soft reference (child survives parent deletion with null pointer) | `SetNull` | `Person → WorkEvidence.personId` (nullable), `Person → Project.projectManagerId` |
| Cross-aggregate (must never cascade across aggregate boundaries) | `Restrict` | Anything crossing an aggregate root documented in `aggregate-map.md` |

## 7. Table Naming

Every model declares `@@map("snake_case_plural_or_business_noun")`. Rules:
- Plural for collections: `persons` (historical `Person` → `persons`), `projects`, `case_records`.
- Exception: singleton / store-like tables may be singular (`platform_settings`).
- Bridge tables are named `${left}_${right}_${role?}` in snake_case: `person_org_memberships`, `person_skills`, `project_vendor_engagements`.

Prisma model name stays PascalCase singular. `@@map` is the Postgres-side name.

## 8. Column Naming

- camelCase in Prisma (`personId`, `allocationPercent`, `validFrom`). Prisma maps to the database's preferred case per driver.
- Boolean columns read as assertions: `isActive`, `isPrimary`, `isSystemManaged`, `capex`. Never `active` / `primary`.
- Percentage columns use `...Percent` suffix, are `Decimal(5,2)`, constrained `0 ≤ x ≤ 100`.
- Currency amounts are `Decimal(15,2)` and **always** paired with `currencyCode` FK to `Currency` (ISO 4217).

## 9. Timestamps

Every `DateTime` column is `@db.Timestamptz`. DM-4 converts the legacy `timestamp without time zone` columns; the lint warns on any non-timestamptz DateTime in new models.

Date-only columns stay `@db.Date` for business dates (leave dates, week start, budget fiscal year anchor).

## 10. Polymorphic Associations

Three lawful patterns only:

1. **Discriminated union via enum + per-type FK.** Preferred for new code. `Notification` with `channelKind` enum + per-channel columns.
2. **Generic `aggregateType` + `aggregateId`** (as `AuditLog`, `OutboxEvent`, `DomainEvent`, `CustomFieldValue`). Requires:
   - `aggregateType` backed by a `AggregateType` enum (DM-7 introduces it) — no free-form strings.
   - Trigger-based existence validator checks `aggregateId` resolves in the referenced table.
   - The JSON payload column has a registered Zod schema in `JsonSchemaRegistry` (DM-7).
3. **Nothing else.** Do not invent new polymorphism without updating this document first.

## 11. JSON Columns

Every `Json` / `Json?` column is registered in `src/infrastructure/json-schema-registry.ts` with a Zod schema and validated at write. Columns in scope at DM-7:
`WorkEvidence.details`, `WorkEvidence.trace`, `CaseStep.payload`, `CaseRecord.payload`, `CustomFieldValue.value`, `AuditLog.payload`, `OutboxEvent.payload`, `AssignmentHistory.previousSnapshot`, `AssignmentHistory.newSnapshot`, `ProjectRagSnapshot.dimensionDetails`, `EmployeeActivityEvent.metadata`, `WorkflowDefinition.definition`, `WorkflowStateDefinition.validationSchema`, `CustomFieldDefinition.validationSchema`, `CustomFieldDefinition.defaultValue`, `NotificationChannel.config`, `NotificationRequest.payload`, `PlatformSetting.value`, `EntityLayoutDefinition.layoutSchema`.

## 12. Indexing

- Single-column FK index on every `*Id` column. Prisma emits these automatically via `@@index`; the lint enforces the annotation.
- Composite indexes for common query shapes — follow existing patterns (`[status, archivedAt]`, `[personId, weekStart]`). Add one per measured slow-query finding, not speculatively.
- Partial index on `archivedAt IS NULL` for hot read paths (see §5).
- `pg_trgm` GIN indexes on text-search columns — DM-8.

## 13. Uniqueness

- Composite unique keys reflect business invariants (`[personId, weekStart]`, `[projectId, fiscalYear]`). Keep them; the lint grandfathers them and warns on additions that lack a justification comment.
- Under DM-7.5, every globally-unique constraint is reviewed for tenant scope. Default is `(tenantId, ...)`; document cross-tenant exceptions in `docs/planning/tenant-uniqueness-audit.md`.

## 14. Versioning & Optimistic Concurrency

- Every mutable aggregate has `version Int @default(1)`.
- Every repository update uses `WHERE id = ? AND version = ?` and throws `ConflictError` on zero-row update.
- Read paths don't care about `version`.

## 15. Currency

- Every monetary column is `Decimal(15,2)` with a sibling `currencyCode String @db.Char(3)` FK to `Currency`. Default `AUD` via backfill (DM-6).
- `Currency` seed data covers ISO 4217 majors; extend as needed.

## 16. Tenant Scope (DM-7.5)

Every tenant-sensitive aggregate root carries `tenantId String @db.Uuid` with `@relation` to `Tenant` (`onDelete: Restrict`). Child entities inherit tenancy through the root — no `tenantId` on child tables.

RLS policies on every scoped table: `USING (tenantId = current_setting('app.current_tenant_id')::uuid)`. The Prisma client extension sets the GUC per request via the NestJS tenant resolver.

## 17. Migration Discipline

Every migration file starts with:
```sql
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
```
and is:
- **Idempotent** — safe to re-run after a partial failure (use `IF NOT EXISTS`, `CREATE INDEX CONCURRENTLY`, `NOT VALID` + `VALIDATE` split).
- **Expand-contract** — no `ALTER COLUMN ... TYPE` on populated tables; shadow-column + backfill + swap + drop.
- **Reversible** — each migration has a companion `drop-YYYY-MM-DD.sql` or a documented rollback path.
- **Blue/green-verified** — run against the production clone + traffic replay before production cutover.
- **Two-release-safe** for any change that alters Prisma-Client TS signatures — never change a column type in the same release as the new client consuming it.
- **Self-logging** — migrations write their own start/end rows into `migration_audit` once that table exists (DM-7 or earlier).

## 18. Canonical Dictionaries

Reference data is stored as entries in `MetadataDictionary` (`entityType`, `dictionaryKey`, `entryValue`) rather than free-form columns. Canonical `entityType` keys:

| `entityType` | Purpose |
|---|---|
| `grade` | Person grade ladder |
| `job_role` | Business job roles |
| `location` | Office / country |
| `timezone` | IANA tz strings |
| `project_domain` | Business domain labels |
| `project_type` | Project classification |
| `technology` | Tech-stack labels |
| `tag` | Generic tags |
| `skill_area` | Vendor skill areas |

DM-6 migrates existing scalar strings (`Person.grade`, `Project.domain`, etc.) to dictionary FKs.

## 19. Optional Postgres Extensions

Allowed:
- `pgcrypto` — `gen_random_uuid()`, envelope encryption.
- `pg_trgm` — trigram search (DM-8).
- `pg_stat_statements`, `auto_explain` — ops (DM-8).
- `pg_jsonschema` — optional DB-side JSON validation (DM-7 considers).
- `pg_partman` — **only** when a table actively exceeds the 5M-row watermark (DM-8 runbook).
- `pgvector` — reserved for future similarity matching on skills/profiles.

Never:
- `dblink`, `postgres_fdw` (security surface).
- Anything not listed without a decision entry in `data-model-decisions.md`.

## 20. Public IDs — UUIDs Never Leave the API Boundary

**Security rule (non-negotiable):** internal UUIDs must not appear in any browser-visible surface. This includes URL path params, query strings, request/response bodies, JWT claims, SSR-rendered HTML, error messages shown to end users, referer headers, and analytics events. DMD-026 documents the rationale.

### Mechanism

Every user-facing entity carries **two** identifier columns:

| Column | Purpose | Scope |
|---|---|---|
| `id` — `String @id @db.Uuid` | Internal primary key; FKs, joins, indexes | DB only |
| `publicId` — `String @unique @db.VarChar(32)` | External, URL-safe, opaque, tenant-scoped | API, frontend, URLs |

The API layer is the only place where the mapping happens:
- **Ingress:** controllers accept `publicId`; a pipe / interceptor looks it up and attaches the internal `id` to the request before reaching services. Services and repositories only see UUIDs.
- **Egress:** response serializers replace every `id` field with the owning entity's `publicId`; relation IDs (e.g. `projectId`) are replaced with the related entity's `publicId`. UUID never leaves the serializer.

### Format

`<entityPrefix>_<base62Blob>`. The prefix is a fixed short identifier per aggregate root (see table); the blob is a Sqids-encoded integer tied to the entity type and tenant salt. Always URL-safe; never lookalike-ambiguous (avoid 0/O, 1/l).

| Aggregate | Prefix | Example |
|---|---|---|
| Person | `usr_` | `usr_9aB3Rtkm` |
| Tenant | `tnt_` | `tnt_Zx8f2RyN` |
| Project | `prj_` | `prj_2zJ9QfXk` |
| Client | `cli_` | `cli_4hNq8MzR` |
| Vendor | `vnd_` | `vnd_7JkPx3Yw` |
| OrgUnit | `org_` | `org_5vQr9NtB` |
| ResourcePool | `pool_` | `pool_KmT3wY8F` |
| ProjectAssignment | `asn_` | `asn_3gFx8VpL` |
| StaffingRequest | `stf_` | `stf_9rZy2NkM` |
| CaseRecord | `case_` | `case_8pJx4QvR` |
| TimesheetWeek | `tsh_` | `tsh_Bn5LkPmW` |
| LeaveRequest | `lvr_` | `lvr_3RtYk9BF` |
| Notification / InAppNotification | `not_` | `not_6HvNq2WzK` |
| DomainEvent | `evt_` | `evt_8KtZpR3mN` |
| Skill | `skl_` | `skl_3KnT8vWz` |
| PeriodLock | `prd_` | `prd_9MxQ4LnR` |
| PersonCostRate | `pcr_` | `pcr_7FyJ2BpM` |
| ProjectBudget | `bud_` | `bud_5HkWn3VtX` |
| ProjectRisk | `rsk_` | `rsk_2PjL8yCr` |
| ProjectRagSnapshot | `rag_` | `rag_4NtY9qFm` |
| EmploymentEvent | `emp_` | `emp_8BrK3wLp` |
| Contact | `ctc_` | `ctc_6ZyN2VkH` |
| BudgetApproval | `ba_` | `ba_4MpR8nKw` |

### Sub-entities without their own publicId

These are addressable only through their aggregate root's publicId (plus a sequence key where needed). Per aggregate-map.md:
- `PersonSkill` — via `/people/:userPublicId/skills`
- `PulseEntry` — via `/people/:userPublicId/pulse?weekStart=YYYY-MM-DD`
- `TimesheetEntry` — via `/timesheets/:weekPublicId/entries/:date`
- `StaffingRequestFulfilment` — via `/staffing-requests/:requestPublicId/fulfilments`
- `CaseStep`, `CaseParticipant` — via `/cases/:casePublicId/steps/:stepKey`
- `AssignmentApproval`, `AssignmentHistory` — via `/assignments/:asnPublicId/approvals`
- `NotificationDelivery` — via `/notifications/:notPublicId/deliveries`
- `ProjectExternalLink`, `ExternalSyncState` — via `/projects/:prjPublicId/external-links`
- `ProjectRadiatorOverride` — via `/projects/:prjPublicId/rag-snapshots/:ragPublicId/overrides`
- `ProjectRolePlan` — via `/projects/:prjPublicId/role-plans`
- `ProjectVendorEngagement` — via `/projects/:prjPublicId/vendors`
- `ProjectMilestone`, `ProjectChangeRequest` — via `/projects/:prjPublicId/milestones` etc.
- `LeaveBalance` — via `/people/:userPublicId/leave-balances`
- `OvertimeException` — via `/people/:userPublicId/overtime-exceptions`
- `PersonOrgMembership`, `PersonResourcePoolMembership`, `ReportingLine`, `Position` — via their root entity's publicId
- `CustomFieldValue`, `MetadataEntry` — via their dictionary/definition's publicId
- `RefreshToken`, `PasswordResetToken` — never addressable externally

Sub-entities (CaseStep, AssignmentApproval, etc.) expose the aggregate root's publicId plus a sequence key in the URL — they do not get their own publicId unless they are independently addressable.

Reference / platform data (Currency, PublicHoliday, NotificationChannel) use their business keys (ISO 4217, date+country, channel key) as the public identifier — no separate publicId needed.

### Generation

The Sqids library encodes an integer sequence scoped per (tenantId, entityType). Each tenant gets a salt so publicIds from one tenant cannot be guessed given publicIds from another. The mapping is stored as a `publicId` column (unique, indexed) — never re-derived on demand.

Insertion lifecycle:
1. Entity created with `id uuid DEFAULT gen_random_uuid()`.
2. BEFORE INSERT trigger OR application-level Prisma extension computes `publicId` from (tenantId, entityType, sequence) and populates the column.
3. Unique constraint on `(tenantId, publicId)` — two tenants can happen to share a publicId string without collision (they resolve to different rows under RLS).

### Lint enforcement

The `scripts/check-schema-conventions.cjs` lint has two additional rules (shipped with DM-2.5):
- `public-id-missing` — an aggregate root model does not declare a `publicId` column. Whitelist: platform reference tables, join tables with no independent identity.
- `controller-uuid-leak` — a NestJS controller method's response DTO or path param is typed as UUID. Parsed via TypeScript project references; baseline shrinks every DM-2.5 sub-phase.

Violations are blocking after DM-2.5 lands; the baseline grandfathers existing code during the rollout.

### Testing

- Unit + integration tests may assert publicId format (`^[a-z]+_[A-Za-z0-9]{8,}$`).
- E2E tests MUST NOT rely on UUID-shaped strings in URLs or request bodies — this is a test-suite guardrail enforced via a Playwright matcher.
- Database-level assertions (seed verification, DM-3 orphan finder) may use UUIDs since they operate inside the DB.

### Migration path

DM-2 and DM-2.5 are delivered together per table: each expand-contract cycle adds both the `id_new uuid` column (DM-2) and the `publicId` column (DM-2.5). Controllers, DTOs, frontend routes, and tests flip to publicId in the corresponding sub-phase. Backward-compat: during the two-release contract window, the API also accepts UUIDs and returns both forms, then drops UUID acceptance a release later.

## 21. Enforcement

| Check | Tool | Invocation |
|---|---|---|
| Convention lint | `scripts/check-schema-conventions.cjs` | `npm run schema:check` |
| Baseline write | Same | `npm run schema:check -- --write-baseline` |
| Migration shape | Manual review + this document | PR review |
| Orphan detection (DM-3) | `scripts/find-orphans.ts` | CI on every migration touching FKs |
| Timezone sanity (DM-4) | Migration preamble + verification query | Inside each relevant migration |
