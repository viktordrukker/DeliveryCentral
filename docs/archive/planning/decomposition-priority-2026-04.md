# Delivery Central — Prioritized Decomposition
**Date:** 2026-04-06  
**Method:** Pareto (80/20), dependency-first, algorithmic unfair advantages  
**Scope:** All remaining work from QA report + Product Roadmap Phases A–G

---

## 1. Framing

The platform's single core loop is:

```
People → Assignments → Evidence → Reporting
```

Everything that makes this loop faster, more trustworthy, or more visible is high value.  
Everything else is either a blocker (bugs), an amplifier (UX), or a moat (unfair advantages).

**Dependency rule:** items with zero external system dependencies (no SSO, no Jira, no email
provider, no third-party SDK) are ranked above equivalent-value items that do have them.  
We can ship internal items in any order. External items require coordination and integration time.

---

## 2. Pareto Analysis — What 20% of Remaining Work Delivers 80% of Value?

The 85-item backlog + 28 QA bugs = 113 items total.  
The Pareto 20% = **23 items**. These are identified below as **[PARETO]**.

**Why these 23:** they either (a) fix a trust-breaking defect on the critical path,
(b) unlock a workflow that has zero workaround, or (c) create durable structural value
(e.g. utilization reporting) that every other feature builds on.

---

## 3. Tier 0 — Bug Zero (No External Dependencies, Ship First)

> These block trust. A product with a visible bearer token or UUID display cannot be demoed
> to any customer regardless of how good everything else is.

| # | Item | Effort | PARETO | Tracker Ref |
|---|------|--------|--------|-------------|
| 0-1 | Remove bearer token display from `/admin/people/new` | XS | ✓ | A-C01 |
| 0-2 | Route RBAC guards on all `/admin/*` — redirect to Access Denied | S | ✓ | A-C02 |
| 0-3 | Fix case owner dropdown → person UUID not account UUID | S | ✓ | A-C03 |
| 0-4 | JOIN project name on assignment queries (UUID → display name) | S | ✓ | A-C04 |
| 0-5 | Custom 404 / error boundary page inside app shell | S | ✓ | A-C06 |
| 0-6 | Fix date locale to `en-US` everywhere (remove Russian placeholder) | XS | ✓ | A-H05 |
| 0-7 | Fix breadcrumb: single accurate breadcrumb, no "HOME / DASHBOARD" fallback | S | ✓ | A-H04 |
| 0-8 | Fix whitespace layout: `min-height` + `flex-grow` on main content | XS | | A-H07 |
| 0-9 | Hide "Approve" button when assignment is already APPROVED | XS | | A-H03 |
| 0-10 | Auto-populate "As of" date to today on all dashboards | XS | | A-M08 |

**Implementation order:** 0-1 (security), then 0-2 (security), then 0-4 (data integrity,
affects every demo), then 0-6/0-7/0-8 (all polish the shell), then 0-3/0-5/0-9/0-10.

**No external dependencies.** All are frontend or a one-line backend JOIN.

---

## 4. Tier 1 — Core Loop Completeness (No External Dependencies)

> These are the features that make the platform usable for its primary use case.
> Every item here is pure NestJS + React + PostgreSQL. Zero external systems.

### 4a. Supply & Demand Staffing Pipeline (Phase 13 / Phase D overlap)

This is the largest functional gap. The core loop currently breaks at the boundary between
"PM needs someone" and "RM finds them." Phase 13 is already designed — implement it first.

| # | Item | Effort | PARETO | Tracker Ref |
|---|------|--------|--------|-------------|
| 1-1 | StaffingRequest schema + Prisma migration | S | ✓ | 13-A1 to A5 |
| 1-2 | PM creates staffing request (role, skills, dates, urgency) | M | ✓ | 13-B2, 13-D2 |
| 1-3 | RM views incoming request queue; proposes candidate | M | ✓ | 13-B8, 13-D7 |
| 1-4 | PM accepts/rejects fulfilment in 2 clicks | S | ✓ | 13-B9, 13-D3 |
| 1-5 | Overallocation conflict detection on assignment create/amend | S | ✓ | ASN-03 / D-04 |
| 1-6 | Staffing request notification events (submitted/fulfilled/cancelled) | S | | 13-C1 to C4 |

