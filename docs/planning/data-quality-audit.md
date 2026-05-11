# Data Quality Audit (Phase 3)

**Run date:** 2026-05-09
**Method:** Four Explore subagents in parallel covered (a/h) audit-column coverage matrix + naming conventions, (b/f) enum vs MetadataDictionary classification + effective-dating uniformity, (c/d) FK action policy + index audit, (g) soft-delete and status-consistency classification of all 105 models. Sub-categories (i) "double-truth columns" and (j) "computed-vs-cached drift" were already covered by Phase 2's `functional-duplication-register.md` §1, §2, §5 and are cross-referenced rather than re-derived. Sub-category (e) "Postgres CHECK constraints" was confirmed by direct grep — zero `@@check`/`@check` directives in `schema.prisma`, consistent with HARDEN_WIRING_MAP §15.1.

Schema state: **105 models, 60 enums, 3070 lines** (note: HARDEN_WIRING_MAP says "53 Prisma models" — that figure is from 2026-05-02 and the schema has roughly doubled since).

This audit is intentionally narrower than HARDEN_BRIEF / HARDEN_WIRING_MAP — those documents enumerate fixes; this one establishes the **coverage matrices + per-model verdicts** that those fix lists assume. Where this audit and HARDEN_BRIEF overlap, this audit defers to HARDEN_BRIEF's existing D-IDs (D-08, D-10, D-11, D-21, D-24) and only mints new IDs for issues the HARDEN_BRIEF didn't identify.

---

## Part 1 — Audit-column coverage matrix (sub-task a)

For every model, the 9 audit columns checked: `createdAt`, `updatedAt`, `version`, `archivedAt`, `deletedAt`, `publicId`, `tenantId`, `createdById`, `updatedById`.

### Headline coverage

| Column | Coverage | Notes |
|---|---|---|
| `createdAt` | 88/105 (84%) | Missing mainly from system audit tables and a few operational/config models |
| `updatedAt` | 72/105 (69%) | Intentionally absent on append-only event/log/outbox models (AuditLog, OutboxEvent, DomainEvent, EmployeeActivityEvent, EmploymentEvent) |
| `version` | 15/105 (14%) | Optimistic locking is selective: CaseRecord, OrgUnit, Project, ProjectAssignment, ProjectBudget, ProjectRisk, StaffingRequest, TimesheetWeek, WorkEvidence, WorkflowDefinition, EntityLayoutDefinition, Person, PersonReleaseRequest, SetupRun |
| `archivedAt` | 29/105 (28%) | Concentrated in lifecycle entities (see Part 5 classification) |
| `deletedAt` | 3/105 (3%) | **Person, Project, OrgUnit only** — confirms Phase 2 §3 finding |
| `publicId` | 8/105 (8%) | Partial rollout; LeaveRequest, StaffingRequest, InAppNotification, Skill, PersonCostRate, ProjectBudget, TimesheetWeek, PeriodLock — no Person/Project/OrgUnit yet (CLAUDE.md memory "No UUIDs in browser" / Phase DM-2.5 in flight) |
| `tenantId` | 25/105 (24%) | Multi-tenant migration partial |
| `createdById` | **0/105 (0%)** | **Schema-wide gap** |
| `updatedById` | **0/105 (0%)** | **Schema-wide gap** |

### Three findings

1. **Schema-wide actor-audit gap.** Zero models have `createdById` or `updatedById`. Some entities have purpose-specific fields (`PersonReleaseRequest.initiatedByPersonId`, `BudgetApproval.requestedByPerson`, `BudgetApproval.decidedByPerson`, `ProjectActivationApproval.requestedById`) but there is no convention-level "who created this row / who last touched it". `AuditLog` does record an actor but is keyed on aggregate id, not denormalized onto rows. **Actor audit must be reconstructed from AuditLog joins on every read.** New D-item below.

2. **Missing audit columns on approval models.** `ProjectActivationApproval` (line 177) has neither `createdAt` nor `updatedAt` — an approval decision row with no time-of-decision column on the row itself. `PersonReleaseApproval` (line 157) is the same. `StaffingRequestFulfilment` (line 2078) also has neither. **All three need at minimum `createdAt`.**

