# DeliveryCentral V2 — QA Fix List

_Autonomous full-surface QA run, 2026-06-13. Branch `qa/v2-full-surface-2026-06-13` @ `origin/main` (f61d776d). Every finding below is adversarially verified (default stance "not a bug"; only what survived live reproduction + control cases is listed). Surface under test: v2-staging (`deliverit-test-v2.agentic.uz`, dsRefresh+workspaceMe forced ON) — the surface targeted for the C0 cutover._

## Summary

| Sev | Count | Headline |
|-----|------:|----------|
| **P1** | 2 | `project-positions` list 400s on pagination → `/me` Projects tab + paginated callers broken; person-detail page 400s via publicId → profile/skills/360/suggested all dead on dsRefresh surface |
| **P2** | 4 systemic classes + 3 | query-param→500; publicId→UUID id-type; `/cases` dead-end (F-1b-E); **4 systemic classes below**: actor-spoofing (5 eps), undecorated-`@Body` (project-update silent no-op + unvalidated planner writes), Law-9 KPI-drilldowns (~8 KPIs + backend ignores filters), timezone date off-by-one (~21 sites) |
| **P3** | ~10 | overtime UUID pipe; setup-token; `/people` 403 noise (3 roles); `/projects` health 403; 46/90 dead flags; platform-settings null actor (F-WP-4); audit-attribution gaps; KPI unit/fragile-drilldown (F-DC-4/5) |
| Design | 15 | DS canvas PARTIAL conformance (see `ds-fe-gap.md`) — mostly polish |

_The F-1b-E / F-WP-* / F-DC-* findings were surfaced during the validation campaign (rounds 4–6: cross-role render sweep, static write-path tracing, dashboard data-consistency) — the first pass missed them entirely. The three systemic classes are in **`## Systemic classes`** below; full per-finding detail in `_slices/findings-r5.json` + `findings-r6.json` + `findings-phase1b-r4.json`._

## Systemic classes (validation rounds 5–7)

These four classes each span multiple endpoints/surfaces with one root mechanism — fix the mechanism, not just the instances.

### SC-1 · Actor-spoofing (P2, security) — `F-WP-1-CLASS`
5 write endpoints persist a **client-supplied** actor into DB audit columns instead of `req.principal`: `POST /staffing-desk/planner/apply`, `/planner/scenarios`, `/org/people/:id/terminate`, `/cases/:id/comments`, `/projects/:id/assign-team`. Any authorized user can forge the audit trail. **Fix:** source actor from `req.principal` everywhere; the body actor field is only readable because of SC-2. (The other ~18 write handlers correctly use the principal.)

### SC-2 · Undecorated `@Body()` DTOs (P2) — `F-WP-2-CLASS` — two opposite failure modes
- **Interface bindings** (`planner/apply`, `planner/scenarios`, `team-builder`) have no runtime metatype → `ValidationPipe` can't validate or whitelist-strip → the full body (incl `actorId`) passes through unvalidated (enables SC-1 + malformed writes).
- **Undecorated classes** (`UpdateProjectRequestDto`, `reporting-lines` terminate, `resource-pools`) → with `whitelist:true` class-validator **strips every undecorated prop** → the service gets an empty object. **`PATCH /api/projects/:id` therefore SILENTLY SAVES NOTHING — project name/description/PM/DM edits return 200 but are discarded (data-loss).**
**Fix:** convert all `@Body()` targets to class-validator DTO classes with proper decorators — this both validates and makes whitelist keep the real fields (fixes the no-op) while stripping body `actorId` (fixes SC-1).

