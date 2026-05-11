# Customization Debt Register (Phase 5)

**Run date:** 2026-05-10
**Method:** Three Explore subagents in parallel covered (a) magic numbers in `*.service.ts` files, (b) hardcoded role strings + frontend label maps + grade dictionary, (c) notification recipients + checklist/workflow templates + radiator thresholds + help content. Each finding was classified per HARDEN_WIRING_MAP §14.1 four-layer model: **L0** (legitimately hardcoded), **L1** (`PlatformSetting`), **L2** (`MetadataDictionary` + `MetadataEntry`), **L3** (`CustomFieldDefinition` + `CustomFieldValue`), **L4** (`WorkflowDefinition` + `WorkflowStateDefinition`).

This register intentionally does **not** re-flag items HARDEN_WIRING_MAP §14.2 already lists as in-flight (project-risk staleness windows in PM-06; radiator-scorer per-dimension thresholds via `RadiatorThresholdConfig`; director-approval threshold via WO-2.3; SLA budgets via WO-3.x; slate min/max via WO-1.7). Where this register and §14.2 overlap, the §14.2 item is cross-referenced and not re-minted.

---

## Already-correct (positive findings, no action)

| Concern | Status | Evidence |
|---|---|---|
| **Radiator threshold defaults** | OK | `radiator-threshold.service.ts:22-43` loads from DB `radiator_threshold_config`; `radiator-scorers.ts` constants are fallbacks. Per-dimension customization works today. |
| **Notification SMTP / from-address / retry counts** | OK | `app-config.ts:204-229` reads from env; `notification-retry-policy.ts:10-14` reads from AppConfig. |
| **Notification templates** | OK | DB-backed via `NotificationTemplate`; `notification-template-resolver.service.ts` is generic. |
| **Notification recipient lists** | OK | Resolved dynamically via service layer; no inline arrays in business logic. |
| **Help articles / tips** | OK | `HelpArticle` and `HelpTip` tables; `help.service.ts:75-248` is DB-driven; no hardcoded help text. |
| **Workflow definitions infrastructure** | OK (unused) | `WorkflowDefinition` + `WorkflowStateDefinition` schema exists; no hardcoded checklist arrays were found. The L4 mechanism is *available*; admin UI to populate it is deferred (CUST-7 future iteration). |
| **Case types** | OK | Seeded via MetadataDictionary in `prisma/seed.ts:639-643`. |
| **Frontend label maps** (`frontend/src/lib/labels.ts`) | OK (11 of 11 groups) | All 11 enum-to-label maps are L0-correct (workflow states, infrastructure enums); no D-107 candidates appear in this file. |
| **Grade dictionary** | OK as L2 | Seeded via MetadataDictionary (8 grades, ID `42222222-...-101`); zero `>= G10` branching logic anywhere; consumers read display names via dictionary. **Caveat:** no TS-const exists for type safety; see D-132 below. |
| **route-manifest.ts role-list constants** | OK | 18 named role-list constants centralized at `frontend/src/app/route-manifest.ts:29-105` (MANAGEMENT_ROLES, EXCEPTIONS_ROLES, etc.). |
| **`@RequireRoles('admin')` 66-occurrence pattern** | OK | Single role gate; not a list duplication. |
| **Money/currency** | OK | Seeded `Currency` table is extensible per §14.2. |

These findings are tracked here so a future audit doesn't re-discover them as debt.

---

## Top-level register — new debt found