3. **`tenantId` only on 25 models** — multi-tenant migration is in flight (Phase DM-T-?). Core tenant-scoped entities (Person, OrgUnit, Project, Client, RateCard, StaffingRequest, ProjectAssignment) are tenanted; many secondary models (NotificationDelivery, TimesheetEntry, OvertimeException) are not yet. This is expected mid-migration; flag for the DM phase planning so no model is missed.

The full 105-row matrix is included in the audit's working notes (subagent A1 output) but is too large to inline here. Spot-check pattern: most domain models are `createdAt + updatedAt` only; Class A soft-delete models (see Part 5) add `archivedAt`; lifecycle gates additionally have `version`.

---

## Part 2 — Naming convention audit (sub-task h)

Convention rules per CLAUDE.md and DM-1: camelCase fields, `*At` for timestamps, `*On` for date-only, `*Id` for FKs, `is*/has*/should*/can*` for booleans, PascalCase model names, SCREAMING_SNAKE enum values.

### Boolean prefix violations (15 fields)

| Model | Field | Suggested rename |
|---|---|---|
| `Contact` | `verified` | `isVerified` |
| `HelpFeedback` | `wasHelpful` | (acceptable; `was*` past-tense is OK) |
| `LocalAccount` | `twoFactorEnabled` | `isTwoFactorEnabled` |
| `LocalAccount` | `mustChangePw` | `mustChangePassword` (also fix abbreviation) |
| `M365DirectoryReconciliationRecord` | `sourceAccountEnabled` | `isSourceAccountEnabled` |
| `PersonExternalIdentityLink` | `sourceAccountEnabled` | `isSourceAccountEnabled` |
| `PersonNotificationPreference` | `enabled` | `isEnabled` |
| `PersonSkill` | `certified` | `isCertified` |
| `Project` | `wouldStaffSameWay` | (acceptable; `would*` is a predicate) |
| `ProjectAssignment` | `requiresDirectorApproval` | (acceptable; `requires*` is a predicate) |
| `ProjectChangeRequest` | `outOfBaseline` | `isOutOfBaseline` |
| `ProjectRetrospective` | `wouldStaffSameWay` | (acceptable) |
| `TimesheetEntry` | `capex` | `isCapex` |
| `TimesheetWeek` | `overtimeApproved` | `isOvertimeApproved` |
| `WorkEvidence` | `capex` | `isCapex` |

Net real violations after applying the "predicates also OK" rule: ~10 fields. Of these, `LocalAccount.mustChangePw` is also an abbreviation issue.

### Enum value naming (37 violations)

- `AggregateType` (26 values: `Person, Tenant, Project, Client, ...`) — PascalCase, should be SCREAMING_SNAKE.
- `LocalAccountSource` (4 values mixed: `local, ldap, azure_ad, google, okta`) — should be all uppercase.

These are the only enums with non-conformant value casing. The other 58 enums use SCREAMING_SNAKE consistently.

### Model name violations

Four "system-audit" models use snake_case: `capacity_audit`, `ddl_audit`, `migration_audit`, `honeypot_alerts`. These are SQL-side bookkeeping tables emitted by SQL migrations and may have been registered in `schema.prisma` for type generation only. **Not user-facing; treat as a documentation comment in the schema rather than a rename.** The cost of renaming the system audit tables is real (DDL change + downstream consumers) and the upside is small. Recommendation: leave them and add a short schema comment.

### Three observations

- Boolean prefix violations are scattered, not concentrated — no single model is a serial offender.
- The `AggregateType` enum is the largest single naming-violation bundle (26 values). Worth fixing in one pass.
- Date vs timestamp naming is mostly correct (`*At` for Timestamptz, no obvious `*At` columns that store dates), confirmed by spot-checks.

---

## Part 3 — Enum vs MetadataDictionary classification (sub-task b)

Per HARDEN_WIRING_MAP §13.1: enum when values are part of code branching logic (`switch (status)`); MetadataDictionary when values are tenant-extensible vocabularies that don't change code paths.

