# Phase 3 Checkpoint — Data Quality Audit

**Run date:** 2026-05-09
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/data-quality-audit.md](../data-quality-audit.md) — 105-model coverage matrices + per-sub-task verdict tables; 12 candidate findings (10 new + 2 cross-referenced).

## Counts

| Metric | Target | Actual |
|---|---|---|
| Sub-tasks covered | a-j (10) | a, b, c, d, e, f, g, h covered; i and j cross-referenced to Phase 2 |
| Models classified (soft-delete) | 105 | **105** (Class A:18, B:1, C:4, D:2, E:3, F:4, G:56, H:17) |
| Models in audit-column matrix | 105 | **105** (✓/✗ across 9 columns) |
| Enums classified | 60 | **60** (KEEP, MIGRATE, HYBRID) |
| Effective-dated models audited | — | 11 models, 3-axis non-uniformity |
| FK action NEEDS-FIX | — | 1 (OnboardingTourProgress.person) |
| Missing FK indexes | — | 12 |
| Postgres CHECK constraints | confirm 0 | **0** ✓ (matches HARDEN_WIRING_MAP §15.1) |

## Findings summary (≤300 words)

**Highest-value findings beyond what HARDEN_BRIEF / Phase 2 already capture:**

1. **Schema-wide actor-audit gap.** Zero of 105 models have `createdById` or `updatedById`. Some entities have purpose-specific actor FKs (`PersonReleaseRequest.initiatedByPersonId`, etc.) but no convention. Actor lookup must go through `AuditLog` joins on every read.

2. **9 clear enum→MetadataDictionary candidates** (RiskCategory, RiskStrategy, RiskReviewCadence, MilestoneStatus, LeaveRequestType, ChangeRequestSeverity, RolePlanSource, VendorContractType, VendorEngagementStatus). Plus `PersonCostRateType` (only 1 value — INTERNAL — should be dropped or expanded per **D-09**).

3. **Effective-dating non-uniformity** — three orthogonal splits: column naming (`validFrom` vs `effectiveFrom`), column type (Date vs Timestamptz), and overlap protection (4 models lack `@@unique([parent, validFrom])`). RateCard, OrgUnit, OvertimePolicy, OvertimeException, Position are the violators. RateCard is financial — drift = bug.

4. **Three approval models missing basic timestamps:** `ProjectActivationApproval` (line 177), `PersonReleaseApproval` (line 157), `StaffingRequestFulfilment` (line 2078) have neither `createdAt` nor `updatedAt`. An approval row with no time-of-decision column on the row itself.

5. **One FK action NEEDS-FIX:** `OnboardingTourProgress.person` is Cascade — should be SetNull (audit-adjacent data should survive person deletion).

6. **12 missing FK indexes** — top: `PersonSkill.skillId` (high-traffic "who has skill X"), `TimesheetEntry.timesheetWeekId` (week assembly), `ProjectActivationApproval.{requestedById, decidedById}`.

7. **Zero Postgres CHECK constraints.** Confirms HARDEN_WIRING_MAP §15.1; a low-risk bundle of 6-10 CHECKs is ready to add (allocationPercent BETWEEN 0 AND 100; effectiveTo > effectiveFrom; hoursWorked >= 0; …).

8. **Naming violations:** 10 booleans missing `is*` prefix; 2 enums (`AggregateType` 26 values, `LocalAccountSource` 4 values) in PascalCase/camelCase. The `*At/*On/*Id` conventions are otherwise observed.

9. **Class E (`isActive Boolean` only)** on Client, Tenant, Vendor — no audit-trail timestamp. Pragmatic for low-churn entities, but blocks "when did this client become inactive" analytics.

10. **Class F (`isActive` + `archivedAt`)** on HelpTip, RateCard, RateCardEntry, ResponsibilityRule — drift risk; RateCard is financial. Either document the state machine or migrate to single pattern.

