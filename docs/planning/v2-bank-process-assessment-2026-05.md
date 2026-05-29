# Bank IT-Block Onboarding — Business-Process Assessment & Addressed Action Plan

_Generated 2026-05-29 by a 12-agent wire-by-wire workflow (Foundation → Assess ×4 → adversarial Verify ×4 → Synthesize). Anchored to `docs/planning/v2-plan-validation-2026-05.md`. Foundation catalogued 76 drop/defer entries, 12 crafted DS pages, 16 lean processes. Verifier corrections applied at the top of the synthesis._

---

# Bank IT-Block Onboarding — Consolidated Action Plan (4-Process Synthesis, Verifier-Corrected)

**Date:** 2026-05-29 · **Anchored to:** `docs/planning/v2-plan-validation-2026-05.md` Strategic Track Map · **Tracker:** `MASTER_TRACKER.md` Phase V2

**Verifier corrections applied (refuted/adjusted claims dropped or fixed):**

| # | Original claim | Verifier verdict | Applied correction |
|---|---|---|---|
| 1 | resource-pools uses in-memory repo → "move to Prisma" gap | **REFUTED** | DI token `InMemoryResourcePoolRepository` resolves to `PrismaResourcePoolRepository`. **Dropped** the persistence-migration gap; only the standalone-route drop / `/admin/resource-pools` move stands. |
| 2 | `/workload`, `/workload/planning`, `/staffing-requests`, `/staffing-board` are `obsoleteInV2:true` | **ADJUSTED** | These are `navVisible:false` only; `obsoleteInV2` is a blanket flag on all v1 routes. Drop **verdict (D) still holds** per defer-list, but not on the obsolete-flag basis. |
| 3 | team-builder / fulfil have "zero FE callers" | **ADJUSTED** | API wrappers (`buildTeam`, `fulfilStaffingRequest` via hook) exist but no component invokes them — dead actions. "No live UI" conclusion holds. |
| 4 | ProjectAssignment "21 callsites" | **ADJUSTED (understated)** | Actual legacy load ≈ **34 service files**. V2-H.13's "21" is low; scope accordingly. |
| 5 | `/my-time/gaps` consumed by DeliveryManagerDashboard | **REFUTED** | `fetchTimeGaps` has **zero consumers** (DM dashboard renders *staffing* gaps). Endpoint is fully orphaned. Drop verdict unchanged; rationale corrected. |
| 6 | `/timesheets/approval` consumer = TimeManagementPage | **ADJUSTED** | Live consumer is **ExportCentrePage** (+ orphaned TimesheetApprovalPage). TimeManagementPage uses `/time-management/queue`. Endpoint still live-wired. |
| 7 | cmdk-search at `modules/integrations/search/` | **ADJUSTED** | Lives at `src/modules/search/application/cmdk-search.service.ts`; it is **auth-gated** (`ALL_AUTHENTICATED_ROLES`), not public; surface is **keep-thin** (clean the assignment branch), not "legacy-to-retire". |
| 8 | cmdk position href `/positions/:id` is a UUID violation | **ADJUSTED (worse)** | `/positions/:id` route **does not exist** → already a **dead link**. Re-point to `/projects/:projectId/positions/:positionId` fixes both. |
| 9 | Help Center has no `helpCenter.enabled` flag | **ADJUSTED** | Both `flag.feature.helpCenter.enabled` and `flag.helpCenter.enabled` **exist**; gap is **wiring the gate to the `/help` route**, not creating a flag. |
| 10 | employee dashboard imports `InMemoryProjectAssignmentRepository` | **ADJUSTED** | Employee path uses `ListAssignmentsService` (itself InMemory-bound); pm/rm/dm/director/hr/workload import directly. Outcome (InMemory legacy) holds. |
| 11 | unified-approvals position-proposal href → `/projects/:id` | **REFUTED** | Emits dead `/positions/${id}`. Strengthens the ProjectPositionDetailPage build case. |
| 12 | 20c-05 (leave balance never written) OPEN | **CLOSED** (both assessments) | Write-path (`addPending`/`deduct`/`restorePending`) is wired. **20b-10** (no leave notifications) remains the only OPEN leave loop item. |
| 13 | HRIS drop cite "§3.2 user decision D" | **ADJUSTED** | Source is defer-list L168 + §8 legend marker `D`. Verdict drop-now unchanged. |

---

## 1. Per-Process AS-IS → TO-BE

### 1.1 Supply–Demand (staffing / resource planning)