The full classification of all 60 enums is in subagent B1's output. Here are the conclusions.

### Clear MIGRATE candidates (admin-managed taxonomies, no code branches)

| Enum | Values | Why MIGRATE |
|---|---|---|
| `RiskCategory` | SCOPE, SCHEDULE, BUDGET, BUSINESS, TECHNICAL, OPERATIONAL | 9 code references, all to enum imports — no `switch`/`case` |
| `RiskStrategy` | MITIGATE, ACCEPT, TRANSFER, AVOID, ESCALATE | 5 references, all to enum imports |
| `RiskReviewCadence` | WEEKLY, FORTNIGHTLY, MONTHLY, QUARTERLY | 0 references — admin scheduler reads value |
| `MilestoneStatus` | PLANNED, IN_PROGRESS, HIT, MISSED | 6 references, no branches |
| `LeaveRequestType` | ANNUAL, SICK, PARENTAL, COMPASSIONATE, UNPAID, OTHER, OT_OFF, PERSONAL, BEREAVEMENT, STUDY | 6 references, no branches; tenant-extensible by design |
| `ChangeRequestSeverity` | LOW, MEDIUM, HIGH, CRITICAL | 8 references, mostly serializer/UI |
| `RolePlanSource` | INTERNAL, VENDOR, EITHER | 0 references |
| `VendorContractType` | STAFF_AUGMENTATION, FIXED_DELIVERABLE, MANAGED_SERVICE | 0 references |
| `VendorEngagementStatus` | ACTIVE, COMPLETED, TERMINATED | 0 references |
| `PersonCostRateType` | INTERNAL (only) | Singleton — should either be deleted or migrated to `MetadataDictionary` once a second value is added (D-09 in HARDEN_BRIEF tracks adding bill-rate; this enum is a precursor) |

### Clear KEEP enums (state machines with code branching)

| Enum | Refs | Why KEEP |
|---|---|---|
| `AssignmentStatus` (9-state) | 98 refs | Core state machine; `TransitionProjectAssignmentService` switches on every value |
| `ReportingLineType` | 54 refs | Hierarchy rules branch by type |
| `ProjectStatus` | 18 refs | Lifecycle gates (e.g., DRAFT → PENDING_APPROVAL → ACTIVE) |
| `ResponsibilityActionKind`, `ResponsibilityScope`, `ResponsibilityResolutionMode` | many | Rule engine — code iterates all values |
| `EngagementModel` | many | Billing logic branches on model |
| `ApprovalDecision`, `BudgetApprovalStatus`, `LeaveRequestStatus`, `TimesheetStatus`, `CaseStatus` | many | All approval/lifecycle state machines |

### HYBRID candidates

| Enum | Why hybrid |
|---|---|
| `ProjectPriority` (LOW/MEDIUM/HIGH/CRITICAL) | Code uses for sort weight, but customers want their own labels; canonical 4 stay, label customization via dictionary |
| `StaffingRequestPriority` (LOW/MEDIUM/HIGH/URGENT) | Same as above |
| `RiskStatus` | `CONVERTED_TO_ISSUE` is code-driven (creates `Issue` row); IDENTIFIED–RESOLVED is admin taxonomy |

### Three observations

1. **9 clear MIGRATE candidates + 1 singleton** is the highest-value cleanup batch — these are the "DDS-4 not applicable" type enums per HARDEN_WIRING_MAP §13.1.
2. **No enum is duplicated by an existing MetadataDictionary row** — the worst case (a feature half-built in both forms) doesn't exist.
3. **`PersonCostRateType` has only one value (INTERNAL)** — confirms HARDEN_BRIEF D-09 indirectly. Either drop the enum (single-value enums are pure overhead) or expand it to support the bill-rate variant proposed by D-09.

---

## Part 4 — FK action policy + Index audit (sub-tasks c, d)

### Sub-task c — FK action policy

Walk all `@relation(...)` directives in schema.prisma; classify `onDelete:` policies. Most relations use the default (Restrict). Explicit policies are scattered.