**Implementation note on 1-5 (Overallocation Detection):**
Pure database query — no ML, no heuristics:
```sql
SELECT SUM(allocation_percent)
FROM project_assignment
WHERE person_id = $personId
  AND status IN ('ACTIVE','APPROVED')
  AND valid_from <= $endDate
  AND (valid_to IS NULL OR valid_to >= $startDate)
```
If result + new_allocation > 100, return 409 with breakdown. Add this check in
`CreateProjectAssignmentService` and `AmendProjectAssignmentService`.

### 4b. Utilization Reporting (Phase E core)

The #1 metric for every target customer. Already have all the underlying data.

| # | Item | Effort | PARETO | Tracker Ref |
|---|------|--------|--------|-------------|
| 1-7 | `GET /reports/utilization?from=&to=&orgUnitId=` — assignment hours / available hours per person | M | ✓ | RPT-01 |
| 1-8 | Utilization page: per-person table + department rollup heat map | M | ✓ | RPT-01 |
| 1-9 | Billable vs non-billable flag on projects; surface in utilization report | S | ✓ | TME-06 |

**Algorithm for utilization:**
- `available_hours = workdays_in_period × std_hours_per_day` (from platform settings)
- `assigned_hours = SUM(allocation_percent / 100 × available_hours)` per active assignment per period
- `actual_hours` = SUM(approved timesheet entries in period)
- `utilization = actual_hours / available_hours × 100`
- Aggregate per org unit by averaging person utilization, weighted by FTE count.

### 4c. People Foundation Gaps (Phase B)

HR cannot onboard properly without these. All internal CRUD — no dependencies.

| # | Item | Effort | PARETO | Tracker Ref |
|---|------|--------|--------|-------------|
| 1-10 | Grade dictionary: admin CRUD, populate grade dropdown on employee form | M | ✓ | B-01 / ORG-01 |
| 1-11 | Role assignment on employee creation (RBAC role dropdown) | S | ✓ | B-02 / IAM-03 |
| 1-12 | Employee status filter (Active / Inactive / All) + search includes INACTIVE | S | ✓ | B-03 / A-C05 |
| 1-13 | Employee create form: hire date, line manager, location, job title | M | | B-05,B-06 |
| 1-14 | Auto-redirect to new entity detail after creation | XS | | A-M01 |

### 4d. Case Workflow Baseline (Phase C)

Cases are currently status labels. Adding steps converts them into actual workflows.

| # | Item | Effort | PARETO | Tracker Ref |
|---|------|--------|--------|-------------|
| 1-15 | Case type dictionary (managed dropdown, not free text) | S | | C-02 / CAS-05 |
| 1-16 | Workflow steps: add/complete steps on a case; case auto-closes when all done | M | ✓ | C-01 / CAS-02 |
| 1-17 | Case participant count fix: count subject + owner | XS | | A-H06 |
| 1-18 | Case comments / activity log | M | | C-04 / CAS-04 |

---

## 5. Tier 2 — Amplifiers (High Value, No External Dependency)

> These amplify existing functionality. Not critical-path, but each delivers strong
> ROI for the effort and has zero external system dependency.

| # | Item | Effort | PARETO | Tracker Ref |
|---|------|--------|--------|-------------|
| 2-1 | Bench / available capacity view: who is available, when, how much | M | ✓ | D-03 / ASN-05 |
| 2-2 | Assignment extension workflow: extend end date with approval (no new assignment) | M | | D-05 / ASN-06 |
| 2-3 | Timesheet auto-populate rows from active assignments | S | ✓ | E-04 / TME-01 |
| 2-4 | Headcount + utilization trend charts (12-month exec view) | M | | E-06 / RPT-06 |
| 2-5 | Bulk employee import (CSV/XLSX → preview → confirm → create) | M | ✓ | F-02 / ORG-10 |
| 2-6 | Mobile / responsive layout (timesheets + assignment viewing) | L | | F-07 / UXP-05 |
| 2-7 | Case templates per type: auto-populate steps (e.g. Onboarding = 8 steps) | M | | C-03 / CAS-06 |
| 2-8 | XLSX export on all list pages (standardize remaining gaps) | S | | E-05 / RPT-05 |
| 2-9 | Employee self-service profile editing (own contact info, skills) | S | | ORG-13 |
| 2-10 | Notification preferences per user (opt in/out of types) | S | | F-08 / NOT-04 |

**Note on 2-5 (Bulk Import):** No external dependency. Algorithm:
parse CSV row → validate required fields → batch upsert via `createMany` in chunks of 100 →
return summary (created / skipped / failed) with per-row error detail. Use the existing
`seedDataset` pattern already in the codebase.