**Cross-references** (do not re-mint):
- `Person.skillsets[]` vs `PersonSkill[]` — Phase 2 §1 / D-08
- `Project.tags[]/techStack[]` vs joins — Phase 2 §1 (D-94 supersedes D-10's "consolidate" half)
- StaffingRequest derived status — Phase 2 §1 / D-11
- `archivedAt` + `deletedAt` on Person/Project/OrgUnit — Phase 2 §3 / D-96

## Skills invoked

- `software-architecture` (ADR posture for any structural decision) and `tech-debt-tracker` — methodology inlined: produce **coverage matrices first, verdicts second**; refuse to recommend a fix without an explicit cost estimate; prefer cross-references to existing tracker IDs over re-minting.
- `database-architect` (concept) — applied to FK action policy (Restrict / Cascade / SetNull rule by relation type) and effective-dating uniformity check.
- `postgresql` (concept) — applied to the CHECK-constraints proposal (writeable as one ALTER TABLE per invariant).
- The spec-named `engineering:architecture` and `engineering:tech-debt` plugins are not installed; the local `software-architecture`, `tech-debt-tracker`, and `database-architect` skills cover the methodology.

## Tracker append plan (on user approval)

A new sub-heading `### Phase 3 — Data quality audit (docs/planning/data-quality-audit.md)` will be appended to the existing `## Research Findings (D-85+)` section. Each entry: checkbox + bold D-id + verdict tag + body + source pointer.

| New D-id | Description | Source row |
|---|---|---|
| D-103 | [GAP] Schema-wide actor-audit gap — 0/105 models have `createdById`/`updatedById`. Decide: denormalize on rows (cost M) or formalize "use AuditLog joins" with documented patterns + lint rule | Part 1 finding 1 |
| D-104 | [GAP] `ProjectActivationApproval` (line 177), `PersonReleaseApproval` (line 157), `StaffingRequestFulfilment` (line 2078) missing `createdAt`/`updatedAt`. Add timestamps + Prisma migration | Part 1 finding 2 |
| D-105 | [STANDARDIZE] 10 booleans missing `is*/has*/can*/should*/must*` prefix (full list in audit Part 2). One-batch rename + Prisma migration | Part 2 |
| D-106 | [STANDARDIZE] Enum value casing — `AggregateType` (26 PascalCase values) and `LocalAccountSource` (4 lowercase/snake values) should be SCREAMING_SNAKE | Part 2 |
| D-107 | [MIGRATE] 9 enums → MetadataDictionary: `RiskCategory`, `RiskStrategy`, `RiskReviewCadence`, `MilestoneStatus`, `LeaveRequestType`, `ChangeRequestSeverity`, `RolePlanSource`, `VendorContractType`, `VendorEngagementStatus`. Bundle migration; expand-migrate-contract per enum. Cross-ref §13.1 of HARDEN_WIRING_MAP | Part 3 |
| D-108 | [STANDARDIZE] Effective-dating uniformity — pick one column-name convention (`validFrom/validTo` OR `effectiveFrom/effectiveTo`); pick Timestamptz(3) and migrate `RateCard` + `PersonCostRate` from Date; add `@@unique([parent, ...From])` to OrgUnit, OvertimePolicy, OvertimeException, RateCard, Position | Part 7 |
| D-109 | [FIX] `OnboardingTourProgress.person` FK action: Cascade → SetNull (audit-adjacent data should survive person deletion). Single-line schema change + migration | Part 4 sub-task c |
| D-110 | [INDEX] Add 12 missing FK indexes — highest priority: `PersonSkill.skillId`, `TimesheetEntry.timesheetWeekId`, `ProjectActivationApproval.requestedById`, `ProjectActivationApproval.decidedById`. Consider a CI lint to prevent regressions | Part 4 sub-task d |
| D-111 | [HARDEN] Add Postgres CHECK constraints — schema currently has zero (confirms HARDEN_WIRING_MAP §15.1). Bundle 6-10 invariants: `allocationPercent BETWEEN 0 AND 100`, `effectiveTo IS NULL OR effectiveTo > effectiveFrom`, `hoursWorked >= 0`, `headcountFulfilled <= headcountRequired`, `LENGTH(reason) >= 10` (close-override), `workspendSummary IS NOT NULL OR status != 'CLOSED'` | Part 6 |
| D-112 | [DECIDE] Class E `isActive Boolean` only (Client, Tenant, Vendor) — no audit-trail timestamp. Migrate to `archivedAt` if any analytics need historical inactivity data; else document as intentionally simple | Part 5 obs 2 |
| D-113 | [DOCUMENT] Class F (`isActive` + `archivedAt`) on HelpTip, RateCard, RateCardEntry, ResponsibilityRule. **RateCard is financial** — drift causes "rate card we charged on but isActive=false" bugs. Either document state machine in schema comments (S) or migrate to single pattern (M) | Part 5 obs 3 |

(11 items; counter ends at D-113.)

## Open questions / next-session inputs

- **D-103 hinges on a decision the user owns:** convention-level actor audit — denormalize per-row (`createdById`/`updatedById`) for read performance, or keep it AuditLog-join-only and add a lint rule that enforces "every controller read returns actor info via the AuditLog read model"? The first is cheaper at read time but fans out to 105 model migrations; the second is cheaper at schema time but every controller needs explicit actor enrichment.
- **D-107 (enum→dictionary bundle)** is a multi-week migration even bundled. Consider sequencing: do we land all 9 in one Sprint or spread across Sprints 5-7 of the HARDEN_BRIEF roadmap?
- **D-108 effective-dating naming:** pick `validFrom`/`validTo` (used by 6 of 11 models, including the high-traffic ProjectAssignment + memberships) or `effectiveFrom`/`effectiveTo` (used by 5 models including financial PersonCostRate)? Recommend `effectiveFrom`/`effectiveTo` for semantic clarity (a record can have `validFrom` after which it's effective; "effective" reads better) but the cost is migrating 6 high-traffic models. Cheap inverse: rename the 5 effective-* models. **Need user call before kicking off.**

## Exit conditions hit

- ✅ Coverage matrices for all 9 audit columns × 105 models
- ✅ Per-model recommendation (KEEP/NORMALIZE/SPLIT/MERGE replaced by class-by-pattern A-H + per-issue verdicts)
- ✅ Migration sequence implied (expand → migrate → contract used in sub-tasks)
- ✅ Postgres CHECK constraints listed with SQL-ready expressions
- ✅ File:line citations
- ✅ Cross-references to Phase 2 (no re-derivation of double-truth or drift)

**Stop here.** Awaiting validation gate before tracker append + Phase 4.