**Patterns observed:**
- **Restrict (12 explicit + many implicit defaults):** Most parent-child relations (PersonReleaseRequest → Person, BudgetApproval → Person)
- **Cascade (15 explicit):** Lifecycle children (CaseStep → CaseRecord, RateCardEntry → RateCard, MetadataEntry → MetadataDictionary, WorkflowStateDefinition → WorkflowDefinition, StaffingRequestProposalCandidate → Slate, etc.)
- **SetNull (16 explicit):** Audit/log-adjacent (AuditLog.actor → Person, EmployeeActivityEvent.actor → Person, M365ReconciliationRecord.person → Person, ResponsibilityRule.targetPerson → Person, HelpArticle.author → Person, RateCard.client → Client)

**Single NEEDS-FIX found:**

| Parent | Relation | Child | Current | Recommended |
|---|---|---|---|---|
| `Person` | `OnboardingTourProgress.person` (line 1873) | OnboardingTourProgress | **Cascade** | **SetNull** |

OnboardingTourProgress is an audit-adjacent record (tutorial completion is informational; it should survive person deletion if there's ever a hard delete or merge). Single-line fix in the Prisma schema + migration.

Other relations all match the policy pattern correctly. CaseRecord's children split correctly: `CaseStep` and `CaseParticipant` are Restrict (business-logic critical), `overtimeExceptions` and `relatedProjectRisks` are SetNull (optional refs). `BudgetApproval.decidedByPerson` is Restrict — defensible (don't delete a person who decided budget approvals; force re-route).

### Sub-task d — Index audit

12 FK columns lack a matching `@@index([...])` directive (some have unique constraints, which Postgres auto-indexes — listed but lower priority).

| Model | Missing FK index | Notes |
|---|---|---|
| `PersonReleaseRequest` | `initiatedByPersonId` | List-by-initiator query path |
| `ProjectActivationApproval` | `requestedById`, `decidedById` | Approval queue queries by requester/approver |
| `Client` | `accountManagerPersonId` | "Show me clients I manage" |
| `ProjectAssignment` | `appliedRateCardEntryId` | Rate-card audit traceability |
| `ExternalSyncState` | `projectExternalLinkId` | @unique exists; explicit index optional |
| `OvertimePolicy` | `setByPersonId` | Audit query |
| `PersonSkill` | `skillId` | "Who has this skill?" — high-traffic |
| `TimesheetEntry` | `timesheetWeekId` | Week-by-week timesheet builds; high traffic |
| `WorkEvidenceLink` | `workEvidenceId` | Join-heavy for evidence views |
| `ProjectRisk` | `convertedFromRiskId` | Risk → issue traceability |
| `ProjectRetrospective` | `facilitatedByPersonId` | "Retros I facilitated" |

The two highest-impact: **`PersonSkill.skillId`** (any "who has skill X" query scans the table), and **`TimesheetEntry.timesheetWeekId`** (week assembly is a core read path).

### Three observations

- 12 missing FK indexes is consistent with "convention drift" in newer migrations; a CI check (`scripts/schema-fk-index-check.cjs`?) would prevent regressions but doesn't exist.
- Most missing indexes are on optional-Person FKs (`facilitatedByPersonId`, `setByPersonId`, `initiatedByPersonId`) — agents adding these columns may have skipped the index because the column is rarely queried.
- The index audit is a strict subset of the proper "query-pattern audit"; only FK-index gaps are surfaced here. A query-pattern audit (which composite indexes are needed for the most-frequent WHERE clauses) is out of scope for Phase 3 — best done with `pg_stat_statements` from a live workload, not from static schema reading.

---

## Part 5 — Soft-delete and status-consistency classification (sub-task g)

All 105 models classified into 8 lifecycle classes:

| Class | Pattern | Count | Examples |
|---|---|---|---|
| **A** | `archivedAt` only | 18 | Position, ResourcePool, MetadataDictionary, NotificationTemplate, HelpArticle, PlannerScenario, … |
| **B** | `archivedAt` + `deletedAt` | **1** | **Person** (Phase 2 §3) |
| **C** | `archivedAt` + status enum | 4 | CaseRecord, ProjectAssignment, WorkEvidence, WorkflowDefinition |
| **D** | `archivedAt` + `deletedAt` + status enum (triple) | **2** | **OrgUnit, Project** (Phase 2 §3) |
| **E** | `isActive Boolean` only | 3 | Client, Tenant, Vendor |
| **F** | `isActive Boolean` + `archivedAt` | 4 | HelpTip, RateCard, RateCardEntry, ResponsibilityRule |
| **G** | none (intentional — no soft-delete) | 56 | AuditLog, OutboxEvent, DomainEvent, all `*Reconciliation`, all `*Token`, system-audit tables |
| **H** | status enum only (transient/event lifecycle) | 17 | LeaveRequest, ProjectChangeRequest, ProjectRisk, ProjectVendorEngagement, NotificationDelivery, OutboxEvent's status sibling, etc. |

Total: 105 ✓ (18 + 1 + 4 + 2 + 3 + 4 + 56 + 17).

### Five observations

1. **Class B and D — confirmed Phase 2 §3.** Person, Project, OrgUnit have dual or triple soft-delete state. **D-96 (Phase 2)** owns the decision tree: does GDPR purge use `deletedAt` or not? No separate D-item needed here.

2. **Class E — `isActive Boolean` only on Client, Tenant, Vendor.** All three are low-churn external entities. The pragmatic question: do any analytics/audit queries need to know *when* a Client/Vendor became inactive? If yes, migrate to `archivedAt` (cost M); if no, document the simplification. New D-item below.

3. **Class F — `isActive` + `archivedAt` mixed (HelpTip, RateCard, RateCardEntry, ResponsibilityRule).** Phase 2 §3 already flagged via the `isActive`-vs-`archivedAt` cleanup discussion. **Critical risk: RateCard is financial.** If `isActive=false` and `archivedAt IS NULL` mean different things (e.g., temporarily disabled vs retired), code must check both. If they're meant to be redundant, drift will eventually produce a "rate card we charged on but isActive=false" bug. New D-item below.

4. **Class H — 17 status-only models.** Transient/event lifecycle is correct architecture; soft-delete doesn't apply to a sent notification. **Edge case: LeaveRequest.** It has lifecycle (PENDING/APPROVED/REJECTED/CANCELLED) but a withdrawn request might want to be "soft-deleted" for re-submission. Currently, withdrawal mutates status. Acceptable for now; flag if PM-/HR work introduces a "restore withdrawn request" UX.

5. **Class G — 56 "no soft-delete" models.** Spot-check confirms these are correct: AuditLog (immutable), tokens (TTL-driven), reconciliation records (re-synced), outbox events (transient), system-audit tables (Postgres-side bookkeeping).

---

## Part 6 — Postgres CHECK constraints (sub-task e)

Direct grep: `grep -nE "@@check|@check\(" prisma/schema.prisma` returns **zero matches**.

This confirms HARDEN_WIRING_MAP §15.1: there are **no Postgres CHECK constraints in the schema**. Every invariant is enforced in TypeScript/service code.

**Recommended low-risk constraints to add** (each is a one-line ALTER TABLE):
- `CHECK (allocationPercent BETWEEN 0 AND 100)` on `ProjectAssignment` (allocationPercent currently a Decimal; can write 150)
- `CHECK (effectiveTo IS NULL OR effectiveTo > effectiveFrom)` on every effective-dated model (PersonCostRate, RateCard, ReportingLine, ProjectAssignment, PersonOrgMembership, PersonResourcePoolMembership, Position, OrgUnit, OvertimePolicy, OvertimeException) — ten tables
- `CHECK (hoursWorked >= 0)` on TimesheetEntry
- `CHECK (headcountFulfilled <= headcountRequired)` on StaffingRequest (related to D-95 but enforces invariant even with the cached column)
- `CHECK (LENGTH(reason) >= 10)` on close-override audit entries (already enforced in service; CHECK is belt-and-braces)
- `CHECK (workspendSummary IS NOT NULL OR status != 'CLOSED')` on Project (close generates summary)

