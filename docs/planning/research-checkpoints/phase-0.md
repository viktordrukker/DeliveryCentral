# Phase 0 Checkpoint — Preflight Reading

**Run date:** 2026-05-09
**Branch:** `main` (per user instruction; no research branch)
**Working tree:** dirty (44+ modified files; audits anchor to current-state-as-modified)
**Checkpoint scope:** the 5 Phase-0 acceptance questions from `CLAUDE_CODE_RESEARCH_PROMPT.md` lines 137-141.

Files read (or already in context): `CLAUDE.md` (loaded via system prompt), `docs/planning/MASTER_TRACKER.md` (status summary L1-87), `docs/planning/current-state.md` (full + L1-250 detail), `docs/planning/canonical-staffing-workflow.md` (full), `docs/planning/HARDEN_BRIEF.md` (TOC + §1 + D-register), `docs/planning/HARDEN_WIRING_MAP.md` (TOC + §2.1-2.10 + §11-§16), `docs/planning/CLAUDE_CODE_TASKS.md` (TOC + validation triage), `docs/planning/persona-jtbds.md` (full), `docs/planning/phase18-page-grammars.md` (full), `docs/planning/phase18-route-jtbd-audit.md` (full), `frontend/src/app/route-manifest.ts` (full).

---

## Q1 — The 6 design systems and their CI gates

The framing of "6 design systems" is established in `HARDEN_WIRING_MAP.md` §16 (lines 1816-1898). One DS is shipped today; five are proposed standardization spines whose CI gates are mostly planned, not yet wired.

| # | Design system | Charter | CI gate today | Owner doc |
|---|---|---|---|---|
| 1 | **UI / Visual DS** (existing) | tokens, atoms, page grammars, primitives | `tokens:check` (`scripts/check-design-tokens.cjs`) **and** `ds:check` (`scripts/check-ds-conformance.cjs`) — both wired into `verify:pr` (`package.json:59`); ratcheting baselines at `scripts/design-token-baseline.json` and `scripts/ds-conformance-baseline.json` | `phase18-page-grammars.md`, `design-tokens.ts` |
| 2 | **API DS** (proposed, §11) | URL/envelope/error/pagination/idempotency/versioning across 270 endpoints | `api:check` planned, **not yet implemented**; today only `contracts:validate` runs | `api-design-system.md` (to author) |
| 3 | **Authorization DS** (proposed, §12) | role catalog, action catalog, scopes, approvals, audit-on-read | `rbac:check` is wired into `verify:pr` (`package.json:59`); `check-authorization-conformance.cjs` planned for fuller coverage of 1,041 hardcoded role literals (§12.1) | `authorization-design-system.md` (to author) |
| 4 | **Data DS** (proposed, §13) | id/audit/soft-delete/effective-dating/tenant/index/FK conventions across 87 Prisma models | `schema:check`, `migrations:check`, `enum:check`, `publicid:check` are wired into `verify:pr`; new audit-columns ratchet planned | `data-design-system.md` (to author) |
| 5 | **Customization System** (proposed, §14) | zero-hardcode policy across 4 layers (PlatformSetting / MetadataDictionary / CustomFieldDefinition / WorkflowDefinition) | `check-no-hardcode.cjs` planned, **not yet implemented** | `customization-system.md` (to author) |
| 6 | **Consistency / Invariants DS** (proposed, §15) | invariant register + reconcilers + sagas + idempotency | `check-invariants.cjs` planned, **not yet implemented** | `data-consistency.md` (to author) |

`verify:pr` today runs: `lint && architecture:check && contracts:validate && tokens:check && schema:check && migrations:check && enum:check && publicid:check && rbac:check && test:fast && frontend tests` (`package.json:59`). Three cross-cutting non-DS layers also exist: Observability, Test strategy, Migration discipline (§16, lines 1850-1855).

---

## Q2 — Canonical 9-status assignment state machine

Source: `docs/planning/canonical-staffing-workflow.md` (88 LOC). Domain truth: `src/modules/assignments/domain/value-objects/assignment-status.ts` (`ASSIGNMENT_STATUS_TRANSITIONS` table).

**The 9 statuses** with setters and terminality:

| Status | Setters | Terminal? |
|---|---|---|
| CREATED | PM, DM, Admin, Director | no |
| PROPOSED | RM, DM | no |
| REJECTED | PM, DM, Director | yes |
| BOOKED | PM, DM, Director | no |
| ONBOARDING | PM, DM, Director | no |
| ASSIGNED | PM, DM, Director | no |
| ON_HOLD | PM, RM, HR, Director | no |
| COMPLETED | PM, DM, Director | yes |
| CANCELLED | PM, DM, Director, RM | yes |