---

## 6. Tier 3 — Enterprise Unlocks (Some External Dependencies)

> These require external system integration. They are high value but cannot be started
> without external credentials, SDKs, or environment setup.

| # | Item | Effort | External Dep | Tracker Ref |
|---|------|--------|--------------|-------------|
| 3-1 | OIDC/SSO (Azure AD, Okta) | L | Azure AD tenant / Okta org | F-01 / IAM-06 |
| 3-2 | Jira integration config UI (connect, map projects, configure sync) | M | Jira Cloud credentials | F-03 / INT-01 |
| 3-3 | M365 Directory sync UI | M | Azure AD + Graph API | F-04 / INT-02 |
| 3-4 | OpenAPI / Swagger docs exposure | S | None (internal) | F-06 / INT-04 |
| 3-5 | Webhook / event API | M | None (internal) | INT-05 |
| 3-6 | HRIS integration (BambooHR, Workday) | L | HRIS credentials | INT-06 |

**3-4 and 3-5 have no external dependencies** — reprioritize them into Tier 2:
- Swagger is already at `/api/docs` (NestJS default) — this is a configuration item, not a build item.
- Webhook API is pure outbound HTTP from our backend — no external account required.

---

## 7. Tier 4 — Algorithmic Unfair Advantages

> The roadmap calls these "AI-powered." Every single one is achievable with deterministic
> algorithms that are faster, auditable, and cheaper than ML. Detailed specifications below.

### 7.1 — Skill Match Scoring Algorithm (replaces "AI-powered skill matching")

**What it does:** Given a staffing request with required skills, rank the available
candidate pool by fit score.

**Algorithm — Weighted Skill Coverage Score:**

```
score(candidate, request) =
  Σ over required_skills:
    skill_match_score(candidate_skill, required_skill)
    × skill_importance_weight(required_skill)
  × availability_modifier(candidate, request.startDate, request.endDate)
  × recency_modifier(candidate, required_skill)
```

Where:
- `skill_match_score`: exact proficiency match = 1.0; one level below = 0.6; two levels below = 0.3; above required = 1.0 (overskilled is fine); missing = 0
- `skill_importance_weight`: `REQUIRED` skills = 2.0, `PREFERRED` = 1.0, `NICE_TO_HAVE` = 0.5
- `availability_modifier`: `1.0 - (sum_of_active_allocation_in_period / 100)` clamped to [0, 1]
  - person at 80% allocation gets modifier 0.2 (only 20% capacity remaining)
- `recency_modifier`: 1.2 if skill was used in an active assignment in last 12 months; 1.0 otherwise
  - source: `project_assignment.staffingRole` contains skill category; cross-reference `person_skill`

**Output:** ranked list with score, score breakdown per skill, and available capacity %.

**Implementation:** `GET /staffing-requests/suggestions?requestId=` in `StaffingRequestSuggestionsService`.
Already stubbed in Phase 13 plan (13-B10). Pure SQL + TypeScript computation, < 50ms on 1000 people.

**No model training. No external service. Fully explainable.** Each score breakdown is
shown to the RM so they understand why a candidate ranked where they did.

---

### 7.2 — Capacity Forecast Algorithm (replaces "Predictive capacity planning")

**What it does:** Given today's assignment data, forecast bench size week-by-week for
the next 90 days.

**Algorithm — Assignment Decay + Pipeline Projection:**

```
For each future week W:

  bench(W) =
    total_headcount
    - people_with_active_assignment_covering_W
    + people_whose_assignment_ends_in_[W-2, W]   // entering bench
    - people_whose_assignment_starts_in_W          // leaving bench

  at_risk(W) =
    people_with_single_assignment ending within [W, W+14]
    AND no follow-on assignment exists
    AND no open staffing request covers them
```

**Historical absorption rate** (how fast bench gets re-assigned):
```
absorption_rate =
  AVG(days_between: assignment_end → next_assignment_start)
  computed from last 12 months of completed assignments
  per skill category (engineers reabsorb faster than PMs, etc.)
```

Apply absorption rate to bench projection as a decay function to produce
"expected bench size after natural re-staffing."

**Output:** `GET /workload/capacity-forecast?weeks=12&poolId=` returning
`{ week, projectedBench, atRiskPeople[], expectedAbsorptionDays }[]`