These are idempotent migrations; cost S each. Single new D-item to plan the bundle.

---

## Part 7 — Effective-dating coverage (sub-task f)

11 effective-dated models. The pattern is **non-uniform** in three orthogonal ways.

| Model | from-col | to-col | nullable to? | from-type | indexed? | overlap-prevented? |
|---|---|---|---|---|---|---|
| PersonCostRate | `effectiveFrom` | (none) | n/a | **Date** | no composite | **NO** |
| RateCard | `validFrom` | `validTo` | yes | **Date** | `(clientId, isActive)` (not from) | **NO** |
| RateCardEntry | (inherits via parent) | — | — | — | `(rateCardId, isActive)` | yes `@@unique([rateCardId, staffingRole, grade])` |
| ReportingLine | `validFrom` | `validTo` | yes | Timestamptz | `(subjectPersonId, relationshipType, validFrom, validTo)` | yes |
| ProjectAssignment | `validFrom` | `validTo` | yes | Timestamptz | `(personId, status, validFrom, validTo)` | yes `@@unique([personId, projectId, validFrom])` |
| PersonOrgMembership | `validFrom` | `validTo` | yes | Timestamptz | `(personId, validFrom, validTo)` | yes |
| PersonResourcePoolMembership | `validFrom` | `validTo` | yes | Timestamptz | `(personId, validFrom, validTo)` | yes |
| Position | `validFrom` | `validTo` | yes | Timestamptz | `(orgUnitId, validFrom, validTo)` | partial |
| OrgUnit | `validFrom` | `validTo` | yes | Timestamptz | **none** | **NO** |
| OvertimePolicy | `effectiveFrom` | `effectiveTo` | yes | Timestamptz | `(orgUnitId, effectiveFrom)` | **NO** |
| OvertimeException | `effectiveFrom` | `effectiveTo` | **NO** | Timestamptz | `(personId, effectiveFrom, effectiveTo)` | **NO** |

### Three observations

1. **Naming is split** — `validFrom/validTo` (org/membership/assignment cluster) vs `effectiveFrom/effectiveTo` (cost/overtime cluster). Unify or formally split — but a templatable `EffectiveAtResolver` (HARDEN_WIRING_MAP §13.1 line 1527) can't work with both names.
2. **Type is split** — `RateCard` and `PersonCostRate` use `Date` (no time) while everything else is `Timestamptz(3)`. Same query templates can't span both; date-only "as of" queries on a Timestamptz column require explicit timezone handling.
3. **Overlap protection missing on 4 models** — OrgUnit, OvertimePolicy, OvertimeException, and partly Position lack `@@unique([parent, validFrom])` constraints. This allows two active rows for the same parent at the same start date — silent data corruption. RateCard also has no `@@unique([clientId, validFrom])` — risk of dueling rate cards for one client.

---

## Top-level register (this audit's new findings)

Each row is a candidate for a new D-item; cross-references existing tracker items where possible.