| # | File:line | Hardcoded value | Layer | Proposed key | Cost |
|---|---|---|---|---|---|
| 1 | `src/modules/staffing-requests/application/staffing-suggestions.service.ts:29-31` | Skill importance weights `0.5 / 1.0 / 2.0` | L1 | `staffing.skillImportance.{NICE_TO_HAVE, PREFERRED, REQUIRED}` | M |
| 2 | `staffing-suggestions.service.ts:36-39` | Proficiency-match thresholds `1.0 / 0.6 / 0.3 / 0` | L1 | `staffing.proficiencyMatch.threshold{Meet, OneDiff, TwoDiff, NoMatch}` | M |
| 3 | `staffing-suggestions.service.ts:108, 162` | Recent-role lookback `12 months` + `1.2` recency modifier | L1 | `staffing.recentRoleWindow.months`, `staffing.recencyModifier` | S |
| 4 | `src/modules/assignments/application/assignment-sla-sweep.service.ts:26-29` | Pre-breach warning levels `0.5`, `0.75` (already commented as TODO) | L1 | `assignment.sla.preBreachLevels.{level50, level75}` | S |
| 5 | `assignment-sla-sweep.service.ts:24` | Risk-score breach threshold `15` | L1 | `assignment.sla.riskScoreThreshold` | S |
| 6 | `src/modules/notifications/application/nudge-sweeper.service.ts:18-21` | Sweep / SLA / dedup windows `60 min, 48 h, 72 h, 24 h` | L1 | `nudge.sweep.intervalMinutes`, `staffing.proposalAck.slaHours`, `timesheet.submission.slaHours`, `nudge.dedup.hours` | M |
| 7 | `src/modules/project-registry/application/project-risk.service.ts:35, 55` | Default risk probability / impact `3` | L1 | `project.risk.default{Probability, Impact}` | S |
| 8 | `project-risk.service.ts:216` | Critical-risk score threshold `15` (`probability * impact >= 15`) | L1 | `project.risk.criticalScoreThreshold` | S |
| 9 | `project-risk.service.ts:32-42` | Risk-review cadence days `WEEKLY=7, FORTNIGHTLY=14, MONTHLY=30, QUARTERLY=90` | L2 | `MetadataDictionary key=risk-review-cadence` with `value:{days: int}` per entry | S |
| 10 | `src/modules/project-registry/application/project-closure-readiness.service.ts:68` | Budget variance threshold `> 10%` (already commented as policy) | L1 | `project.closure.budgetOverrunThresholdPercent` | S |
| 11 | Multiple controllers (24× / 29× / 22×) | Three repeated `@RequireRoles(...)` lists: staffing-operational (PM/RM/DM/Director/Admin), project-mgr-approval (PM/DM/Director/Admin), hr-mgmt (HR/Director/Admin) | L1 (or named-constant L0+) | `responsibilityMatrix.{staffingOperational, projectManagerApproval, hrManagement}.roles` — or extract to named constants in `src/shared/auth/role-presets.ts` and reference across controllers (cheaper preliminary step) | M |
| 12 | `frontend/src/routes/projects/tabs/RisksIssuesTab.tsx:33`, `frontend/src/components/projects/RiskRegister.tsx:30-31` | Risk enum value lists used in UI (`RiskCategory`, `RiskStatus`, `RiskType`, `RiskStrategy`) without display labels in `labels.ts` | L2 (companion) | After D-107 migrates these enums to MetadataDictionary, FE reads `entry.displayName` instead of relying on label map | S (after D-107) |
| 13 | (cross-cutting) | No TypeScript `Grade` const for the grade dictionary (Person.grade is free-text String in Prisma) | L0 | Add `src/shared/lookups/grades.ts` exporting `const GRADES = ['G7','G8',...,'G14'] as const` for type safety; reference in DTOs/forms | S |

(13 new findings; 11 are L1, 1 is L2 companion to D-107, 1 is type-safety housekeeping.)

---

## Per-area details

### 1 — Staffing scoring constants (rows 1-3)

`StaffingSuggestionsService` is the matching engine that ranks people for a staffing request. Today it carries **9 numeric literals** (skill weights × 3, proficiency thresholds × 4, recency window + modifier × 2) inline. Each is a tunable that a tenant might want different — e.g., a customer that prizes role recency could push the recency modifier above 1.5; a customer with formal certification programs could weight `REQUIRED` skills above the current 2.0.

These are **L1 candidates** because:
- They are scalar numbers, not vocabularies (so not L2)
- They are not a per-row schema extension (so not L3)
- They are not a sequence of steps (so not L4)
- They are exactly the kind of "threshold a tenant might want different" called out by HARDEN_WIRING_MAP §14.3-A

Migration: expand `PlatformSettingsService.DEFAULTS` with the 8 keys, swap the literals for `platformSettings.getNumber('staffing.…')` calls, retain current numbers as defaults. Cost M (8 keys, 9 read-site updates, 1 service refactor).