**Visualisation:** existing `WorkloadPlanningPage` can host this. Add a second chart:
stacked area of bench vs assigned vs at-risk over 12 weeks.

---

### 7.3 — Staffing Board UI (replaces "Drag-and-drop staffing board")

**What it does:** Visual swimlane view — people on rows, weeks on columns,
assignment blocks as draggable bars.

**Algorithm — Conflict-aware Drop Validation:**

On every drag event:
1. Compute candidate's total allocation in the new time range:
   `SELECT SUM(allocation_percent) WHERE personId = X AND dates overlap new range`
2. If total + dragged_assignment.allocation > 100 → highlight drop zone red, block drop
3. If no conflict → allow drop, call `PATCH /assignments/:id { validFrom, validTo }`
4. Render update optimistically; revert on API error

**Layout algorithm:**
- Group assignments by person into swimlanes
- Within each swimlane, stack overlapping assignments vertically
  (same algorithm used by Google Calendar for overlapping events)
- Column width = pixels_per_day × 7 (weekly columns)

**No DnD library constraint:** `@dnd-kit/core` is already installed. This is a
configuration + layout item, not a new capability.

---

### 7.4 — Case SLA Engine (replaces "AI-powered SLA tracking")

**What it does:** Alert when cases exceed their time limit; auto-escalate.

**Algorithm — Timer + Escalation Ladder:**

```
On case creation:
  deadline = created_at + SLA_hours[case_type]
  Store: { caseId, deadline, tier: 0, owner: case.owner }

Cron job (every 15 minutes):
  SELECT cases WHERE deadline < NOW() AND status NOT IN ('CLOSED','CANCELLED','ARCHIVED')
  For each:
    hours_overdue = (NOW() - deadline) / 3600
    IF hours_overdue >= 0 AND tier == 0:
      → notify owner: "Case overdue"
      tier = 1
    IF hours_overdue >= 24 AND tier == 1:
      → notify owner + owner's manager: "Case 24h overdue"
      tier = 2
    IF hours_overdue >= 72 AND tier == 2:
      → notify HR manager: "Case 72h overdue — auto-escalating"
      → change owner to HR manager's personId
      tier = 3
```

SLA hours are configurable per case type in the platform settings dictionary.

**Implementation:** NestJS `@nestjs/schedule` cron decorator (already available in NestJS).
New `CaseSlaService` with `@Cron('*/15 * * * *')`. Uses existing notification infrastructure.

**No external dependency. Pure scheduler + database.**

---

### 7.5 — Attribute-Based Access Control / ABAC (replaces "AI-powered ABAC")

**What it does:** Fine-grained permissions beyond the 6 fixed roles. Example:
"RM can only approve assignments on projects within their managed resource pool."

**Algorithm — Policy Rule Evaluation:**

A policy is a 4-tuple `{ subject_condition, resource_type, action, data_filter }`:

```typescript
interface AbacPolicy {
  roles: Role[];                    // applies to these roles
  resource: 'assignment' | 'project' | 'case' | 'person';
  action: 'read' | 'write' | 'approve' | 'delete';
  dataFilter: (principal: Principal, record: unknown) => boolean;
  // evaluated at query time to inject WHERE conditions
}

// Example policies:
{
  roles: ['resource_manager'],
  resource: 'assignment',
  action: 'approve',
  dataFilter: (p, a) => p.managedPoolPersonIds.includes(a.personId)
}
{
  roles: ['project_manager'],
  resource: 'assignment',
  action: 'read',
  dataFilter: (p, a) => p.managedProjectIds.includes(a.projectId)
}
```

**Evaluation:** inject data filter as Prisma `where` clause additions at the repository layer.
No query sees records outside the filter. No separate policy engine needed — it's a
TypeScript function applied before DB queries.

**Storage:** policies defined in code (type-safe, version-controlled) with optional
override table `abac_policy_override` for runtime customisation.

**Phase:** implement after ABAC-naive code is stable. It is a refactor of existing
guards, not a new feature.

---

## 8. Priority Sequence — Ordered Sprint Plan