| | State |
|---|---|
| **AS-IS** | 100% on **legacy two-model design**. Demand = `StaffingRequest` (Prisma-backed despite `InMemory*` class name); matching = `StaffingRequestProposalSlate` → pick **creates a `ProjectAssignment` at BOOKED**; supply = `ProjectAssignment` 10-status machine. `ProjectPosition` is a **dual-write shadow** fed by `ProjectPositionMirrorService` off the live assignment write — not authoritative. Staffing Desk + Planner (`WorkforcePlanner`, full solver) read/write legacy; bench derived from `projectAssignment`. The entire lean stack (`project-positions` controller, `/staffing/scenarios`+`/solver`+`/jql`, `DistributionStudio`) is **dark behind `dsRefresh=false`** or has zero component callers. No `StaffingDeskTab` model. |
| **TO-BE** | `ProjectPosition`-as-aggregate is the **single source of truth**. 7-step lifecycle on one aggregate (DRAFT→OPEN→PROPOSED→BOOKED→ONBOARDING→ASSIGNED→RELEASED; ON_HOLD branch). Bench = pure derived query. `SuggestFillsService` (extracted) backs both bulk planner and single-position Find-Candidates. Distribution Studio stays **FULL** (locked decision #4) but re-pointed to `ProjectPosition`. Staffing Desk → DS Operational-Queue (saved-query tabs + JQL + Board/Planner/Bench switcher). Apply paths write `fillStatus` transitions + `project-position.fill.*` outbox. Legacy models dropped in `20260720_lean_staffing_contract` after cutover. |

### 1.2 Time-Recording

| | State |
|---|---|
| **AS-IS** | Live surfaces are the **legacy flag-OFF pages** (`workspaceMe`+`dsRefresh` both default false). Employee = `MyTimePage` (monthly, 22 legacy `kpi-strip` classes); manager = `TimeManagementPage` (DS drawers wired, legacy shell). `TimesheetPage`/`TimesheetApprovalPage` orphaned. **Entire time domain reads legacy `projectAssignment.findMany`** (monthly-timesheet 132/315, time-gap 83) with the legacy status enum. Balance write-path **wired (20c-05 CLOSED)**; leave decisions emit **no notifications (20b-10 OPEN)**; **no `/leave-requests/preview`**; working-day calc is naive calendar-day inclusive. Overtime-policy CRUD built-unwired. Period-locks live. |
| **TO-BE** | Flip live surface to `/me` workspace + canonical Operational-Queue `/time-management`; legacy routes → alias-redirects. DS Timeline/Calendar/BalanceMeter/EditableCell grammar. **Repoint 3 `findMany` calls to `ProjectPosition.activeFill` before contract migration.** Build `/leave-requests/preview` (working-days excl. weekend+holiday, conflicts, balance-after) + working-day calc. Emit `leave.approved/rejected/cancelled` outbox → NotificationEventTranslator (close 20b-10). Schemas unchanged (time/leave de-scoped from explicit theme). |

### 1.3 Integrations

| | State |
|---|---|
| **AS-IS** | Thin operator admin block. **Jira (writes only `Project` — model-agnostic, cutover-safe), M365 (Person dir), RADIUS** fully live via one `useIntegrationAdmin` hook. **Two overlapping endpoints** (`/admin/integrations` 3-provider vs `/admin/integrations/registry` 6-adapter) → two pages. HRIS fully wired but **drop-listed** (in-memory config). OIDC built, flag-gated OFF, no UI affordance. JSM/LDAP/LLM = registry `not_configured` probes only. Setup-wizard step-5 = **SMTP+CORS only** (MUI). **`cmdk-search` (`modules/search/`) is the one in-area legacy reader** — reads both `projectPosition` AND `projectAssignment`, emits raw-UUID + **dead `/positions/:id`** + drop-route `/assignments/:id` hrefs. |
| **TO-BE** | One DS-aligned `/admin?section=integrations` tab: registry table (canonical) + per-row inspector drawer. Retire duplicate `admin-config getIntegrations`. Jira/M365/RADIUS unchanged. OIDC = Day-1 connector card + conditional auth-form SSO link. cmdk-search re-pointed to `ProjectPosition` only, opaque-id'd hrefs, positions → `/projects/:id/positions/:positionId`. HRIS dropped. JSM/LDAP/LLM stay `not_configured` scaffolds. Wizard step-5 stays SMTP-only (connectors deferred to registry — lean choice). |

### 1.4 Role Self-Service

| | State |
|---|---|
| **AS-IS** | `ProjectPosition` BUILT but **PARALLEL** — only **two live lean reads**: unified-approval-queue PROPOSED source + enriched bench anti-join. `/me` shell (flag-OFF) tabs fetch legacy per-domain aggregators; **no `/me/overview`, `/me/memberships`**; `me/home` exists but unconsumed; ProjectsTab reads `/assignments?personId` (legacy, InMemory-backed). `/people/:id` → legacy `EmployeeDetailsPlaceholderPage`; person-profile/360 aggregators built-unwired, read `projectAssignment`. No `ProjectPositionDetailPage`, no `/project-positions/:id/candidates`, no Find-Candidates panel. Cases all HR-only (no subject self-scope). Help wired but route unflagged. |
| **TO-BE** | `/me` backed by `GET /me/overview` + `GET /me/memberships` (ProjectPosition.activePersonId). Composed Person-360 at `/people/:id` (DS page-profile, position-history off `ProjectPositionFillHistory`). Ship `ProjectPositionDetailPage` + `/project-positions/:id/candidates` (SuggestFillsService) — wires the dark transition endpoint into a reachable flow. Repoint role-dashboard query services off InMemory legacy. Add subject self-scope read to Cases. Flag-gate `/help` route. |

### 1.5 Wire-by-Wire Endpoint State (decision-relevant only)

| Endpoint | Process | State | Model | Disposition |
|---|---|---|---|---|
| `GET /api/staffing-desk` | S-D | live-wired | **legacy** PA+SR | re-point (NEW-LGL-1) |
| `GET /api/staffing-desk/bench` | S-D | live-wired | **legacy** PA | re-point to ProjectPosition |
| `GET /api/staffing-desk/planner` (+`/auto-match`,`/apply`) | S-D | live-wired | **legacy** PA+SR write | re-point apply to fillStatus |
| `GET/POST/PATCH/DELETE /api/staffing-desk/planner/scenarios` | S-D | live-wired | — | **drop** (dup of `/staffing/scenarios`) |
| `POST /api/staffing-desk/team-builder` | S-D | api-wrapper-only, no component | — | **drop** (dead) |
| `GET /api/project-positions` | S-D / self-svc | built-unwired (PositionsListPage only) | **lean** | wire + manifest |
| `GET /api/project-positions/:id` | S-D | built-unwired | **lean** | wire (DetailPage) |
| `POST /api/project-positions` | S-D | **live** (PositionsListPage `+New`) | **lean** | becomes canonical demand-create |
| `POST /api/project-positions/:id/transition` | S-D | built-unwired (in PositionsListPage, not self-svc) | **lean** | **wire — core lifecycle** |
| `GET /api/project-positions/:id/candidates` | self-svc | **missing-to-build** | lean | build |
| `GET /api/people/bench` (enriched) | S-D | live-wired | **lean** | keep |
| `POST /api/people/bench/check` | S-D | built-unwired | **lean** | keep |
| `GET/POST/.../api/staffing/scenarios`+`/solver/run`+`/jql/{parse,execute}` | S-D | built-unwired (dark, dsRefresh) | lean | wire (Track 3) |
| `POST /api/staffing-requests`(+lifecycle,`/proposals`,`/pick`) | S-D | live-wired | **legacy** | drop at cutover |
| `POST /api/staffing-requests/:id/fulfil` | S-D | deprecated, dead action | legacy | **drop now** |
| `GET/POST /api/assignments/*` (24) | S-D | live-wired (~34 svc files) | **legacy** | keep-thin → drop S5 |
| `POST /api/org/people/:id/release-requests`(+approve/reject) | S-D | built-unwired | legacy | **drop now** |
| `GET /api/my-time/month`(+`auto-fill`,`copy-previous`) | time | live-wired | **legacy** PA read | repoint |
| `GET /api/my-time/gaps` | time | **orphaned (0 consumers)** | legacy | drop |
| `GET /api/timesheets/my/history` | time | built-unwired | — | wire-or-drop |
| `GET /api/timesheets/approval` | time | live-wired (**ExportCentrePage**) | — | keep |
| `GET /api/time-management/queue` | time | live-wired (TimeManagementPage) | mixed | keep (canonical) |
| `GET /api/overtime/summary` | time | live-wired | — | keep |
| `GET /api/overtime/policy`,`/resolve/:id`,`POST/DELETE /policy` | time | built-unwired / no-FE | — | wire-or-drop (Track 3) |
| `GET/POST/DELETE /api/admin/period-locks` | time | live-wired | — | keep-thin |
| `GET /api/leave-requests/my-balance` | time/self | live-wired (20c-05 CLOSED) | — | keep |
| `POST /api/leave-requests/:id/{approve,reject}` | time/self | live-wired, **no outbox (20b-10 OPEN)** | — | add events |
| `GET /api/leave-requests/preview` | time/self | **missing-to-build** | — | build |
| `POST /api/leave-requests/:id/cancel` | self | **missing-to-build** | — | build |
| `POST/GET /api/integrations/{jira,m365,radius}/*` | int | live-wired | Project/Person | keep as-is |
| `GET /api/admin/integrations` (admin-config) | int | live-wired | — | **retire (dup)** |
| `GET /api/admin/integrations/registry` | int | live-wired | — | keep (canonical) |
| `GET /api/auth/oidc/{login,callback}` | int | built-unwired, flag-OFF, @Public | — | wire Day-1 (Track 2) |
| `GET /api/search/cmdk` | int (search) | live-wired, auth-gated | **PA+PP dual** | keep-thin, clean PA branch |
| `GET/POST /api/admin/hris/*` | int | live-wired | in-memory | **drop now** |
| `POST /api/setup/integrations` (step-5) | int | live-wired (SMTP+CORS only) | — | keep SMTP-only |
| `GET /api/me/home` | self | built-unwired | — | keep-thin (mgr) / retire emp |
| `GET /api/me/overview` | self | **missing-to-build** | lean | build |
| `GET /api/me/memberships` | self | **missing-to-build** | lean | build |
| `GET /api/assignments?personId=` | self | live-wired (ProjectsTab) | **legacy** | drop at cutover |
| `GET /api/people/:id/profile`,`/360` | self | built-unwired | **legacy** PA | wire + repoint |
| `GET/PUT /api/people/:id/skills` | self | live-wired (AllowSelfScope) | — | keep |
| `GET /api/approvals/unified` | self | live-wired (flag dsRefresh) | **lean** PROPOSED | keep (extend SLA) |
| `…/api/cases` (~17, all HR_GOVERNANCE) | self | live-wired, no self-scope | — | add subject self-scope |
| `GET/PATCH /api/me/notification-{prefs,digest}` | self | live-wired | — | keep |
| `GET /api/help/articles`(+…) | self | live-wired, route unflagged | — | gate route |

---

## 2. Prioritized, De-Duplicated Action List

De-duplicated across all 4 assessments. **⚑ = BE-heavy/concurrent-agent-territory** (per validation §8 — confirm `ProjectPosition` read-path ownership before starting).

| ID | Title | Process | Kind | Effort | Track | DS atoms / crafted page | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|
| **A-01 ⚑** | Backfill `ProjectPosition` from `it-company` seed | S-D | data | M | 1 | — | — | `backfill-project-positions.ts` idempotent; rerun = 0 deltas; every active assignment has a position row |
| **A-02 ⚑** | Extract `SuggestFillsService` (`suggestForPosition`+`suggestForBatch`) reading ProjectPosition+Candidate | S-D | build | L | 3 | — | A-01 | Service returns top-5 by skill+availability+cost off `projectPosition`; no PA/SR reads; unit-tested |
| **A-03 ⚑** | Re-point live reads (staffing-desk / supply+demand-profile / bench-mgmt / workforce-planner) to `ProjectPosition.activeFill` (**NEW-LGL-1**) | S-D | data | XL | 1 | — | A-01 | Desk + profiles + bench render off `projectPosition`; 0 `projectAssignment.findMany` on those live paths |
| **A-04 ⚑** | Repoint role-dashboard query services (pm/rm/dm/director/hr/workload + employee via ListAssignmentsService) off InMemory legacy onto `projectPosition` | self/S-D | data | XL | 5 | — | A-01, A-03 | `/me` Overview + manager landings render off ProjectPosition; no `InMemoryProjectAssignmentRepository`/`InMemoryStaffingRequestService` on live dashboard paths |
| **A-05 ⚑** | Repoint `person-profile.service` position-history to ProjectPosition+FillHistory | self | data | M | 5 | — | A-01 | `GET /people/:id/profile` position-history reads `ProjectPositionFillHistory`; no `projectAssignment` |
| **A-06 ⚑** | Repoint time domain reads (`monthly-timesheet` 132/315, `time-gap-detection` 83) to `ProjectPosition.activeFill`; remap `MonthlyAssignmentRow` | time | data | L | 5 | — | A-01 | auto-fill/gaps/monthly off ProjectPosition `fillStatus`; survives contract migration |
| **A-07 ⚑** | Re-point cmdk-search off ProjectAssignment + opaque-id all hrefs + positions→`/projects/:id/positions/:positionId` | int | data | M | 5 | — | A-03, B-04 | `cmdk-search.service` (modules/search) drops `searchAssignments`; hrefs use prefixed publicIds; no dead `/positions/:id` |
| **A-08 ⚑** | Migrate 21+ (actually **~34**) `ProjectAssignment` callsites → `ProjectPosition` view (**V2-H.13**) | S-D | data | XL | 1 | — | A-03, A-04, A-05, A-06 | `check-deprecated-assignment-import.cjs` ratchet trending to 0; all live reads on lean model |
| **B-01** | Wire `POST /project-positions/:id/transition` to a UI action set + `lib/api` `transition()` wrapper | S-D | wire | M | 1 | Button, StatusBadge, ConfirmDialog, FormModal, Timeline | A-03 | All 8 fillStatus transitions invokable from UI; audit-logged; guarded by `STAFFING_ROLES` |
| **B-02** | Build `ProjectPositionDetailPage` (`/projects/:projectId/positions/:positionId`) + inline Find-Candidates | S-D/self | build | L | 1 | **page-staffing-desk.jsx (Find Candidates)** + Breadcrumb, TabBar, Donut, Timeline, Table, DescriptionList, Button, StatusBadge, VarianceBar | A-02, B-01, B-03 | Page renders summary+fill+FillHistory timeline+candidates; "Find candidates" → top-5; Propose → PROPOSED; replaces StaffingRequestDetailPage (redirect) |
| **B-03 ⚑** | Build `GET /project-positions/:id/candidates` (degenerate single-position suggest) | self | build | S | 1 | — | A-02 | Returns SuggestFillsService.suggestForPosition top-5; tested |
| **B-04** | Mount ProjectPosition surfaces in `route-manifest` (list+detail: grammar+roles+JTBD) | S-D | build | S | 4 | Breadcrumb | B-02 | `PositionsListPage`+DetailPage in manifest; nav/RBAC/JTBD entries present (no orphan) |
| **B-05** | Replace live demand-create (SR drawer) with `+ New position` on project page; retire `CreateStaffingRequestPage` | S-D | wire | M | 1 | FormModal, FormField, Button, Select, Input | B-01 | Project page `+New position` → `POST /project-positions`; SR drawer removed from live path |
| **B-06** | Implement lean RELEASED transition replacing dual-approval offboarding | S-D | build | M | 1 | ConfirmDialog, Button, StatusBadge | B-01 | ASSIGNED→RELEASED single transition (HR/RM/PM), audit-logged (AuditLog+EmploymentEvent), auto-bench; PersonReleaseRequest path dead |
| **B-07** | Re-point Distribution Studio apply (`/staffing/scenarios/:id/apply`) to write fillStatus + FillHistory; migrate `PlannerScenario` schemaVersion 1→2 | S-D | build | XL | 3 | **page-staffing-desk.jsx (Studio)** + page-timeline-ds.jsx · GanttRow, Timeline, SparklineDs, Drawer, Table | A-02, A-03 | Apply writes `projectPosition` transitions (no `projectAssignment.create`/`assignmentHistory.create`); scenarios migrated via legacy-id map |
| **B-08** | Distribution Studio swimlane + heatmap + bench sidebar (**V2-C.11/12/13**) | S-D | ds | L | 3 | **page-staffing-desk.jsx (Studio variant)** · GanttRow, Timeline, Drawer, SparklineDs, VarianceBar, Donut, StatusBadge, Avatar | B-07 | Editable swimlane (positions drag across people); heatmap layers (coverage/cost/match/risk); inline bench sidebar |
| **B-09 ⚑** | Wire JQL engine end-to-end + add `StaffingDeskTab` Prisma model | S-D | build | XL | 3 | TabBar, SearchInput, Popover, FormModal, RadioGroup, ConfirmDialog, IconButton | A-03 | `lib/api/jql.ts` added; JqlQueryBar mounted in Staffing Desk; `StaffingDeskTab` (PUBLIC/PRIVATE, rowMode, builtIn seeded); tab serialized to `?tab=`/`?jql=` (Law 5) |
| **B-10** | Capacity reserves approved leave + outbox cache-invalidation (**V2-H.8**) | S-D | build | M | 3 | — | A-03, C-04 | `CapacityProfileBuilder` subtracts approved-leave hours; leave outbox invalidates planner cache (planner↔leave race closed) |
| **C-01** | Flip employee surface to `/me` (`workspaceMe` ON) + legacy alias-redirects (`/my-time`,`/timesheets`,`/leave`,`/notifications/inbox`) params-verbatim | time/self | wire | M | 1 | TabBar, Timeline, BalanceMeter, Calendar | C-02..C-05 | `/me` is live employee entry; legacy routes redirect preserving params (Law 2/10); `/leave` no longer mounts LeaveRequestPage directly |
| **C-02 ⚑** | Build `GET /me/overview` employee aggregator | self | build | M | 1 | **page-workspace.jsx (Overview)** · Timeline, SparklineDs, Link, StatusBadge, Table | A-04 | Returns week hours filed/expected, leave remaining, unread inbox, active-position count, weekly Timeline, rails; OverviewTab repointed |
| **C-03 ⚑** | Build `GET /me/memberships` over ProjectPosition + repoint ProjectsTab | self | wire | M | 1 | **page-workspace.jsx (Projects)** · Table, StatusBadge, Avatar, Pct, Link | A-04 | Scoped to `principal.personId` (ignores `?personId`); reads `activePersonId`; active-first then historical; rows→`/projects/:id` |
| **C-04 ⚑** | Build `GET /leave-requests/preview` + working-day calc (**V2-H.9**) replacing `calculateLeaveDaysInclusive` | time/self | build | M | 3 | **page-workspace.jsx (Leave)** · BalanceMeter, Calendar, FormField | — | Preview returns working-days (excl. weekend+tenant PublicHoliday), conflicting positions, balance-after; create/approve use same calc; LeaveTab drops client-side math |
| **C-05 ⚑** | Build `POST /leave-requests/:id/cancel` (employee self-cancel PENDING) | self | build | S | 3 | Button, ConfirmDialog, StatusBadge | C-04 | restorePending in `$transaction`; emits `leave.cancelled`; inline Cancel on pending LeaveTab rows |
| **C-06 ⚑** | Emit `leave.approved/rejected/cancelled` outbox + NotificationEventTranslator (close **20b-10**) | time/self | build | M | 1 | — | C-05 | approve/reject/cancel wrapped in `$transaction` with balance projection; outbox → in-app + email (digest/quiet-hours aware) |
| **C-07 ⚑** | Add `LeavePolicy` model + nightly `LeaveBalanceDriftSweep` | self | build | L | 3 | — | C-04, C-06 | LeavePolicy (accrual/carryover/notice/holiday); balance = derived projection; nightly recompute raises admin exception on drift |
| **C-08** | Promote `/time-management` to Operational-Queue grammar (TabBar + DS shell, replace `kpi-strip`, drawer auto-advance Law 3) | time | ds | M | 4 | **page-time-management.jsx** · TabBar, Drawer, Calendar, BalanceMeter, StatusBadge, Table, Avatar, Textarea | — | TabBar Timesheets/Leave w/ counts; KPI clickable doorways (Law 9); drawer auto-loads next pending without closing; BalanceMeter pre/post |
| **C-09** | Migrate `MyTimePage` to DS `/me` Time tab (Timeline + EditableCell, drop 22 `kpi-strip` classes) | time | ds | L | 4 | **page-workspace.jsx (Time)** · Timeline, EditableCell, Table, TabBar, BalanceMeter | C-01, A-06 | Hero Timeline lifecycle bars + EditableCell weekly grid + KPI doorways; 0 legacy `kpi-strip` on surface |
| **C-10** | Ship composed People Profile (Person-360) at `/people/:id`; redirect EmployeeDetailsPlaceholderPage | self | ds | L | 4 | **page-profile.jsx** · Avatar, TabBar, SparklineDs, Donut, Timeline, Table, DescriptionList, Money, StatusBadge | A-05, B-03 | Header+TabBar; position-history off ProjectPositionFillHistory; Suggested-next-positions Donut; consumes profile/360/skills/activity; placeholder redirects 1 release |
| **C-11** | Add subject-employee `AllowSelfScope` read to Cases (`GET /cases/:id`,`/:id/steps`) | self | wire | S | 3 | StatusBadge, Timeline, DescriptionList | — | Onboarding subject sees own case status from `/me`; HR write surface unchanged |
| **C-12** | Move Case SLA config off InMemoryCaseSlaService to PlatformSetting | self | data | S | 2 | — | — | SLA hours persist across restart (PlatformSetting-backed) |
| **D-01** | Surface OIDC as Day-1 bank connector card + conditional auth-form SSO link | int | wire | M | 2 | StatusBadge, Button, Link | — | Registry shows OIDC card (probe status); "Sign in with SSO" renders when `flag.feature.integrations.oidc.enabled` ON |
| **D-02** | Collapse duplicate integrations endpoints (`admin-config getIntegrations` → registry canonical); repoint `useIntegrationAdmin` + AdminPanel tab | int | wire | M | 1 | Table, StatusBadge | — | Single registry read; `GET /admin/integrations` retired; both consumers on registry endpoint |
| **D-03** | Merge `/admin/integrations` + `/registry` into one DS `/admin?section=integrations` tab (registry table + inspector drawer) | int | ds | L | 4 | **page-admin-setup.jsx (Integrations tab)** · TabBar, Table, StatusBadge, IconButton, Button, DescriptionList, Drawer, Link | D-02 | One tab; registry DataTable (icon tile, mode badge, tone StatusBadge, last-sync mono, retry/configure/more); sync+reconciliation in per-row Drawer |
| **D-04** | Rebuild `IntegrationsRegistryPage` cells on DS table grammar (icon tile, mode badge, row actions) | int | ds | M | 4 | **page-admin-setup.jsx** · Table, StatusBadge, IconButton, Button | D-03 | No inline-styled spans; 32px icon tile + mode badge + tone StatusBadge + inline retry/configure |
| **D-05** | Retrofit Staffing Desk chrome to DS Operational-Queue (saved-query tabs + JQL bar + Board/Planner/Bench switcher) | S-D | ds | L | 4 | **page-staffing-desk.jsx** · TabBar, SearchInput, Table, Timeline, StatusBadge, Avatar, Drawer, SparklineDs, Donut, VarianceBar | B-09 | Tab strip + JQL bar + 3-way switcher (currently Table+Planner only); reads ProjectPosition |
| **D-06** | Law-7 unified approvals — extend SLA fields, ensure leave/case rows decision-able in-place (**NEW-LGL-5**) | self | ds | M | 4 | **page-approvals.jsx** · VarianceBar, SparklineDs, Avatar, StatusBadge, Textarea, FormField, Money, Link | C-06 | position-proposal+budget+activation+leave+case in one queue; inline approve/reject without leaving inspector (Law 3/7) |
| **E-01** | SSO admin configuration UI (**NEW-LGL-2 / D-155**) | int | build | L | 2 | **page-admin-setup.jsx** · FormModal, FormField, Input, Select, Switch, StatusBadge, Button | D-01 | Bank admin configures OIDC IdP/PKCE from UI; runbook Day-1 blocker cleared |
| **E-02** | Custom-role admin UI (**NEW-LGL-3 / D-159** — Squad/Tribe Lead, IT Service Owner) | int/self | build | L | 2 | page-admin-setup.jsx (RBAC matrix) · Table, StatusBadge, FormModal, Checkbox | — | Tenant adds bank role shapes; permission-matrix editable; D-159 flag flipped |
| **E-03** | Base-currency admin tab (**V2-H.3**) + multiCurrency flag flip (**V2-H.19**) | int | build | M | 2 | page-admin-setup.jsx · Select, Input, Switch | — | Base-currency configurable; `FxRateService.consolidate()` wired into rollups; no runtime no-op |
| **E-04** | Fiscal-calendar flag flip (**V2-H.20**) + `FiscalPeriodResolverService` wiring | int | build | M | 2 | — | E-03 | `fiscalCalendar.entity.enabled` ON; resolver wired into Money tab + monthly rollups |
| **E-05** | Create-Project-Wizard accelerator (**NEW-LGL-4**) — pre-fill positions/milestones from bank template | S-D | build | L | 2 | FormModal, FormField, Select, Input | B-05 | 3-step wizard pre-fills starter positions+milestones; one-click activate→auto-track |
| **E-06** | Flag-gate `/help` route (`flag.helpCenter.enabled` — flag exists, wire it) | self | process | S | 2 | — | — | `/help` hidden when flag OFF per bank; no content investment |
| **F-01** | Decide overtime-policy CRUD: wire `/admin/time-policies` OR drop in favour of PlatformSettings | time | wire | M | 3 | page-admin-setup.jsx · Table, FormModal, Select, Switch, ConfirmDialog | — | Either 4 endpoints consumed by admin surface, or CRUD dropped + PlatformSettings config documented |
| **F-02** | Surface or drop `GET /timesheets/my/history` | time | wire | S | 3 | Table, StatusBadge | C-09 | History list in `/me` Time tab, or export+endpoint removed |
| **F-03** | Keep JSM/LDAP/LLM as registry `not_configured` scaffolds (no sync UI) | int | process | S | 3 | StatusBadge | — | Visible handoff scaffolds; no new connector wiring this initiative |
| **F-04** | Default `dsRefresh` ON per bank (cutover gate) (**V2-G.4**) | cross | process | S | 2/5 | — | A-08, B-07 | Flip only after lean writes land; else Studio applies to wrong model. `maturityLevel:'ga'` |
| **F-05** | Verify period-lock enforcement in timesheet/leave mutations | time | process | S | 2 | — | — | upsertEntry/submit/approve/reject reject edits in locked period server-side |
| **G-01** | Drop deprecated `fulfil` endpoint + dead `team-builder` | S-D | drop | S | 5 | — | — | Both endpoints + dead api wrappers removed |
| **G-02** | Drop HRIS surface (route, page, `api/hris.ts`, controller, service) | int | drop | M | 5 | — | — | `/admin/hris` + all HRIS endpoints gone (defer-list L168 = D) |
| **G-03** | Retire orphaned `TimesheetPage.tsx` + `TimesheetApprovalPage.tsx` + tests | time | drop | S | 5 | — | C-09 | Files + test files deleted; redirects remain |
| **G-04** | Retire `/my-time/gaps` standalone (orphaned, 0 consumers) | time | drop | S | 5 | — | A-06 | `fetchTimeGaps` export + endpoint removed |
| **G-05** | Retire OLD planner-scenarios dup + `assignment.*` outbox + `assignment-workload` alias | S-D | drop | M | 5 | — | B-07 | `/staffing-desk/planner/scenarios` removed (consolidated to `/staffing/scenarios`); assignment.* events + module alias gone |
| **G-06** | Retire legacy routes (`/assignments`,`/assignments/queue`,`/staffing-requests[/new]`,`/staffing-board`,`/workload`,`/workload/planning`,`/resource-pools` standalone) + their controllers (**V2-G.13/14**) | S-D | drop | L | 5 | — | A-08, B-05 | Redirects added then pages+`assignments.controller`+`staffing-requests.controller`+`workload.controller` removed; resource-pools → `/admin/resource-pools` tab |
| **G-07** | Drop legacy per-role dashboards (**V2-G.10**) | self | drop | M | 5 | — | A-04, C-02 | Employee/Manager/Exec/PM/RM/HR/DM dashboards + PortfolioRadiator + legacy `/` deleted |
| **G-08 ⚑** | Run Sprint-5 contract migration `20260720_lean_staffing_contract` (drop 10 legacy models) (**V2-H.14**) | S-D | drop | XL | 5 | — | A-07, A-08, B-06, B-07, A-04, A-05, A-06 | Forward-only migration drops StaffingRequest/Slate/Candidate/Fulfilment, PersonRelease*, ProjectAssignment, Assignment*; retains ProjectPositionCandidate; SLA/rate-pin/alloc/skills preserved |
| **G-09** | `check-deprecated-assignment-import.cjs` ratchet to 0 (**V2-H.15**) + delete ds-legacy CSS (**V2-H.16**) | cross | drop | M | 5 | — | G-08 | Ratchet=0; `ds-legacy/` + legacy `.button/.field/.kpi-strip` classes removed |
| **H-01** | Visual-regression suite ≥30 routes × 5 roles (**V2-G.1**) | cross | process | L | 5 | — | — | Playwright suite runs on `styles/`+`ds/` PRs; baseline green |

---

## 3. Consolidated DROP List (reconciled against drop document)

| Feature | Verdict | Rationale (verifier-reconciled) |
|---|---|---|
| `StaffingRequest` + 5 statuses | **drop @ S5** | Live demand path; collapses into ProjectPosition. Drop in contract migration **after** lean create/transition wired (G-08). |
| `StaffingRequestProposalSlate` + 4 statuses | **drop @ S5** | Live via `/proposals`; merges into Position candidates. |
| `StaffingRequestProposalCandidate` | **keep (renamed)** | → `ProjectPositionCandidate`, the only retained sub-entity. |
| `StaffingRequestFulfilment` + `/fulfil` | **drop now** | `@DeprecatedEndpoint` sunset 2026-12-01; dead action (api wrapper exists, no component). |
| `ProjectAssignment` (10-status) + Approval/History/Slate/Candidate | **keep-thin → drop @ S5** | STILL authoritative live supply (~34 svc files, not 21). Read-view 1 release, then drop. |
| `PersonReleaseRequest` + `PersonReleaseApproval` | **drop now** | Built-unwired, no live caller. Replace with lean RELEASED transition (B-06). |
| WorkforcePlanner Distribution Studio (full solver+5 strategies+scenarios+heatmap) | **KEEP FULL** | Locked decision #4 overrides plan-body "simplify". Re-point to ProjectPosition (B-07/B-08), do not retire. |
| WorkforcePlanner scenario UI (plan-body "deprecate") | **keep** | §5 #4 overrides; consolidate dup scenario endpoints (G-05), don't drop capability. |
| `/staffing-desk/planner/scenarios` (dup endpoint) | **drop @ S5** | Duplicates `/staffing/scenarios`; consolidate. |
| `team-builder` | **drop now** | Dead (api wrapper only, no component). |
| `assignment.*` outbox family + `assignment-workload` alias | **drop @ S5** | Dual-listen during transition, then removed. |
| JQL parse/execute + JqlQueryBar | **keep — finish** | Lean target requires it (B-09); add StaffingDeskTab model. |
| `/assignments`, `/assignments/queue`, `/staffing-requests[/new]`, `/staffing-board` | **drop** (D) | Per defer-list. Note: `navVisible:false` only (NOT `obsoleteInV2`). |
| `/workload`, `/workload/planning` | **drop** (D) | Director/Studio cover; capacity-forecast folds into Studio. `navVisible:false` only. |
| `/resource-pools` standalone | **keep-thin** | Standalone route drops → `/admin/resource-pools`. **Already Prisma-backed** (refuted in-memory claim) — no persistence work. |
| `/my-time`, `/timesheets`, `/timesheets/approval`, `/leave` standalone | **drop** (D) | → `/me?tab=`. Routing/flag flip (C-01), not rebuild. |
| Orphaned `TimesheetPage.tsx` + `TimesheetApprovalPage.tsx` | **drop now** | Not imported by router; superseded. Delete + tests (G-03). |
| `/my-time/gaps` standalone | **drop now** | **Orphaned (0 consumers)** — corrected rationale (NOT DM-dashboard). Gaps inline in `/my-time/month`. |
| Overtime-policy CRUD (`GET/POST/DELETE /overtime/policy`,`/resolve`) | **defer** (decide) | Built-unwired/no-FE. Banks rarely author per-pool policy Day-1; F-01 decides wire-or-drop. Keep `/overtime/summary` regardless. |
| `/admin/hris` (HRIS BambooHR/Workday) | **drop now** (D, defer-list L168) | Fully wired but config in-memory; user decision D. |
| `/integrations` (user-facing) | **drop now** | Already V2Redirect to `/admin?section=integrations`; delete body once tab canonical. |
| `GET /admin/integrations` (admin-config getIntegrations) | **drop** | Duplicate of registry; retire (D-02). |
| JSM Cloud connector | **defer** | Adapter-only `not_configured` probe; banks use ServiceNow/in-house. Wire on demand. |
| New 3rd-party connectors (beyond Jira/Confluence/M365/LDAP/OIDC/Radius) | **defer** | Build handoff surfaces, chase no new connectors. |
| M365 Outlook free-busy / calendar-overlap | **defer** | Stretch goal; not in code. Do not build. |
| LDAP / LLM scaffolds | **keep-thin** | Registry `not_configured` probes; LDAP = real bank-AD Day-1 need, LLM = F-4.1 scaffold (no new AI surface). |
| `GET /search/cmdk` | **keep-thin** | **Corrected from "legacy-to-retire"**: auth-gated, surface kept; only clean PA branch + opaque-id hrefs (A-07). |
| Per-role dashboards (`/dashboard/{employee,manager,exec,pm,rm,hr,delivery_manager}`, PortfolioRadiator, legacy `/`) | **drop @ C1** (D) | JTBDs covered by `/me`+landings. Repoint backing query services first (A-04). |
| `/dashboard/planned-vs-actual` | **keep-thin** (K) | Deep-link works; obsoleteInV2. (Overrides suggested D.) |
| `EmployeeDetailsPlaceholderPage` | **keep-thin** | Live `/people/:id` target — build 360 first (C-10), then redirect 1 release. |
| `GET /me/home` role-fanout | **keep-thin** | Built but unconsumed by `/me` tabs; keep for manager landing or retire employee path. |
| Cases HR-only RBAC | **keep + extend** | Not a drop; add subject `AllowSelfScope` read (C-11). |
| Reports: `/reports/{utilization,builder}`, `/exceptions`, `/work-evidence` | **drop @ C1** (D) | Per defer-list (overrides suggested K). |
| `/reports/{time,capitalisation,export}` | **keep-thin** (K) | Tabs under `/reports`; deep-link works. |
| `/teams` | **drop** | → `/people?team=<id>` filter (locked decision #1). |
| Help Center `/help`,`/help/:slug` | **keep-thin** | Flag-gate per bank (E-06); no content investment. |
| Pulse mood + heatmap | **keep-thin** | Off-by-default; flag kept, not in main nav. |
| ds-legacy components + legacy CSS | **drop @ S5** | Deleted in cleanup (G-09 / V2-H.16). |
| Multi-tenant activation, Mobile app, AI surfaces, Jira/Confluence/ServiceNow replacement | **defer/drop** | Non-goals. Single-tenant; responsive web; no new AI; wire-at-boundaries only. |

---

## 4. DS-Alignment Matrix

| Surface | DS crafted page | Atoms to adopt | Pattern gap |
|---|---|---|---|
| Staffing Desk table view | `page-staffing-desk.jsx` | TabBar, SearchInput, Table, EditableCell, Timeline, Avatar, StatusBadge, SparklineDs, VarianceBar, Popover, FormModal, ConfirmDialog, IconButton, Pct | Missing saved-query tab strip, JQL bar (autocomplete + caret-error Popover), 3-way Board/Planner/Bench switcher. Filter is kind-pill not rowMode tabs; saved views localStorage not server `StaffingDeskTab` |
| Distribution Studio / Planner | `page-staffing-desk.jsx` (Studio variant) + `page-timeline-ds.jsx` | Drawer, GanttRow, Timeline, SparklineDs, VarianceBar, Donut, Table, StatusBadge, Avatar, Button, Spinner, Skeleton | Two-pane shell (Bench inspector sidebar + drag-drop swimlane w/ week ruler, collapsible workstream Σ-sparkline + heat band, snap bars + Anomaly drawer) partly present in legacy, absent in lean studio. Lifecycle Timeline + heat-band grammar not adopted; solver-timeout + dual-write banners missing |
| Bench (BenchPage/Inspector) | `page-bench.jsx` | Breadcrumb, Button, IconButton, SearchInput, Select, Checkbox, Table, Avatar, StatusBadge, SparklineDs, DescriptionList, Link | Missing 4-tile KPI strip (On bench/Idle>14d/Cost-of-bench Sparkline/Suggested fills), removable filter chips + sort Select, bulk-action bar, sticky Inspector w/ ranked Suggested-fills cards (Donut match% + Propose). Bench source partly PA-derived |
| Director portfolio supply-demand | `page-director.jsx` | Breadcrumb, Select, Table, StatusBadge, SparklineDs, MiniBars, VarianceBar, Donut, Timeline, Money, Pct, Link | Decision-Dashboard grammar (What-needs-you-now strip, 4-axis RAG portfolio table, headcount-mix Donut, variance-by-driver, recent-decisions Timeline) not assembled; supply-demand scattered across retiring workload pages |
| Demand detail → ProjectPositionDetailPage | `page-staffing-desk.jsx` (Find Candidates) + `page-timeline-ds.jsx` | Breadcrumb, TabBar, Donut, Timeline, Table, DescriptionList, Button, StatusBadge, VarianceBar | Must replace StaffingRequestDetailPage: summary + current fill + FillHistory Timeline + ranked candidate list (Donut match, inline Propose). Slate/heatmap → ProjectPositionCandidate; old URLs redirect |
| MyTimePage (`/my-time`) | `page-workspace.jsx` (Time) / `page-time-management.jsx` (Timeline+Calendar docs) | TabBar, Timeline, EditableCell, Table, BalanceMeter, Calendar, Button, StatusBadge | 22 legacy `kpi-strip` classes + hand-rolled month grid; needs hero Timeline lifecycle bars + EditableCell weekly grid + KPI doorways |
| TimeManagementPage (`/time-management`) | `page-time-management.jsx` | TabBar, Drawer, Table, BalanceMeter, Calendar, StatusBadge, Avatar, Button, Textarea | Closest-to-DS (drawers done). Gap: TabBar w/ counts, KPI doorways (Law 9), drawer auto-advance (Law 3), BalanceMeter pre/post in leave drawer, Calendar for team-calendar |
| `/me` Workspace shell + 6 tabs | `page-workspace.jsx` | TabBar, Timeline, EditableCell, BalanceMeter, Calendar, SparklineDs, Table, RadioGroup, DescriptionList, Avatar, StatusBadge | Overview lacks hero weekly Timeline + 4 KPI doorways + rails; Time mounts legacy MyTimePage; Projects reads legacy PA; no single `/me/overview` payload |
| People Profile (`/people/:id`) | `page-profile.jsx` | Avatar, TabBar, SparklineDs, Donut, Timeline, Table, DescriptionList, Money, StatusBadge | Routes to legacy placeholder; no composed Person-360; position-history on legacy model |
| Leave self-service (`/me?tab=leave`) | `page-workspace.jsx` (Leave) / `page-time-management.jsx` (BalanceMeter+Calendar docs) | BalanceMeter, Calendar, FormField, Select, Textarea, Button, StatusBadge, ConfirmDialog | Preview client-computed (no server `/preview`); no inline Cancel; decisions emit no notifications; `/leave` not folded into `/me` |
| Unified Approvals (`/approvals`) | `page-approvals.jsx` | VarianceBar, SparklineDs, Avatar, StatusBadge, Textarea, FormField, Money, Link | Closest-to-lean. Needs SLA mono per source + confirm leave/case rows decision-able in-place |
| Cases / HR Queue (`/cases`) | `page-directory-hr.jsx` | TabBar, Table, Avatar, StatusBadge, Button, Timeline, DescriptionList | Onboarding-case day-progress + two-column checklist card grammar not fully reflected; no subject-employee read |
| Inbox + Notification prefs | `page-workspace.jsx` (Inbox+Settings) | SearchInput, Table, StatusBadge, RadioGroup, Checkbox, Input, FormField, Switch | Inbox needs filter-chip + unread-highlight + per-row CTA; Settings needs digest RadioGroup cards + quiet-hours time-Input layout |
| Integrations Admin (`/admin/integrations`) | `page-admin-setup.jsx` (Integrations tab) | TabBar, Table, StatusBadge, IconButton, Button, DescriptionList, Drawer, Link | Bespoke dictionary-admin master-detail; should be registry DataTable (icon tile/mode badge/tone StatusBadge/last-sync mono/actions) + per-row inspector Drawer in TabBar shell |
| Integrations Registry (`/admin/integrations/registry`) | `page-admin-setup.jsx` (registry card) | Table, StatusBadge, IconButton, Button | DS Table+StatusBadge used but inline-styled cells, free-text manual-sync col, no row actions; needs icon tile + mode badge + inline actions; merge into single tab |
| Setup wizard step-5 | `page-admin-setup.jsx` (SetupWizard step-5) | StatusBadge, Button, Switch, Input, FormField | MUI + SMTP-only; DS-crafted shows connector cards. **Decision: keep SMTP-only**, defer connectors to registry (lean) — align the DS doc accordingly |
| PeriodLocksAdminPage / MonitoringPage | `page-admin-setup.jsx` (Admin Control) | Table, FormModal, ConfirmDialog, StatusBadge / TabBar, DescriptionList, Timeline | keep-thin (finance-close / SRE). Minimal DS pass only if touched; long-term fold into AdminSettings tabs |
| HrisConfigPage (`/admin/hris`) | — | — | **DROP** — no DS work (G-02) |

---

## 5. Tracker Integration

### 5.1 Actions mapping to existing MASTER_TRACKER IDs

| Action | Existing tracker ID(s) |
|---|---|
| A-01 | **V2-H.10** (backfill script) |
| A-03 | **NEW-LGL-1** (re-point live reads) |
| A-08 | **V2-H.13** (migrate callsites — note: ~34 not 21) |
| A-04, A-05, A-06 | implied by **V2-H.13** scope (read-path repoint); see NEW below |
| B-04, B-02 | **V2-H.11** (positions skeleton); B-04 closes the orphan in V2-H.11 |
| B-07, B-08 | **V2-A.9** + **V2-C.11 / V2-C.12 / V2-C.13** (Distribution Studio swimlane/heatmap/bench sidebar) |
| B-10 | **V2-H.8** (capacity reserves leave) |
| C-04 | **V2-H.9** (LeaveCalculatorService working-day) |
| C-09, C-08 | **V2-A.9**-adjacent DS-finish; **V2-B.13**/`V2-A.11a` chain for MUI removal |
| C-10 | **V2-A** profile-360 canvas-wiring gap (Track 4 §6) |
| D-06 | **NEW-LGL-5** (Law-7 unified approvals) |
| D-01, E-01 | **NEW-LGL-2** (SSO admin UI / D-155) |
| E-02 | **NEW-LGL-3** (custom-role admin / D-159) |
| E-03 | **V2-H.3** (base-currency tab) + **V2-H.19** (multiCurrency flip) |
| E-04 | **V2-H.20** (fiscal flag flip) |
| E-05 | **NEW-LGL-4** (Create-Project-Wizard accelerator) |
| B-09, D-05 | **V2-C.4–C.9** (JQL — half BE) + Track 4 JQL-bar canvas-wiring gap |
| F-04 | **V2-G.4** (`dsRefresh` flip) + **V2-X.6** (audit dsRefresh callsites) |
| G-08 | **V2-H.14** (contract migration) |
| G-09 | **V2-H.15** (deprecated-import ratchet) + **V2-H.16** (delete ds-legacy CSS) |
| G-06 | **V2-G.13** (`/workload*`) + **V2-G.14** (assignments/staffing-requests/etc.) |
| G-07 | **V2-G.10** (legacy per-role dashboards) |
| G-02 | **V2-G.11** (delete `/admin/hris`) |
| H-01 | **V2-G.1** (visual-regression suite) |
| B-02 (Plan-tab Gantt sibling) | **V2-A.3** (Plan Gantt) + **V2-B.7** (GanttRow adoption) |

### 5.2 Genuinely NEW items (propose NEW-* IDs)

| Proposed ID | Title | Why new (no existing tracker item) | Track |
|---|---|---|---|
| **NEW-LGL-6** | Extract `SuggestFillsService` (suggestForPosition + suggestForBatch) off ProjectPosition | Matching logic currently embedded in `workforce-planner.autoMatch` over legacy models; no item scopes the extraction that backs both planner + Find-Candidates (A-02) | 3 |
| **NEW-LGL-7** | Build `ProjectPositionDetailPage` + `GET /project-positions/:id/candidates` + wire `/transition` | V2-H.11 is only a "skeleton list page"; no item covers the detail page, candidate endpoint, or wiring the dark transition endpoint into a reachable flow (B-01/B-02/B-03). Also kills the dead `/positions/:id` cmdk href | 1 |
| **NEW-LGL-8** | Lean RELEASED transition replacing dual-approval offboarding | No item; drop-list drops PersonReleaseRequest but nothing builds the replacement (B-06) | 1 |
| **NEW-LGL-9** | Build `GET /me/overview` + `GET /me/memberships` (ProjectPosition-scoped) | No item; `/me` tabs improvise via legacy aggregators; these are the lean self-service payloads (C-02/C-03) | 1 |
| **NEW-LGL-10** | Repoint role-dashboard query services + person-profile + time domain off InMemory/legacy onto ProjectPosition | V2-H.13 says "21 callsites" generically; verifier found ~34 incl. dashboards (InMemory), person-profile, and 3 time-domain reads not enumerated (A-04/A-05/A-06) | 5 |
| **NEW-LGL-11** | `GET /leave-requests/preview` + `POST /leave-requests/:id/cancel` | No item; lean leave form needs server-authoritative preview + self-cancel (C-04 partial overlaps V2-H.9 calc; preview+cancel endpoints are new) | 3 |
| **NEW-LGL-12** | Emit `leave.approved/rejected/cancelled` outbox + NotificationEventTranslator (close 20b-10) | 20b-10 is an old open item but has no V2 track entry; the only remaining OPEN leave loop after 20c-05 closed (C-06) | 1 |
| **NEW-LGL-13** | `LeavePolicy` model + nightly `LeaveBalanceDriftSweep` | No item; balance is currently a free-Decimal source of truth, not a policy-driven derived projection (C-07) | 3 |
| **NEW-LGL-14** | `StaffingDeskTab` Prisma model + JQL end-to-end wiring (`lib/api/jql.ts`, JqlQueryBar mount, `?tab=`/`?jql=`) | V2-C.4–C.9 cover JQL atoms/half-BE but no item adds the persisted-tab model or the FE api/serialization (B-09) | 3 |
| **NEW-LGL-15** | Clean cmdk-search legacy branch + opaque-id hrefs + fix dead `/positions/:id` | No item; the one in-area legacy reader, must be cleaned before contract migration (A-07) | 5 |
| **NEW-LGL-16** | Collapse duplicate integrations endpoints + merge `/admin/integrations` + `/registry` into one DS tab | No item; two overlapping endpoints/pages serve near-identical data (D-02/D-03/D-04) | 4 |
| **NEW-LGL-17** | Subject-employee `AllowSelfScope` read on Cases | No item; onboarding subject can't see own case from `/me` (C-11) | 3 |
| **NEW-LGL-18** | Overtime-policy CRUD disposition (wire `/admin/time-policies` OR drop for PlatformSettings) | No item; 4 built-unwired/no-FE endpoints need a build-or-drop decision (F-01) | 3 |
| **NEW-LGL-19** | Flag-gate `/help` route to existing `flag.helpCenter.enabled` | No item; flags exist but route is unwired to them (E-06) | 2 |
| **NEW-LGL-20** | Retire orphaned `TimesheetPage`/`TimesheetApprovalPage` + dead `/my-time/gaps`, `team-builder`, `fulfil` | Dead-surface cleanup not in V2-G enumeration (G-01/G-03/G-04) | 5 |
| **NEW-LGL-21** | Move Case SLA config off InMemoryCaseSlaService to PlatformSetting | No item; operational persistence gap (C-12) | 2 |

**Critical-path sequencing note (validation §8):** Track 1 is BE-heavy and overlaps concurrent-agent staffing/workstream territory. **A-01 → A-02/A-03 → A-08 → B-06/B-07 → (A-04/A-05/A-06) → G-08** is the irreversible spine; the `20260720_lean_staffing_contract` migration (G-08, forward-only, docs' #1 risk) must run **only after** every read-path repoint lands, or every live staffing/time/self-service surface breaks at cutover. Confirm `ProjectPosition` read-path ownership before starting any ⚑ item.