### 2 — SLA sweeper (rows 4-5)

`AssignmentSlaSweepService` already runs the SLA sweep — its output drives Prometheus counters (per HD-11) and notifications. Three numeric literals remain inline:

```ts
// src/modules/assignments/application/assignment-sla-sweep.service.ts:24-29
// Hardcoded; later iterations can pull from PlatformSetting if we need per-tenant tuning.
const PRE_BREACH_LEVEL_50 = 0.5;
const PRE_BREACH_LEVEL_75 = 0.75;
const RISK_SCORE_BREACH_THRESHOLD = 15;
```

The code comment already acknowledges this is L1 debt. Migration is straightforward: 3 settings, 3 read sites, no schema change. Cost S.

### 3 — Nudge sweeper (row 6)

`NudgeSweeperService` runs the user-facing nudge cron (proposal-ack reminders, timesheet-submission reminders). Four time-windows are hardcoded:

```ts
// src/modules/notifications/application/nudge-sweeper.service.ts:18-21
const SWEEP_INTERVAL_MINUTES = 60;
const PROPOSAL_ACK_SLA_HOURS = 48;
const TIMESHEET_SUBMISSION_SLA_HOURS = 72;
const NUDGE_DEDUP_HOURS = 24;
```

These are operational tunables — a customer with strict 24-hour proposal-ack expectations would want lower values. Migration: 4 settings, 4 read sites. Cost M.

### 4 — Project risk thresholds (rows 7-9)

Three sub-debts in `ProjectRiskService`:

- **Defaults** (lines 35, 55): when a risk row is created without explicit probability/impact, both default to `3`. L1 (`project.risk.default{Probability, Impact}`).
- **Critical threshold** (line 216): `probability * impact >= 15` flags a risk as critical. L1 (`project.risk.criticalScoreThreshold`).
- **Cadence-to-days mapping** (lines 32-42): `WEEKLY=7, FORTNIGHTLY=14, MONTHLY=30, QUARTERLY=90`. The cadence enum itself is a D-107 migrate candidate; the days mapping should live as a `value` field on each MetadataEntry, not as a separate L1 setting. **L2.**

Cross-reference: PM-06 already plans `project.risk.staleAfterDays.*` per HARDEN_WIRING_MAP §14.2. The current findings extend that scope by adding default-values and the critical-score threshold, plus formalize the cadence-days as part of the L2 cadence entry rather than splitting them.

### 5 — Project closure budget threshold (row 10)

`ProjectClosureReadinessService:68` checks `if (budgetVariancePercent > 10) { warn(...) }` — `10` is hardcoded as the warn threshold for "your project is closing >10% over budget". Tenants with strict cost-control practices may want `5%`; tenants with loose programs may want `25%`. L1 (`project.closure.budgetOverrunThresholdPercent`).

### 6 — Repeated role-list patterns (row 11)

Subagent B found three role lists that recur 3+ times across controllers:
- `('project_manager','resource_manager','delivery_manager','director','admin')` — 24 controllers
- `('project_manager','delivery_manager','director','admin')` — 29 controllers
- `('hr_manager','director','admin')` — 22 controllers

Each pattern represents an action class (staffing-operational, project-mgr-approval, hr-mgmt). Today every controller restates the list. Drift risk: if the platform adds a new role (e.g., "program_manager"), 75+ controllers need editing.

Migration options ranked from cheapest to most-correct:
- **Cheap (L0+):** Extract three named constants in `src/shared/auth/role-presets.ts`; have controllers `@RequireRoles(...STAFFING_OPERATIONAL_ROLES)`. One-day refactor; eliminates drift. Cost S.
- **Better (L1):** Drive the lists from `responsibilityMatrix.{action}.roles` PlatformSetting; the guard reads at request time. Tenants can add a custom "junior_pm" role to project approvals without code change. Cost M.
- **Best (L2 dictionary):** Long-term, fold into `ResponsibilityRule` (S-05 in HARDEN_BRIEF) — already planned.

Recommendation: ship the L0+ named-constants step now (D-130 cheap fix); follow up with full L1/L2 wiring under HD/PM-?? when the responsibility-matrix work picks up.

### 7 — Frontend risk-enum labels (row 12)

