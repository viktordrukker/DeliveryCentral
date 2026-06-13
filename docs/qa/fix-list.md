# DeliveryCentral V2 — QA Fix List

_Autonomous full-surface QA run, 2026-06-13. Branch `qa/v2-full-surface-2026-06-13` @ `origin/main` (f61d776d). Every finding below is adversarially verified (default stance "not a bug"; only what survived live reproduction + control cases is listed). Surface under test: v2-staging (`deliverit-test-v2.agentic.uz`, dsRefresh+workspaceMe forced ON) — the surface targeted for the C0 cutover._

## Summary

| Sev | Count | Headline |
|-----|------:|----------|
| **P1** | 2 | `project-positions` list 400s on pagination → `/me` Projects tab + paginated callers broken; person-detail page 400s via publicId → profile/skills/360/suggested all dead on dsRefresh surface |
| **P2** | 2 | Missing query-param validation → 500 (6+ endpoints); systemic publicId→UUID-only-endpoint id-type mismatch |
| **P3** | 6 | overtime UUID pipe; setup-token hardening; employee `/people` console noise; employee `/projects` health badges; sidebar badge↔drilldown mismatch (Law 9); 46/90 dead flags |
| Design | 15 | DS canvas PARTIAL conformance (see `ds-fe-gap.md`) — mostly polish |

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

## P3

| ID | Finding | Root cause → Fix |
|----|---------|------------------|
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