```
Sprint 1 (Weeks 1-2):  TIER 0 — All bug fixes
  0-1 Bearer token removal
  0-2 Admin RBAC route guards
  0-4 Assignment UUID → project name
  0-6 Date locale fix
  0-7 Breadcrumb fix
  0-8 Whitespace fix
  0-10 As-of date default to today
  0-3, 0-5, 0-9 (remaining Tier 0)

Sprint 2 (Weeks 3-4):  TIER 1a — Staffing pipeline
  1-1  StaffingRequest schema
  1-2  PM creates request
  1-3  RM reviews + proposes
  1-4  PM fulfils in 2 clicks
  1-5  Overallocation detection

Sprint 3 (Weeks 5-6):  TIER 1b — People + Utilization
  1-7  Utilization report backend
  1-8  Utilization page frontend
  1-9  Billable flag on projects
  1-10 Grade dictionary
  1-11 Role on employee create
  1-12 Employee status filter + search fix

Sprint 4 (Weeks 7-8):  TIER 1c — Cases + polish
  1-15 Case type dictionary
  1-16 Workflow steps on cases
  1-17 Participant count fix
  1-14 Auto-redirect after creation
  1-13 Employee form essential fields

Sprint 5 (Weeks 9-10): TIER 2 — Amplifiers
  2-1  Bench capacity view
  2-3  Timesheet auto-populate
  2-5  Bulk employee import
  2-7  Case templates
  2-2  Assignment extension

Sprint 6 (Weeks 11-12): TIER 4a — First algorithmic advantages
  7.1  Skill match scoring (PARETO payoff: PM can find right person in 10 seconds)
  7.2  Capacity forecast (PARETO payoff: Director sees bench 90 days out)
  7.3  Staffing board UI (PARETO payoff: RM manages all assignments visually)

Sprint 7 (Weeks 13-14): TIER 4b + TIER 3 (no-dep items)
  7.4  Case SLA engine
  3-4  OpenAPI docs
  3-5  Webhook/event API
  2-6  Mobile layout
  2-10 Notification preferences

Sprint 8+:              TIER 3 (external dep) + TIER 4c
  3-1  SSO (when Azure/Okta credentials available)
  3-2  Jira config UI (when Jira credentials available)
  7.5  ABAC policy engine (when role model is stable)
  ...
```

---

## 9. PARETO Summary — The Critical 23

Items marked `[PARETO]` above. If only these 23 are shipped, the platform delivers
~80% of its stated value proposition:

| # | Feature | Why it's in the 20% |
|---|---------|---------------------|
| 0-1 | Remove bearer token | Unblocks all demos and pilots |
| 0-2 | Admin RBAC guards | Unblocks all demos and pilots |
| 0-3 | Case owner fix | Core HR workflow |
| 0-4 | Project name on assignments | Every assignment page is broken without this |
| 0-5 | Custom 404 | Trust |
| 0-6 | Date locale | Trust + usability |
| 0-7 | Breadcrumb | Navigation |
| 1-1 | StaffingRequest schema | Unlocks the entire staffing pipeline |
| 1-2 | PM creates request | Half of the core staffing loop |
| 1-3 | RM reviews + proposes | Other half of the core staffing loop |
| 1-4 | PM fulfils in 2 clicks | Closes the loop |
| 1-5 | Overallocation detection | Prevents the #1 data integrity failure |
| 1-7 | Utilization report BE | Core metric for every target customer |
| 1-8 | Utilization page FE | Core metric visible |
| 1-9 | Billable flag | Required for outstaffing model |
| 1-10 | Grade dictionary | Unblocks HR onboarding |
| 1-11 | Role on create | Unblocks HR onboarding |
| 1-12 | Status filter + search | INACTIVE employees are invisible today |
| 1-16 | Case workflow steps | Cases are useless without steps |
| 2-1 | Bench view | RM's #1 daily tool |
| 2-3 | Timesheet auto-populate | Saves 5 min per employee per week |
| 2-5 | Bulk employee import | Required for any org > 20 people to adopt |
| 7.1 | Skill match scoring | The feature that closes deals |

---

## 10. What to Defer (Until External Dependencies Are Ready)

| Item | Blocked by |
|------|-----------|
| SSO / OIDC | Azure AD tenant or Okta org + redirect URIs |
| Jira config UI | Jira Cloud API credentials + test project |
| M365 sync | Azure AD + Graph API app registration |
| HRIS integration | BambooHR/Workday API credentials |
| MFA (IAM-07) | Decision on MFA provider (TOTP vs SMS) |
| Revenue projection (RPT-02) | Rate card data model + customer pricing agreement |

Do not start these until the external dependency is resolved.  
**Every other item in the backlog is buildable today.**

---

_Created: 2026-04-06. Companion to MASTER_TRACKER.md._