| # | Concept | Rec | Cost | Closing task |
|---|---|---|---|---|
| 1 | No `createdById`/`updatedById` on any of 105 models | Add convention-level actor audit; either denormalize on rows or formalize "use AuditLog joins" with documented patterns | M | new |
| 2 | `ProjectActivationApproval`, `PersonReleaseApproval`, `StaffingRequestFulfilment` missing `createdAt`/`updatedAt` | Add timestamps + Prisma migration | S | new |
| 3 | 10 booleans missing `is*/has*/can*/should*/must*/was*/would*` prefix | Rename + Prisma migration; net-impact small if done in one batch | S | new |
| 4 | `AggregateType` (26 PascalCase values), `LocalAccountSource` (4 lowercase) — should be SCREAMING_SNAKE | Rename enum values + Prisma migration | S | new |
| 5 | 9 enums clearly should be MetadataDictionary (RiskCategory, RiskStrategy, RiskReviewCadence, MilestoneStatus, LeaveRequestType, ChangeRequestSeverity, RolePlanSource, VendorContractType, VendorEngagementStatus) | Migration playbook — for each, expand-migrate-contract, with the dictionary populated to current values; cost depends on number of references | M each | new (bundle) |
| 6 | `PersonCostRateType` enum has only 1 value | Either drop, or fold into D-09 (bill-rate addition) — Phase 2 §1 already cross-references | S | cross-ref **D-09** |
| 7 | Effective-dating columns inconsistent: `validFrom/validTo` vs `effectiveFrom/effectiveTo`; Date vs Timestamptz; no overlap protection on 4 models | Standardize: pick `effectiveFrom/effectiveTo` (or pick `validFrom/validTo`); pick Timestamptz; add `@@unique([parent, effectiveFrom])` to OrgUnit, OvertimePolicy, OvertimeException, Position, RateCard | M | new |
| 8 | `OnboardingTourProgress.person` FK action: Cascade should be SetNull | One-line fix + migration | S | new |
| 9 | 12 missing FK indexes (notably `PersonSkill.skillId`, `TimesheetEntry.timesheetWeekId`, `ProjectActivationApproval.{requestedById,decidedById}`) | Add `@@index([...])` directives + migration; consider a CI check to prevent regressions | S | new |
| 10 | Zero Postgres CHECK constraints in schema; bundle of low-risk invariants ready to add | Single migration adds 6-10 CHECKs; each is one ALTER TABLE | S | new (bundle) |
| 11 | Class E `isActive Boolean` only (Client, Tenant, Vendor) — no audit-trail timestamp | Decide: migrate to `archivedAt` for audit-trail support, or document as intentionally simple | M (if migrate) | new |
| 12 | Class F mixed (`isActive` + `archivedAt`) on HelpTip, RateCard, RateCardEntry, ResponsibilityRule — RateCard is financial, drift = bug | Document state-machine in schema comments (cost S) OR migrate to single pattern (cost M) | S/M | new |

---

## Refuted candidates

| Candidate | Verdict | Reason |
|---|---|---|
| `Person.skillsets[]` vs `PersonSkill[]` | **Already covered** | Phase 2 §1 row 1; HARDEN_BRIEF D-08 |
| `Project.tags[]` / `techStack[]` vs join tables | **Already covered** | Phase 2 §1 row 2-3, supersedes HARDEN_BRIEF D-10 |
| `StaffingRequest.status` vs derived | **Already covered** | Phase 2 §1 row 4, HARDEN_BRIEF D-11 |
| `archivedAt` + `deletedAt` on Person/Project/OrgUnit | **Already covered** | Phase 2 §3, D-96 |
| StaffingRequest 5-state vs ProjectAssignment 9-state | **Not a duplicate** | HARDEN_BRIEF D-21 — rollup vs detail (correct architecture) |
| RAG snapshot override vs auto-computed | **Not a duplicate** | Intentional design (`isOverridden` flag) |
| 4 system-audit tables in snake_case (capacity_audit, ddl_audit, migration_audit, honeypot_alerts) | **Doc-only** | SQL-side bookkeeping; rename cost > value |
| Class G models with no soft-delete | **Intentional** | Audit logs / outbox / events / tokens / reconciliation are short-lived or immutable by design |

---

## Phase 3 acceptance status

- ✅ Audit-column coverage matrix produced (sub-task a)
- ✅ Naming convention audit produced (sub-task h)
- ✅ Enum vs MetadataDictionary classification produced (sub-task b) — 9 MIGRATE candidates identified
- ✅ FK action policy audit produced (sub-task c) — 1 NEEDS-FIX
- ✅ Index audit produced (sub-task d) — 12 missing FK indexes
- ✅ Postgres CHECK constraints confirmed zero (sub-task e)
- ✅ Effective-dating coverage audit produced (sub-task f) — 4 models lacking overlap protection
- ✅ Soft-delete consistency classification of all 105 models produced (sub-task g)
- ✅ Sub-tasks (i) double-truth and (j) drift cross-referenced to Phase 2 — no re-derivation
- ✅ Per-concept recommendations with cost estimates
- ✅ Refuted candidates section

**Next:** AskUserQuestion → "Phase 3 complete; append D-103..D-NN to MASTER_TRACKER and stop?"