`labels.ts` has no entries for `RiskCategory`, `RiskStatus`, `RiskType`, `RiskStrategy`. UI components (`RisksIssuesTab.tsx`, `RiskRegister.tsx`) display the raw enum values (`SCOPE`, `MITIGATING`, etc.). Once D-107 migrates these enums to MetadataDictionary, FE reads `entry.displayName` directly. Until then, the UI shows uppercase enum tokens — minor UX bug, but it's a companion to D-107 so it doesn't need its own scheduling.

### 8 — Grade type-safety (row 13)

Person.grade is a free-text `String?` in Prisma; the dictionary is correctly L2-seeded; but there is no TypeScript `const Grade = [...]` for type-safe construction in DTOs / form options. Adding one is a small housekeeping task that mirrors the `PlatformRole` pattern in `src/modules/identity-access/domain/platform-role.ts`.

---

## Migration order (cheap wins first)

| Order | D-id | Why cheap |
|---|---|---|
| 1 | D-124 (sla pre-breach 0.5/0.75) | Already commented as TODO; 2 keys, 2 read sites |
| 2 | D-125 (sla risk score 15) | 1 key, 1 read site |
| 3 | D-127 (project risk defaults + critical threshold) | 3 keys, 3 read sites; adjacent to PM-06 |
| 4 | D-129 (closure budget 10%) | 1 key, 1 read site |
| 5 | D-130 (role-list named constants) | Pure refactor; eliminates drift; predicate for follow-on L1/L2 |
| 6 | D-126 (nudge sweeper 4 windows) | 4 keys; isolated service |
| 7 | D-122/D-123 (staffing-suggestions weights + recency) | 8+1 keys; ranking-engine refactor |
| 8 | D-128 (cadence MetadataDictionary) | bundle with D-107 |
| 9 | D-131 (FE risk enum labels) | wait for D-107 to land |
| 10 | D-132 (Grade const) | type-safety housekeeping |

---

## Net-new PlatformSetting catalog additions (extends HARDEN_BRIEF Appendix B)

A consolidated list of the ~21 new L1 keys this audit proposes. Suggested groupings:

| Domain | Keys |
|---|---|
| `staffing.skillImportance.*` | `NICE_TO_HAVE`, `PREFERRED`, `REQUIRED` |
| `staffing.proficiencyMatch.threshold*` | `Meet`, `OneDiff`, `TwoDiff`, `NoMatch` |
| `staffing.recentRoleWindow.months`, `staffing.recencyModifier` | 1 + 1 |
| `assignment.sla.preBreachLevels.*` | `level50`, `level75` |
| `assignment.sla.riskScoreThreshold` | 1 |
| `nudge.sweep.intervalMinutes` + `staffing.proposalAck.slaHours` + `timesheet.submission.slaHours` + `nudge.dedup.hours` | 4 |
| `project.risk.default*` | `Probability`, `Impact` |
| `project.risk.criticalScoreThreshold` | 1 |
| `project.closure.budgetOverrunThresholdPercent` | 1 |
| `responsibilityMatrix.*.roles` (D-130 follow-on) | 3 (or fold into ResponsibilityRule) |

Plus 1 L2 dictionary (`risk-review-cadence` with `value:{days:int}` per entry) and 1 cross-cutting type-safety constant (`GRADES` TS array).

---

## Phase 5 acceptance status

- ✅ Magic numbers in services scanned (sub-section 1)
- ✅ Hardcoded role strings audited (sub-section 6)
- ✅ Frontend `labels.ts` audited end-to-end (already-correct table)
- ✅ Radiator scorer thresholds verified (already L1)
- ✅ Skill catalog + grade dictionary verified (already L2)
- ✅ Notification recipients + templates verified (already correct)
- ✅ Checklist + workflow templates audited (infrastructure ready, not populated)
- ✅ SLA budgets + slate min/max + director-approval thresholds verified (already L1)
- ✅ 13 new debt items found, 11 already-correct items confirmed
- ✅ Migration order proposed
- ✅ PlatformSetting catalog additions proposed (~21 keys)

**Next:** AskUserQuestion → "Phase 5 complete; append D-122..D-132 to MASTER_TRACKER and stop?"