### SC-3 · Law-9 KPI-drilldown mismatches (P2) — `F-DC-CLASS`
~8 dashboard KPIs (director At-risk 7≠40, DM Active 10≠0, HR Active-Employees 200≠201, RM Idle 5≠198, Workload Active 10≠40, Open-positions 36≠33, Budget-variance, RM Managed 5≠198) link to drilldowns whose filter params the destination page **silently drops** (`useFilterParams` ignores keys not in the page's `defaults`), compounded by case-sensitive value matching and wrong param names. Clicking a KPI lands on a differently-sized (usually unfiltered) list. **Fix:** align each KPI's drilldown params to the page's filter schema (add missing keys: `rag`, idle/bench, manager-scope; normalize case; fix `status`→`lifecycleStatus`; reconcile units), and add a test asserting KPI value == drilldown count. **Compounding (`F-DC-CLASS-BACKEND`):** `GET /api/projects` ignores ALL status filter params server-side (`?status`/`?lifecycleStatus`/`?state`/`?statuses` all return 40) — so the list relies entirely on the broken client filter. Fix the FE params *and* add server-side filtering (or guarantee the client filter is correct).

### SC-4 · Off-by-one calendar dates in Americas browsers (P2) — `F-TZ-DISPLAY`
Date-only `@db.Date` fields (project start/end, skill validity, case opened, hire/leave dates) are serialized UTC-midnight and rendered with `new Date(x).toLocaleDateString()` → formatted in the **browser** timezone → **shown one day early** in any negative-UTC-offset zone. **21 of 39** date-render sites match the pattern; the correct tenant-tz formatter (`lib/locale.ts`) exists but has **0 callers** (dead code); 10 sites are correctly guarded. **Fix:** route the ~21 unguarded sites through the existing `useLocale()`/`formatDate` (or a shared `<DateText>`), or format date-only values from the `'YYYY-MM-DD'` string without `new Date()`; standardize backend `@db.Date` serialization; add an Americas-tz render test.

Coverage: 414 endpoints probed (zero-mutation), **1,781 action wires** reconciled (re-traced in validation round 2 after an independent audit caught a ~35% undercount in the first pass), 22 route renders driven (4 roles), 18 DS canvases, 90 flags. See `availability-matrix.json` / `action-inventory.json` for per-row verdicts.

---

## P1 — must fix before C0 flip

### P1-1 · `GET /api/project-positions` 400s whenever pagination params are sent → `/me` Projects tab dead for all users
**Trace:** `F-1b-A` · breaks `/me` Projects tab (all roles) + PulseTab, ProjectPositionsList, ExportCentre, CommandPalette (any caller sending `take`/`skip`).

**Root cause:** `ListProjectPositionsQueryDto` (`src/modules/project-positions/application/contracts/project-position-requests.ts:223-234`) declares `take?: number`/`skip?: number` with `@IsInt() @Min/@Max` but **no `@Type(() => Number)`**. Express delivers query params as strings; the global `ValidationPipe` (`src/main.ts:67-72`) runs `transform: true` **without** `transformOptions.enableImplicitConversion: true`, so `@IsInt()` validates the string `'200'` and throws `400 {"message":["take must not be greater than 200","take must not be less than 1","take must be an integer number"]}`. Sibling DTOs do it right (`case-management/.../list-cases.query.ts:20-25` uses `@Type(() => Number) @IsInt()`).

**Fix (surgical):** Add `@Type(() => Number)` (`import { Type } from 'class-transformer'`) above `@IsInt()` on both `take` and `skip`. _Alternative (global, broader blast):_ set `transformOptions: { enableImplicitConversion: true }` on the `ValidationPipe` — fixes this entire bug class everywhere but is a wider behavioral change; prefer the per-DTO fix for this finding and consider the global one as a separate hardening task.

**Evidence:** Runtime repro of the exact prod pipe+DTO → 400; control with `enableImplicitConversion:true` → passes (`take`→200). FE dead-end: `frontend/src/routes/me/ProjectsTab.tsx:38,42-43,68` (ErrorState, no fallback). No HTTP-level test exercises this endpoint with query params (untested gap).

### P1-2 · Person-detail page 400s via publicId deep-link → profile/skills/360/suggested all broken on dsRefresh surface
**Trace:** `F-1b-B` (+ systemic `F-SYS-1`) · breaks the entire `/people/:id` page on the dsRefresh/v2 surface (the one under QA toward C0). Production (dsRefresh=false legacy path) is unaffected.

**Root cause:** ID-type contract mismatch. The FE deep-links with the opaque publicId (`PersonDirectoryInspector.tsx:213`, `EmployeeDirectoryPage.tsx:638/654/741` → `/people/${publicId ?? id}`); `EmployeeDetailsPage.tsx:73,327` passes that segment **unconverted** into `PersonProfilePanel`, which forwards the same `personId` to every tab. But the person sub-resource endpoints are **UUID-only**: `person-profile.controller.ts:29` (`/people/:id/profile`), `project-positions.controller.ts:367` (`/suggested-positions`), `skills.controller.ts:81,92` (`/skills`), `people-360.controller.ts:40` (`/360`) all use `@Param(ParseUUIDPipe)` → `400 "Validation failed (uuid is expected)"`. Profile is the default tab, so the page opens to a fatal `ErrorState`. (The directory record endpoint `/org/people/:id` already uses `ParsePublicIdOrUuid(Person)` and returns 200 — that's why the directory itself works.)

**Fix:** Swap `ParseUUIDPipe` → `ParsePublicIdOrUuid(AggregateType.Person)` on the 4 person sub-resource params (`getProfile`, `suggestedPositions`, `getPersonSkills`+upsert, `people-360 getById`) and resolve publicId→uuid in the service (the established W1-09 pattern, mirror `person-directory.controller.ts:177-186`). _Avoid_ the FE-side workaround of passing the resolved UUID down — it would leak a raw UUID into the call surface, contradicting the no-UUIDs direction.

**Evidence:** Live on v2-staging: `GET /api/people/usr_ed542313b886/profile` → 400; `GET /api/people/<uuid>/profile` → 200; `/org/people/usr_...` → 200. FE link uses publicId + flows unconverted (file:lines above). `dsRefresh` default false (`feature-flags.ts:199`), forced ON on v2-staging.

---

## P2

### P2-1 · Missing query-param validation crashes 6+ GET endpoints with 500 instead of 400
**Trace:** `F-1a-1` · API robustness; **not reachable via the real UI** (FE always sends the params). Endpoints: `GET /api/assignments/skill-match` (skills), `/api/my-time/gaps` + `/my-time/month` (month), `/api/staffing-desk/project-timeline` (from), `/api/time-management/compliance` + `/team-calendar` (month); likely also `/api/my-time/auto-fill`, `/copy-previous`.

**Root cause:** Required query params bound as raw `@Query('x') x: string` with no DTO/pipe, then `x.split()`/`x.match()`/`new Date(x)` throws a plain TypeError/Error → `StructuredExceptionFilter` maps to 500. `parseMonthQuery` (`timesheets/.../month.query.ts`) throws plain `Error` not `BadRequestException`; a validated `MonthQueryDto` exists but isn't wired in.

**Fix:** Wire `MonthQueryDto`/a `ValidationPipe` on these params and make `parseMonthQuery` throw `BadRequestException`. Return 400 with a clear message, never 500. (`getQueue()` at `time-management.controller.ts:75-76` already guards with `monthStr ?` — apply the same to `getCompliance`/`getTeamCalendar`.)

### P2-2 · Systemic id-type mismatch: 201 `ParseUUIDPipe` (UUID-only) vs 13 publicId-tolerant params
**Trace:** `F-SYS-1` · P1-2 is the confirmed instance; this is the umbrella audit item.

**Root cause / fix:** The publicId deep-link migration was completed in the FE but only 13 backend params adopted `ParsePublicIdOrUuid`. Audit every FE deep-link (`/<entity>/${...publicId ?? ...id}`) against its route's param pipe; migrate UUID-only endpoints that receive a publicId. Prioritise entity detail drilldowns (person done in P1-2; check project/case/resource-pool/team next — these were not exhaustively render-swept because admin/some detail routes weren't drivable).

---

### P2-3 · `/cases` ("HR Queue") nav-visible to ALL_ROLES but `GET /api/cases` is HR_GOVERNANCE_ROLES → dead-end for PM/RM/employee
**Trace:** `F-1b-E` (RBAC route↔endpoint mismatch class, with F-1b-C/D). Route `route-manifest.ts:342` is `ALL_ROLES, navVisible`; endpoint `cases.controller.ts:102` is `@RequireRoles(...HR_GOVERNANCE_ROLES)`. PM/RM/employee see "HR Queue", click it, hit 403 on the page's primary data. **Fix:** align the route's `allowedRoles` to the endpoint's roles (or relax the endpoint). Same sweep should fix F-1b-C/D (ungated side-fetches) — ensure every nav route + unconditional fetch is gated to its endpoint's `@RequireRoles`, and catch the uncaught promise.

### P2-4 · Actor-spoofing: client-supplied `actorId` persisted to audit columns on planner writes
**Trace:** `F-WP-1`. `staffing-desk.controller.ts:158` `applyPlan(@Body() request)` → service writes `request.actorId` into `ProjectPosition.createdByPersonId` + `ProjectPositionFillHistory.changedByPersonId` (`workforce-planner.service.ts:1613-1683`); same on `planner/scenarios`. Any staffing user can forge attribution. **Fix:** inject `req.principal.personId`, ignore body `actorId` (match sibling endpoints). **Systemic:** 23 controller sites across 10 modules read actor-ish fields possibly from `@Body` — see round-6 sweep (ties to the D-103 write-path gap).

### P2-5 · `@Body()` bound to TS interfaces (not class-validator classes) → unvalidated writes
**Trace:** `F-WP-2`. `planner/apply`, `planner/scenarios`, `team-builder` bind `@Body()` to interfaces, so the global `ValidationPipe` has no metatype to validate or whitelist-strip → unchecked `personId/projectId/allocationPercent/dates` reach Prisma (and is the root of P2-4). **Fix:** convert to class-validator DTO classes.

### P2-6 · `POST /api/cases/:id/participants` (add/remove) never persists — silent no-op
**Trace:** `F-WP-3`. `cases.controller.ts:351-387` mutates the entity but never calls `caseRecordRepository.save()` (comment admits it). Add/remove returns 200 but the DB is unchanged. **Fix:** call `save()`; ensure the repo deletes removed participants (`prisma-case-record.repository.ts:108-119` is currently append-only).

### P2-7 · Director "At-risk projects" KPI = 7 but drilldown shows 40 (Law 9)
**Trace:** `F-DC-2`. KPI links `/projects?rag=AMBER,RED` but `rag` isn't in `ProjectsPage.tsx:31-43` FILTER_DEFAULTS → silently ignored → all 40 shown. **Fix:** wire `rag` into the page filter, or change the drilldown.

### P2-8 · DM "Active Projects" KPI = 10 but drilldown shows 0 — case-sensitive status filter
**Trace:** `F-DC-3`. KPI links `/projects?status=active`; `ProjectsPage.tsx:186` filters `item.status !== filters.status` case-sensitively under dsRefresh → `'ACTIVE' !== 'active'` excludes all 10. **Both a Law-9 lie and a real filter bug** (any mismatched-case status filter returns empty). **Fix:** normalize case in the comparison (the core bug), and/or make the KPI link uppercase.

## P3

| ID | Finding | Root cause → Fix |
|----|---------|------------------|
| `F-DC-4` | Director "Open positions" KPI 36 ≠ drilldown 33 | Unit mismatch — KPI counts positions, list counts projects. Relabel "36 across 33 projects" or list positions. |
| `F-DC-5` | Budget-variance drilldown `budgetStatus=over` ≠ GREEN\|YELLOW\|RED enum | Returns 0 even when over-budget (0 today). Map drilldown value to the enum. |
| `F-1a-2` | `GET /api/overtime/resolve/:personId` 500 on non-UUID id; also **FE-dead** | `overtime.controller.ts:57` omits `ParseUUIDPipe` (peer routes have it) → Prisma UUID crash. Add the pipe. `fetchResolvedPolicy` has no FE callers — consider removing. |
| `F-1a-3` | `POST /api/setup/token/issue` not gated on setup-complete (hardening; **not** the priv-esc vuln it first looked like — 200 returns only `{tokenIssued:true}`, never the secret) | Gate `issueToken()` on `setup.completedAt` (mirror `getStatus()`) so it's a no-op post-install. |
| `F-1b-C` | Employee `/people`: ungated `fetchResourcePools()` + bench fetch 403 → empty pool filter + hidden bench chip + 1 **uncaught** `ApiError` in console (page itself renders fine) | Gate the two side-fetches behind `hasAnyRole(...)` in `EmployeeDirectoryPage.tsx:139-141`; catch the promise. |
| `F-1b-D` | Employee `/projects`: `403 GET /api/projects/health` → health column shows `—` + console noise (list renders fine) | Gate the FE health-badge call behind manager roles, or relax the endpoint to ALL_AUTHENTICATED. Cosmetic. |
| `F-DC-1` | Sidebar badges ≠ drilldown counts (projects 10/40, approvals 8/25, hrQueue 203/50; bench 135/135 ✓) — Law 9 | Make each badge query match its destination page's default view, or relabel as "N need action". `sidebar-counts.service.ts:41-106`. |
| `F-FLAG-1` | 46/90 feature flags declared but gate nothing | Wire or delete each dead flag; keep the 3 half-built-hider flags OFF. See `feature-toggles.md`. |

---

## Design conformance (see `ds-fe-gap.md`)
15 of 18 DS canvases are **PARTIAL** (1 MATCH: `page-director`; 3 NO-CANVAS: `/admin`, `/admin/settings`, and `page-admin-setup` which is actually a mislabeled tokens-reference). No raw-hex token violations. Gaps are predominantly missing/extra sections and a few non-DS primitives — design polish, not breakage. Several "missing" items are **intentional UX deviations** the agents flagged as such (e.g. approvals "Escalate to Director" omitted by design — no generic escalate endpoint). Triage `ds-fe-gap.md` per canvas with design before treating as defects.

## Coverage caveats (honest gaps)
- **Admin surface not live-tested:** `/admin`, `/admin/settings` need an admin account; admin login 401s on staging (non-default `SEED_ADMIN_PASSWORD`). Endpoints under `/api/admin/*` returned correct-403 for non-admin roles (RBAC verified) but their happy-path + render were not exercised. Needs operator staging admin password.
- **Write/delete endpoints not live-executed:** verified auth-gating (no-token → 401) only, zero-mutation by design. Write-path correctness relies on static guard analysis + the action↔API reconcile (392 resolved action wires match real controller routes; 17 residual are benign admin/setup path approximations); recommend exercising the high-value reversible flows (assign, approve, submit) on staging in a follow-up.
- **Route render sweep:** 22 navs across 4 roles (V2-active surface + key detail pages). The ~93 obsolete-in-V2 / admin / less-trafficked routes carry a `RENDER-PENDING` verdict in `availability-matrix.json` (registered + data-layer probed, runtime render not driven).
- **One unconfirmed wire:** `POST /api/projects/:id/role-plan/generate-requests` (1 action) has no matching controller route — likely an agent path approximation; verify against the real handler.
- **Mutating action wires labeled honestly:** 238 POST/PATCH/PUT/DELETE action rows are `WIRE-OK-NOT-EXECUTED` in the matrix (route+method exist; body/role/side-effect NOT live-executed under the zero-mutation policy). Recommend static handler→service→repo trace + reversible-flow exercise for the ~12 high-value ones (assign/approve/submit/resolve/propose).
- **Inventory scope = actionable wires.** The 1,781 rows target API-triggering, navigation, and state-changing controls. Pure-display help atoms (41 `TipBalloon`/`TipTrigger` tooltips, 85 `SectionCard` collapsible toggles, 118 `ErrorState` instances) are NOT individually enumerated — they carry no wire and can't harbor wire-level bugs. Law-2 (no dead-ends) is structurally satisfied for the default `ErrorState variant='page'` (always renders a "Go to Dashboard" link); residual: `variant='inline'` without `onRetry` could dead-end in a nav-less context — worth a targeted Law-2 sweep.