`admin` can perform every transition (break-glass).

**Transitions (paraphrased from the diagram):**
- `(new) → CREATED → PROPOSED`
- `PROPOSED → {REJECTED (terminal), BOOKED}`
- `BOOKED → ONBOARDING → ASSIGNED → COMPLETED (terminal)`
- `{ONBOARDING, ASSIGNED} ↔ ON_HOLD` (release back to ASSIGNED)
- `CANCELLED` is reachable from every non-terminal state (terminal)

**Reason required** for: any → REJECTED, any → CANCELLED, {ONBOARDING, ASSIGNED} → ON_HOLD.

**HTTP surface:** 9 transition endpoints on `/assignments/:id/{propose,reject,book,onboarding,assign,hold,release,complete,cancel}`. Body: `{ reason?, caseId? }`. Both the domain entity (`ProjectAssignment.transitionTo()`) and the application service (`TransitionProjectAssignmentService`) consult the same transitions table; controllers add `@RequireRoles(...)` as defense in depth.

**Audit:** every successful transition writes `AssignmentHistory` with `changeType = STATUS_<TARGET>`. Reason is persisted both on `AssignmentHistory.changeReason` and denormalised on `ProjectAssignment` (`rejectionReason`, `cancellationReason`, `onHoldReason`, `onHoldCaseId`).

**Tests:** `test/assignments/assignment-transition-matrix.spec.ts` — table-driven, asserts every allowed/disallowed combo + reason enforcement.

**Status of cutover:** Phase CSW landed on 2026-04-18 (MASTER_TRACKER L85 — domain + schema + services + controllers + notifications + frontend + seeds + tests + docs all done). Phase WO-6 (deprecate the legacy `approve/reject/end/revoke/activate` endpoints that still coexist with the canonical 9) is pending — see D-04 and Q5.

---

## Q3 — Which 84 discrepancies are already cataloged

The discrepancy register in `HARDEN_BRIEF.md` §2 catalogues **D-01 through D-84** (highest ID confirmed: `grep -hoE "\bD-[0-9]+\b" HARDEN_BRIEF.md HARDEN_WIRING_MAP.md | sort -uV | tail -1` → `D-84`).

**Layout of the register:**
- D-01 through D-25 — initial discrepancy register (HARDEN_BRIEF §2 lines 80-128); written before live walks; covers credentials, backend health, schema drift, workflow cutover, test gaps, multi-tenancy, publicId rollout, double-truth columns, missing fields, self-approval guards, config catalog, pulse, time-reporting alerts, "coming soon" gaps, status-vocabulary mismatches, frontend stack constraints, in-memory naming, DS deferred items.
- D-26 through D-43 — first round of live-stage walks 2026-05-02 (HARDEN_BRIEF §2 lines 110-128); credentials confirmation, breadcrumb leak (D-27), Create Employee title bug (D-28), Russian date locale (D-29), legacy skillsets writes (D-30), missing form fields (D-31), empty SLA columns (D-32), Director Dashboard tile gaps (D-33), empty demand pipeline (D-34), empty Client column (D-35), grade dictionary mismatch (D-36/D-41), onboarding widget hardcoded (D-37), 7-vs-8 roles (D-38), session timeout aggression (D-39/D-40), Line Manager dropdown unusable (D-42), OrgUnit dropdown flat (D-43).
- D-44 through D-74 — second round of deep workflow walks 2026-05-02 (HARDEN_BRIEF §2 lines 134-166); copy bugs, status-derivation bugs (D-45/D-49 Person 360 inactive lie), critical event-pipeline regressions (D-47 hire emits no `EmployeeActivityEvent.HIRED`, D-59 activate no audit, D-70 notification fan-out broken), KPI-vs-Pulse contradiction (D-54), radiator cold-start bias (D-55), navigation breaks (D-50/D-51/D-58/D-60/D-71/D-74), staffing-form excellence (D-65/D-66 used as positive references), planner read-only / overflow color blindness (D-72/D-73).
- D-75 through D-84 — extension batch (in HARDEN_BRIEF §2 + WIRING_MAP §8.1; total 84 confirmed by id-extraction grep).

**Validation triage applied 2026-05-03** (`CLAUDE_CODE_TASKS.md` lines 12-67) **REFUTES** several D-items as already-done in the repo — those should NOT be re-investigated:

| Refuted D-item | Why | Owner task in tasks doc |
|---|---|---|
| D-02 (PublicIdBootstrapService DI) | DI works; `public-id.module.ts:40-52` registers + exports correctly | TASK 0.1 |
| D-27 (breadcrumb derive-from-route) | Already derives from per-page `items` prop (`Breadcrumb.tsx:13-44`) | TASK 0.10 |
| D-28 ("New Admin" page title) | Page is correctly titled "Employee Lifecycle Admin" | TASK 0.11 |
| D-29 (date locale) | Native `<input type="date">`; locale is OS-driven | TASK 0.12 |
| D-47/D-59/D-70 (event/audit/notification pipeline) | Pipeline IS firing for Create Employee + Activate Project; only `OutboxEvent` table is unused (covered by separate F2.1-2.4 task) | TASK 0.17 |
| D-68 (Cmd+K People search) | Already wired (`CommandPalette.tsx:78-79, 217-226`) | TASK 0.23 |

The validation table also lists J-REVISED items (e.g., TASK 0.14 — drop "rename to P1-P5", honor tenant-configurable grade dictionary) and items confirmed verified-and-real, ordered by execution priority (TASK 0.16 WRITE-BLOCK-SKILLSETS first; D-30 / D-46 silent data loss on every hire).

For Phase 1+ research: cite refuted D-items as `[REFUTED 2026-05-03]` rather than re-discovering them.

---

## Q4 — User roles and default routes

Source: `frontend/src/app/route-manifest.ts` (217 LOC) and the IT-Company test accounts table in `CLAUDE.md` §10.

**7 base roles** (`AppRole` type, route-manifest.ts:1-8):

```
employee | hr_manager | project_manager | resource_manager
        | delivery_manager | director | admin
```

Multi-role assignment is supported on a single `Person` (e.g., `emma.garcia@itco.local` carries `resource_manager + hr_manager` per `CLAUDE.md` §10). The "8 roles" framing seen in older docs counts dual-role as separate; **D-38** corrects this — the accurate framing is "7 base roles + multi-role assignment."

**Default landing per role.** Every role authenticates to `/` (Workload Overview — `ALL_ROLES` allowed, route-manifest.ts:112), and the auto-redirect-by-role pattern routes each to a role-specific dashboard:

| Role | Default dashboard | RBAC constant |
|---|---|---|
| `employee` | `/dashboard/employee` | `EMPLOYEE_DASHBOARD_ROLES` (route-manifest.ts:48) |
| `project_manager` | `/dashboard/project-manager` | `PM_DASHBOARD_ROLES` (line 49) |
| `resource_manager` | `/dashboard/resource-manager` | `RM_DASHBOARD_ROLES` (line 50) |
| `hr_manager` | `/dashboard/hr` | `HR_DASHBOARD_ROLES` (line 51) |
| `delivery_manager` | `/dashboard/delivery-manager` | `DELIVERY_DASHBOARD_ROLES` (line 52) |
| `director` | `/dashboard/director` | `DIRECTOR_ADMIN_ROLES` (line 53) |
| `admin` | `/` (or `/dashboard/director` per ROLE_PRIORITY tie-break) | all routes available |

**Sidebar groups** (RouteGroup, route-manifest.ts:10): `dashboard`, `people-org`, `work`, `governance`, `evidence`, `admin`. Note: the research-prompt's listing ("MY WORK / DASHBOARDS / PEOPLE & ORG / WORK / GOVERNANCE / ADMIN") differs slightly — the route-manifest does not have a separate "MY WORK" group, and `evidence` is its own group. This is a Phase 7 (tab/nav audit) input.

**ROLE_PRIORITY** (line 97-105) for tie-breaks when a person has multiple roles: `admin > director > hr_manager > resource_manager > project_manager > delivery_manager > employee`.

---

## Q5 — Where the existing brief says flows already deduplicate or remain duplicated

### Already deduplicated / canonical (work landed)

- **Phase CSW** (MASTER_TRACKER L85): the 9-status canonical assignment workflow has shipped; legacy `approve/reject/end/revoke/activate` services rewritten to consume canonical literals; 21 callsites migrated across dashboards, staffing-desk, project-registry, timesheets, reports, workload, person-directory.
- **DM-2.5 publicId** (MASTER_TRACKER L83): 2/10 aggregates (`Skill`, `StaffingRequest`) emit `publicId` in DTOs; transitional `ParsePublicIdOrUuid` pipe accepts either UUID or `pub_…` form. Global interceptor + bootstrap landed 2026-04-18.
- **Phase DS-1-7 codemod** (MASTER_TRACKER L111): 387 transforms (321 `<button>` + 66 `<Link>`) across 145 files migrated to the `<Button>` atom. 35 dynamic-className residuals tracked at `ds-1-7-codemod-residuals.md`. `ds:check` ratchet baseline = 239.
- **Phase DS-1-8** (MASTER_TRACKER L112): 3 surviving `window.confirm()` calls migrated to `ConfirmDialog`; `grep window.confirm frontend/src` returns zero hits.

### Still duplicated (Phase 1 flow-audit must classify KEEP/DEPRECATE/MERGE)

- **D-04 — legacy assignment endpoints coexist with canonical 9** (HARDEN_BRIEF L89, HARDEN_WIRING_MAP §2.7 lines 154-159): `/assignments/:id/{approve,reject,end,revoke}` + `POST /assignments/activate` still ship alongside `{propose,book,onboarding,assign,hold,release,complete,cancel}`. Phase WO-6 cutover is **entirely pending** per MASTER_TRACKER L80. The closing TASK is 0.6 + S-01 in `CLAUDE_CODE_TASKS.md`.
- **D-08 — Person.skillsets[] (legacy) vs PersonSkill[] (canonical)** (HARDEN_BRIEF L93). Live walk D-30/D-46 confirms the Create Employee form **still writes to legacy** despite Person 360 reading from `PersonSkill`. Silent data loss on every hire. Closing TASK 0.16 WRITE-BLOCK-SKILLSETS is the highest-priority Sprint 0 fix.
- **D-10 — Project.tags[] / Project.techStack[] (legacy) vs ProjectTag / ProjectTechnology** (HARDEN_BRIEF L95): same pattern as D-08. Mark string-array columns deprecated, route reads through join, plan removal in DM-6b-1 follow-up.
- **D-11 — StaffingRequest.status (cached) vs DeriveStaffingRequestStatusService (computed)** (HARDEN_BRIEF L96): Phase CSW (g) added the derived service; the DB column still exists as a cache. Drift risk; closing TASK S-13 will pick one as SoT.
- **D-21 — StaffingRequestStatus (5 values) vs ProjectAssignment.status (9 values)** (HARDEN_BRIEF L106): correct architecture (request rollup + per-slot detail), but UI must show both consistently. Closing TASK S-02 (StaffingRequestDetailPage redesign).
- **D-24 — six "in-memory" services that actually use Prisma** (HARDEN_BRIEF L109): `in-memory-staffing-request.service.ts` has 40+ Prisma calls; misleading naming. Closing Phase 20c-03 rename.
- **Multiple workload surfaces**: `/workload`, `/workload/planning`, `/staffing-board`, `/staffing-desk` (route-manifest.ts:146-161). Different primary personas but overlapping intents. Phase 1 flow audit will determine merge candidacy (the user's explicit example was Create Staffing Request vs Create Assignment for "place a person on a project").
- **8 dashboard surfaces**: `/`, `/dashboard/{employee,project-manager,resource-manager,hr,delivery-manager,director,planned-vs-actual}`, `/dashboards/portfolio-radiator` (route-manifest.ts:112-120). Likely consolidation candidate.
- **3 admin metadata surfaces**: `/admin/dictionaries` (line 167) vs `/metadata-admin` (line 173) vs `/admin/settings` (line 174) — each governs a different slice but the line is fuzzy.
- **3 navigation paths**: sidebar (`getVisibleNavigationRoutes`), Cmd+K palette (`CommandPalette.tsx`), breadcrumbs (`Breadcrumb.tsx`) — three independent surfaces for the same goal of "navigate somewhere."
- **`/timesheets` and `/timesheets/approval` redirects** to `/my-time` and `/time-management` per `phase18-route-jtbd-audit.md` lines 40-41 — the redirects are alive in route-manifest (lines 150-151) with `navVisible: false`. Cleanup candidate (DEPRECATE the legacy paths, document sunset).

---

## Phase 0 acceptance status

All five questions answered substantively, no `[BLOCKED]`. Ready to proceed to Phase 1 (flow audit) on user approval.

**Next step:** AskUserQuestion → "Phase 0 looks good — proceed to Phase 1?" → on approval, run Phase 1 with `Explore` subagents per the plan.
