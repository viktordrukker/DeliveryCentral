# DeliveryCentral — Claude Code Task Backlog

**This is the execution document.** Open it in VSCode, hand each task to Claude Code in order. Every task is self-contained: files to read, files to touch, schema deltas, acceptance criteria, paste-ready prompt.

> Companions (read once, reference often):
> - `HARDEN_BRIEF.md` — full context, gap analysis, design decisions, appendices
> - `HARDEN_WIRING_MAP.md` — endpoint inventory, scenarios, six design systems, meta-audit
> - `workforce-ops-benchmark-synthesis.md` — Float/Runn/Kantata patterns

---

## How to use this document

1. **Session start:** open Claude Code in the repo. Paste the [Universal Preamble](#universal-preamble) once.
2. **Pick the next task** in sprint order (Sprint 0 → 1 → 2 → ... → 8). Within a sprint, follow the listed order.
3. **For each task**, paste the task's "Prompt" block. It already includes the universal preamble's expectations.
4. **Stop when the DOD checklist is fully ticked.** Do not move to the next task otherwise.
5. **Update `docs/planning/MASTER_TRACKER.md`** by checking the corresponding box; if no box exists, add one under a new "Phase HARDEN" section.
6. **At sprint end**, verify the [Sprint Demo Checklist](#sprint-demo-checklist) before declaring the sprint done.

> **Rule:** never commit `--no-verify`. Never mock the real DB in integration tests. Never edit a file you haven't read this session. Follow `CLAUDE.md` rules at all times — they take precedence over this doc when they disagree.

---

## Universal Preamble

Paste once at the start of every Claude Code session in VSCode:

```
You are working on the DeliveryCentral repository (NestJS + Prisma + React + Vite + MUI v7 + custom CSS variables).

Read these files BEFORE doing anything else, in this order:
  1. CLAUDE.md (root)
  2. docs/planning/MASTER_TRACKER.md
  3. docs/planning/current-state.md
  4. docs/planning/canonical-staffing-workflow.md
  5. CLAUDE_CODE_TASKS.md (this file) — find your assigned task
  6. HARDEN_BRIEF.md and HARDEN_WIRING_MAP.md — reference as needed

Operating constraints (from CLAUDE.md, summarized):
- Docker-only local runtime; never run npm on host
- Backend types must compile clean: `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit`
- Frontend tests must stay green: `npm --prefix frontend run test`
- All persistent data via Prisma; no new in-memory stores
- All destructive actions through ConfirmDialog; never window.confirm()
- All status colors via var(--color-status-*) tokens; never raw hex
- Use existing primitives (DataTable, StatusBadge, SectionCard, WorkflowStages, PersonSelect, ConfirmDialog, FormModal)
- ≤3 clicks for any core action (UX Law 1)
- No dead-end screens (UX Law 2); filters persist via URL (Law 5); KPIs are clickable drilldowns (Law 9)

Definition of Done for every task:
- [ ] All files needed have been READ in this session before edit
- [ ] tsc --noEmit clean
- [ ] npm run verify:pr green
- [ ] At least 1 unit test for any new logic
- [ ] At least 1 Playwright spec for any user-visible change (or @notTestable annotation)
- [ ] If schema changed: migration generated + classification check passes
- [ ] If new endpoint: @RequireRoles or @Public; Swagger summary + DTOs
- [ ] If new role-protected endpoint: F3.1 RBAC check passes
- [ ] CHANGELOG.md updated with one-line user-visible description
- [ ] MASTER_TRACKER.md tracker entry checked OR added
- [ ] Live stage walkthrough confirms the change

Rollback discipline: every PR description includes a `## Rollback` section naming env flag, reverse migration filename, or feature toggle.

If anything in this preamble conflicts with CLAUDE.md, CLAUDE.md wins.

Now wait for the specific task instruction.
```

---

## Sprint Demo Checklist

A sprint is "done" iff at the end:

1. **Named user role** can perform a **named action** they couldn't perform (or perform well) before — on the live stage `https://deliverit-test.agentic.uz`.
2. **One Playwright spec** under `e2e/tests/` proves the action works happy-path.
3. **CHANGELOG.md** has a one-line description + screenshot path under the sprint heading.
4. **The action is reachable in ≤3 clicks** from the role's dashboard.
5. **All CI ratchets** are passing (or strictly ratcheting down — never up).
6. **`docs/planning/current-state.md`** updated.

If any of these can't be ticked, the sprint isn't shipped.

---

## CI Ratchets to keep green/decreasing

Already in place — keep green:
- `npm run lint`
- `npm run architecture:check` (dependency-cruiser)
- `npm run tokens:check` (raw-color violations)
- `npm run ds:check` (DS conformance)
- `npm run schema:check` (Prisma conventions)
- `npm run migrations:check` (migration classification)
- `npm run enum:check` (enum evolution)
- `npm run publicid:check` (publicId leak)
- `npm run tz:check` (timestamp UTC)
- `npm run jtbd:gate` (JTBD coverage)

New, to be introduced in Sprint 0/1 (baseline first, ratchet down later):
- `npm run api:check` (new — API DS conformance, see HARDEN_WIRING_MAP §11.6)
- `npm run authz:check` (new — Authorization DS, §12.3)
- `npm run consistency:check` (new — invariants, §15.3)
- `npm run no-hardcode:check` (new — Customization DS, §14.4)

Run `npm run verify:pr` before every commit; never bypass with `--no-verify`.

---

# SPRINT 0 — Stabilization + visible polish

**Demoable outcome:** "I can log in cleanly and see correct page titles, breadcrumbs, and dates. Backend is healthy. Newly created people get a HIRED activity event."

**Critical path:** 0.1 (DI fix) → 0.17 (event pipeline) unblocks every later sprint.

**Sprint Demo:** log in as admin, navigate Workload Overview → People → Test E2E Walker → History tab. See HIRED event. Open `/admin/people/new` → title says "New Employee". Date pickers show locale-correct format. Breadcrumb reflects current route only.

---

### TASK 0.1 — Fix `PublicIdBootstrapService` DI failure (CRITICAL — UNBLOCKS EVERYTHING)

**Sprint:** 0 · **Priority:** P0 · **Effort:** 1 session (~2-4h) · **Prerequisites:** none
**Closes:** D-02

**Files to read first:**
- `docs/testing/qa-handoff-2026-04-18.md` §8a (the documented failure)
- `src/common/public-id/public-id.module.ts`
- `src/common/public-id/public-id-bootstrap.service.ts`
- `src/common/public-id/public-id.service.ts`
- `src/app.module.ts` (where modules are wired)

**The problem:**
`PublicIdBootstrapService` cannot resolve `PublicIdService` at `onModuleInit` → backend container is unhealthy → frontend `depends_on: service_healthy` blocks → nothing else works.

**Approach:**
1. Identify the DI registration: is `PublicIdService` in `providers` AND `exports` of `PublicIdModule`?
2. Is `PublicIdModule` decorated `@Global()` so any module can inject without explicit import?
3. If `PublicIdBootstrapService` is in a different module, ensure that module imports `PublicIdModule`.

**Acceptance:**
- [ ] `docker compose up -d backend && sleep 15 && docker compose ps backend` shows `(healthy)`.
- [ ] `curl -s http://localhost:3000/api/readiness` returns `{ "status": "ready" }` HTTP 200.
- [ ] `curl -s http://localhost:3000/api/health/deep` returns 200 with all 12 aggregate probes green.
- [ ] `npm run verify:pr` green.

**Tests:**
- Add or update `test/common/public-id/public-id-bootstrap.service.spec.ts` to inject the module and assert `onModuleInit` doesn't throw.

**DOD checklist:** see Universal Preamble above.

**Rollback:** revert the module wiring change; backend was already broken so revert is safe.

**Prompt:**

```
Sprint 0 task 0.1 from CLAUDE_CODE_TASKS.md.

The PublicIdBootstrapService DI failure documented in docs/testing/qa-handoff-2026-04-18.md §8a needs fixing. Backend currently won't start healthy.

Read those files (in order):
  1. docs/testing/qa-handoff-2026-04-18.md §8a
  2. src/common/public-id/public-id.module.ts
  3. src/common/public-id/public-id-bootstrap.service.ts
  4. src/common/public-id/public-id.service.ts

Identify why DI fails. Likely: PublicIdService not in providers OR not exported OR PublicIdModule not @Global() OR consuming module doesn't import PublicIdModule.

Fix it. Verify:
  docker compose up -d backend && sleep 15 && docker compose ps backend
should show (healthy).

Add a unit test asserting onModuleInit doesn't throw.

Run npm run verify:pr. Update MASTER_TRACKER and current-state docs to clear the open blocker.
Update CHANGELOG.md under "Sprint 0" with: "Fix: backend now starts healthy (PublicIdBootstrapService DI)".
```

---

### TASK 0.2 — Audit & reconcile `prisma/schema.prisma` working-copy drift

**Sprint:** 0 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-03

**Files to read first:**
- `docs/planning/canonical-staffing-workflow.md` (especially the 9-status enum)
- `prisma/schema.prisma`

**The problem:**
A prior session reverted parts of `schema.prisma` (1,120-line diff vs. `origin/main`). The 9-status `AssignmentStatus` was surgically restored, but the rest is unaudited.

**Approach:**
```
git fetch origin main
git diff origin/main -- prisma/schema.prisma > /tmp/schema-drift.diff
```
Walk every hunk. For each:
- If the working-copy is the intended state per CSW + recent migrations: keep, document why.
- If working-copy looks reverted: restore from `origin/main` HEAD.

Compare especially: enum `AssignmentStatus`, `ProjectAssignment` columns (`slaStage`, `slaDueAt`, `requiresDirectorApproval`, `onboardingDate`), proposal-slate models.

**Acceptance:**
- [ ] `git diff origin/main -- prisma/schema.prisma` reviewed line-by-line; reasoning written into `docs/planning/schema-drift-audit-2026-MM-DD.md`.
- [ ] `npm run schema:check` green.
- [ ] `npm run migrations:check` green.
- [ ] `npm run enum:check` green.
- [ ] No new migration is committed without intent.

**Prompt:**

```
Sprint 0 task 0.2 from CLAUDE_CODE_TASKS.md.

Audit the schema.prisma working-copy drift documented in docs/planning/current-state.md (note: 2026-04-18 PM: ~1,120-line diff). Compare against origin/main.

Steps:
  git fetch origin main
  git diff origin/main -- prisma/schema.prisma | tee /tmp/schema-drift.diff

Read the diff hunk-by-hunk against:
  docs/planning/canonical-staffing-workflow.md
  recent migrations under prisma/migrations/

For each hunk: keep (with one-line justification) OR restore from origin/main.

Write findings to docs/planning/schema-drift-audit-YYYY-MM-DD.md (today's date).

Run: npm run schema:check && npm run migrations:check && npm run enum:check

DOD as in Universal Preamble. CHANGELOG: "Fix: schema.prisma reconciled vs main."
```

---

### TASK 0.3 — Run `npm run verify:full` and capture baseline

**Sprint:** 0 · **Priority:** P0 · **Effort:** ½ session · **Prerequisites:** 0.1, 0.2
**Closes:** D-05

```
docker compose exec backend npm run verify:full 2>&1 | tee /tmp/verify-full.log
docker compose exec frontend npm run test 2>&1 | tee /tmp/frontend-test.log
```

**Acceptance:**
- [ ] Capture pass/fail/skip counts in `docs/testing/verify-baseline-YYYY-MM-DD.md`.
- [ ] Identify any `it.skip` calls with TODOs; promote to issue list.
- [ ] No regressions vs. last green CI run.

**Prompt:**

```
Sprint 0 task 0.3. Run npm run verify:full and frontend test suite. Capture the baseline:
  - Total tests run
  - Passing
  - Failing (must be 0 to proceed)
  - Skipped (with grep of `it.skip`/`describe.skip` lines that should become tasks)

Write summary to docs/testing/verify-baseline-YYYY-MM-DD.md.

If anything fails, FIX before proceeding. Do not skip failures.
```

---

### TASK 0.4 — Refresh `CLAUDE.md` IT-Company test accounts

**Sprint:** 0 · **Priority:** P1 · **Effort:** ½ session · **Prerequisites:** 0.1
**Closes:** D-01, D-26, D-75

**The problem:**
- Live admin shows seeded admin email is `admin@delivery.local`, not `admin@deliverycentral.local` per CLAUDE.md.
- CLAUDE.md says "53 models" but `grep -cE "^model [A-Z]" prisma/schema.prisma` returns **87**.

**Approach:** read live `/admin` panel User Accounts table, sync CLAUDE.md §10 IT-Company test accounts table to actual seed values. Update model count claim.

**Acceptance:**
- [ ] CLAUDE.md §10 matches the live admin panel user list 1:1.
- [ ] CLAUDE.md "53 models" replaced with `87` (and a note `// updated YYYY-MM-DD via grep`).
- [ ] Add to `scripts/verify-seed.cjs`: assertion that `admin@delivery.local` exists in the seeded `LocalAccount` table at boot.

---

### TASK 0.5 — Live walk audit (post-DI-fix smoke)

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-22

Walk the live stage as admin. For each route in HARDEN_WIRING_MAP §3, screenshot + check console for errors. Document any new findings in `docs/planning/live-walk-audit-YYYY-MM-DD.md`.

---

### TASK 0.6 — Audit legacy vs canonical staffing endpoints (S-01 step A)

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-04 (start)

**Files to read:**
- `src/modules/assignments/presentation/assignments.controller.ts`
- `frontend/src/lib/api/assignments.ts`
- `docs/planning/canonical-staffing-workflow.md`

For each endpoint in `assignments.controller.ts`, classify:
- `legacy` (approve / reject / end / revoke / activate)
- `canonical` (per the 9 transition endpoints: propose/reject/book/onboarding/assign/hold/release/complete/cancel)

Output: `docs/planning/staffing-endpoint-deprecation-plan.md` with sunset dates per legacy endpoint (T+21 days from start of Sprint 2).

---

### TASK 0.7 — Audit notification events actually wired

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-19

**Files to read:**
- `src/modules/notifications/application/notification-event-translator.service.ts`
- HARDEN_WIRING_MAP §5 (current 28 wired vs 27 missing)
- `src/modules/audit-observability/application/domain-event.service.ts` (outbox emission pattern)

Output: `docs/planning/notification-events-audit-YYYY-MM-DD.md` with wired list, target list (per HARDEN_BRIEF Appendix C), gap delta. Each gap becomes an issue.

---

### TASK 0.10 — FE-FOUND-01: Breadcrumb derives from current route, not session history (USER-VISIBLE)

**Sprint:** 0 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-27, D-74 (dup)

**The problem:**
Breadcrumb appends visited paths instead of reflecting the current route. Example: after navigating Home → People → New Employee → Staffing Desk → Approval Queue → Director Dashboard → Projects, breadcrumb shows all steps including stale ones.

**Files to read first:**
- `frontend/src/components/common/Breadcrumb.tsx`
- `frontend/src/app/router.tsx`
- `frontend/src/app/route-manifest.ts`

**Approach:**
- Replace history-based logic with route-derivation. For each route in `route-manifest.ts`, declare a `breadcrumbAncestors: string[]` (e.g., `/people/:id` ancestors = `['/', '/people']`).
- The `<Breadcrumb>` reads current location → looks up route in manifest → renders ancestors + current.

**Acceptance:**
- [ ] Navigate any path; breadcrumb shows only current route's ancestor chain.
- [ ] No deep-history leak (test: People → click person → SR detail → Approval Queue → check breadcrumb is `Workload Overview > Approval Queue`).
- [ ] Add Playwright spec `e2e/ux-regression/breadcrumb-no-leak.spec.ts`.

**Prompt:**

```
Sprint 0 task 0.10 (FE-FOUND-01). Breadcrumb leak: today the path appends visited segments. Make it derive from the current route only.

Read:
  frontend/src/components/common/Breadcrumb.tsx
  frontend/src/app/router.tsx
  frontend/src/app/route-manifest.ts

Approach:
  - Add breadcrumbAncestors: string[] to each route entry in route-manifest.ts.
  - Rewrite Breadcrumb.tsx to look up the current location's route and render ancestors + current title.
  - Strip any session/history-based logic.

Add Playwright spec: e2e/ux-regression/breadcrumb-no-leak.spec.ts that navigates A → B → C → D and asserts breadcrumb on D shows only D's ancestors, not A or B.

Run npm --prefix frontend run test. CHANGELOG: "Fix: breadcrumbs reflect current route only."
```

---

### TASK 0.11 — FE-FOUND-02: Fix `/admin/people/new` page title + subtitle (USER-VISIBLE)

**Sprint:** 0 · **Priority:** P1 · **Effort:** ½ session · **Prerequisites:** none
**Closes:** D-28

**The problem:**
- Page title says "New Admin" — should say "New Employee" / "Create Employee".
- Subtitle is "Consolidated operator-facing control surface for configuration and platform settings." — copied from a different page.

**Files:** `frontend/src/routes/people/AdminPeopleNewPage.tsx` (or whatever the actual file is — likely under `frontend/src/routes/admin/` or `frontend/src/routes/people/`).

**Approach:** find the page (`grep -r "New Admin" frontend/src/`), fix title + subtitle. Add a snapshot test asserting page title across all pages.

**Acceptance:**
- [ ] Live page shows "Create Employee" title + meaningful subtitle.
- [ ] Add `e2e/ux-regression/page-titles.spec.ts` walking 10 key routes asserting title text.

---

### TASK 0.12 — FE-FOUND-03: Localize date pickers (USER-VISIBLE)

**Sprint:** 0 · **Priority:** P1 · **Effort:** ½ session · **Prerequisites:** none
**Closes:** D-29

**The problem:** date inputs render `ДД.ММ.ГГГГ` (Russian) regardless of user locale.

**Files to read:** `frontend/src/main.tsx` (locale config); any MUI `LocalizationProvider`; date-fns adapter.

**Approach:**
- Add `PlatformSetting locale.default String = "en-US"` (server-side default).
- Frontend reads the user's preference (Account Settings → locale) OR falls back to platform default OR browser locale.
- Wrap MUI `<LocalizationProvider adapterLocale={...}>` at root.

**Acceptance:**
- [ ] Default locale = en-US shows `MM/DD/YYYY` placeholder.
- [ ] Account Settings has a locale dropdown (en-US, en-GB, ru-RU, uz-UZ).
- [ ] Switching locale immediately updates date format across all pickers.

---

### TASK 0.13 — SEED-EXT-01: Seed Clients + StaffingRequests

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-34, D-35

**The problem:** live `it-company` seed has 0 Clients (Project list shows `—`) and 0 open Demand (Staffing Desk shows 0 HC).

**Files:** `prisma/seeds/it-company-dataset.ts` (or current canonical seed).

**Approach:**
- Add 6 Clients: `Acme Corp`, `Globex`, `Initech`, `Umbrella`, `Hooli`, `Massive Dynamic`.
- Assign `clientId` on the 10 ACTIVE projects.
- Add 12 StaffingRequests across the 10 projects: 4 DRAFT, 5 OPEN, 2 IN_REVIEW, 1 FULFILLED. Mix priorities. Mix urgencies (some `startDate` next week, some next month).

**Acceptance:**
- [ ] Re-seed: `docker compose exec -e SEED_PROFILE=it-company backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"`
- [ ] Live `/projects` shows non-empty Client column.
- [ ] Live `/staffing-desk` shows non-zero Open Demand.
- [ ] Live `/staffing-board/demand` (if route exists) ranks them.

---

### TASK 0.14 — SEED-EXT-02: Grade dictionary + `gradeToBandMap`

**Sprint:** 0 · **Priority:** P1 · **Effort:** ½ session · **Prerequisites:** none
**Closes:** D-36, D-41

**The problem:** seed grades are G7-G15 (G7 Junior, G15 Senior). Brief assumed P1-P5. Need explicit mapping.

**Approach:**
- Document the full grade range: query the `MetadataDictionary` for `grade` (or whatever key) → enumerate.
- Seed `compensation.banding.gradeToBandMap` PlatformSetting:
```json
{
  "G7": "P1", "G8": "P1",
  "G9": "P2", "G10": "P2",
  "G11": "P3", "G12": "P3",
  "G13": "P4",
  "G14": "P5", "G15": "P5"
}
```
(Adjust based on actual range.)
- Add `compensation.banding.bands` PlatformSetting with the 5 bands' labels.

**Acceptance:** Admin → Tenant Settings (after Sprint 3 CUST-5) shows the map. Until then, seeded value is correct.

---

### TASK 0.15 — SLA-AUDIT: Verify SLA columns are written

**Sprint:** 0 · **Priority:** P1 · **Effort:** ½ session · **Prerequisites:** 0.1
**Closes:** D-32

**The problem:** Approval Queue shows SLA Stage `—` and Due In `—` for a PROPOSED assignment. Either the SLA service is OFF for the running env or the write path is broken.

**Approach:**
```sql
SELECT id, status, "slaStage", "slaDueAt", "slaBreachedAt"
FROM "ProjectAssignment"
WHERE status IN ('PROPOSED','IN_REVIEW','BOOKED','ONBOARDING')
ORDER BY "createdAt" DESC LIMIT 20;
```

If `slaStage` is null on rows where it should be set:
- Check `flag.assignmentSlaSweepEnabled` PlatformSetting.
- Check `assignment-sla.service.ts` `applyTransition` is called from `transition-project-assignment.service.ts` AND from `proposal-slate.service.ts`.

**Acceptance:** every PROPOSED assignment in DB has non-null `slaStage` and `slaDueAt` after a fresh transition. Approval Queue UI shows the badge.

---

### TASK 0.16 — WRITE-BLOCK-SKILLSETS: Patch Create Employee form to write `PersonSkill`

**Sprint:** 0 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** none
**Closes:** D-30, D-46 (partial)

**The problem:** Create Employee form has "Skillset" checkboxes (Frontend/Backend/Data — broad categories) writing to legacy `Person.skillsets String[]`. Skills tab uses 25 specific skills (React/Java/AWS) writing to `PersonSkill`. **Result: silent data loss when HR ticks Frontend → Skills tab shows "No skills recorded."**

**Approach:**
- Replace the checkbox grid with the modern skill multi-picker (use the same component as the Skills tab Edit Skills dropdown — see `frontend/src/lib/api/skills.ts` for catalog).
- POST → `PersonSkill` rows for each picked skill (proficiency default 3, certified false).
- Stop writing to `Person.skillsets`.
- Mark `Person.skillsets` as deprecated in TS type comment.

**Acceptance:**
- [ ] Live: Create employee → pick "React" skill → save → Person 360 → Skills tab shows React (proficiency 3, not certified).
- [ ] DB: `SELECT * FROM person_skills WHERE personId = <new>` returns 1 row.
- [ ] DB: `Person.skillsets` for the new person is `[]` (empty).
- [ ] Add Playwright spec.

**Prompt:**

```
Sprint 0 task 0.16. Create Employee form silently drops skills (D-46): the form writes to legacy Person.skillsets[] but Skills tab reads from PersonSkill table. Fix by routing form writes to PersonSkill.

Read:
  frontend/src/routes/people/AdminPeopleNewPage.tsx (or wherever the form lives)
  frontend/src/components/people/* for skill picker patterns
  frontend/src/lib/api/skills.ts
  src/modules/skills/application/person-skill.service.ts

Approach:
  - Replace the broad-category Skillset checkbox grid with the same skill multi-picker the Person 360 → Skills → Edit Skills tab uses.
  - On submit: POST PersonSkill rows for each picked skill (proficiency 3 default, certified false).
  - Do NOT write to Person.skillsets[].
  - Add a TS @deprecated marker on Person.skillsets reads.

Test:
  - Playwright: e2e/tests/06-hr-people.spec.ts → extend with "creates employee with skills, sees them in Skills tab".
  - Verify DB: person_skills has rows; Person.skillsets is empty for the new person.

CHANGELOG: "Fix: Create Employee form now writes to PersonSkill (was silently dropping skills)."
```

---

### TASK 0.17 — EVENT-PIPE-AUDIT: Restore the create+activate event/audit/notification pipeline (CRITICAL)

**Sprint:** 0 · **Priority:** P0 · **Effort:** 1-2 sessions · **Prerequisites:** 0.1
**Closes:** D-47, D-59, D-63, D-70 (root cause)

**The problem (verified live):**
- Create employee → Person 360 History tab shows "No activity. No audit events recorded yet."
- Create + activate project → Project Lifecycle tab shows "No lifecycle events recorded yet" + "No audit events recorded yet."
- Notification bell shows "No notifications" after creating a person AND a project.

→ The entire event emission pipeline (`OutboxEvent` write → `AuditLog` row → `EmployeeActivityEvent` row → `NotificationEventTranslator` → `InAppNotification`) is silent for create/activate.

**Files to read:**
- `src/modules/organization/application/create-employee.service.ts`
- `src/modules/project-registry/application/create-project.service.ts`
- `src/modules/project-registry/application/activate-project.service.ts`
- `src/modules/audit-observability/application/domain-event.service.ts`
- `src/modules/notifications/application/notification-event-translator.service.ts`
- `src/modules/organization/application/employee-activity.service.ts`

**Approach:**

1. **Diagnose** — for each create/activate service, trace the call. Check:
   - Does it accept `tx: Prisma.TransactionClient`?
   - Does it call `auditLog.append(tx, ...)`?
   - Does it call `outbox.append(tx, ...)`?
   - Does it call `employeeActivityService.emit(tx, ...)`? (people only)
   - Does the publisher loop run? (`grep -r "OnApplicationBootstrap\|@Cron" src/modules/audit-observability`)

2. **Fix** — wire the missing calls. Pattern from §3.1 of HARDEN_BRIEF:
```ts
return this.prisma.$transaction(async (tx) => {
  // ... create/activate logic ...
  await this.auditLog.append(tx, { actorId, action, resourceType, resourceId, before, after });
  await this.outbox.append(tx, { topic, eventName, aggregateType, aggregateId, payload });
  if (entityType === 'PERSON') {
    await this.activityEvents.emit(tx, { personId, eventType: 'HIRED', actorId, summary, relatedEntityId });
  }
});
```

3. **Verify the publisher exists or build it.** If `OutboxEventPublisherService` doesn't exist:
   - Create it under `src/modules/audit-observability/application/`.
   - `@Cron('*/5 * * * * *')` (every 5 sec) — picks `OutboxEvent` rows where `status='PENDING' AND availableAt <= now()`, calls translator, sets status `SENT`/`FAILED` with attempt count.

**Acceptance:**
- [ ] Live: Create employee → Person 360 History tab shows HIRED entry within 30 seconds.
- [ ] Live: Create project → Project Lifecycle shows CREATED entry.
- [ ] Live: Activate project → adds ACTIVATED entry.
- [ ] Notification bell shows the new-employee event for the assigned RM (after Sprint 1 P-03 wires recipient).
- [ ] Add `test/e2e/event-pipeline-smoke.spec.ts` exercising create + assert AuditLog/OutboxEvent rows + 3-second wait + InAppNotification row exists.

**Prompt:**

```
Sprint 0 task 0.17 (CRITICAL). The event/audit/notification pipeline is silently broken for create+activate flows. Verified live: created an employee and project, no AuditLog rows, no EmployeeActivityEvent rows, no InAppNotification rows, History tabs say "No activity". Phase 19-02 marked done in tracker but is broken in production.

Read these files in order:
  src/modules/organization/application/create-employee.service.ts
  src/modules/project-registry/application/create-project.service.ts
  src/modules/project-registry/application/activate-project.service.ts
  src/modules/audit-observability/application/domain-event.service.ts
  src/modules/audit-observability/application/audit-log.service.ts
  src/modules/notifications/application/notification-event-translator.service.ts
  src/modules/organization/application/employee-activity.service.ts

Diagnose: for each service, do the create/activate paths actually call auditLog.append, outbox.append, employeeActivityService.emit?

Fix: wire them inside the same Prisma transaction. Use the pattern from HARDEN_BRIEF §3.1.

Also verify OutboxEventPublisherService exists. If not, build one:
  - Cron @Interval(5000)
  - Find OutboxEvent rows status='PENDING' AND availableAt <= now()
  - Call NotificationEventTranslator method named after eventName
  - Update OutboxEvent.status to SENT/FAILED with attempts count

Tests:
  - Unit: each create service spec asserts auditLog/outbox/activity calls.
  - Integration test/e2e/event-pipeline-smoke.spec.ts: create employee, wait 5s, assert AuditLog + EmployeeActivityEvent + OutboxEvent rows.

Live verification:
  Create employee via /admin/people/new (after task 0.16 lands) → verify Person 360 History tab populates.
  Create project + activate → verify Project Lifecycle tab populates.

CHANGELOG: "Fix: lifecycle events now record on create and activate (HIRED, PROJECT_CREATED, PROJECT_ACTIVATED)."

This unblocks all subsequent sprints' notification work. P0.
```

---

### TASK 0.18 — KPI-VS-PULSE-RECONCILE: Project KPI strip and Pulse panel agree

**Sprint:** 0 · **Priority:** P0 · **Effort:** ½ session · **Prerequisites:** 0.1
**Closes:** D-54

**The problem (verified live):** ProjectDashboardPage shows KPI strip "Overall RAG: GREEN" while Project Pulse panel says "25/100 Red" — same data, two contradictory verdicts.

**Files:** `frontend/src/routes/projects/ProjectDashboardPage.tsx` + the underlying hook (`useProjectDashboard.ts`?).

**Approach:** decide the single source of truth (recommend: Project Radiator overall). Update KPI strip to derive from same data as Pulse panel.

**Acceptance:** KPI and Pulse always show the same RAG verdict. Add a snapshot/integration test.

---

### TASK 0.19 — RADIATOR-COLD-START: Radiator returns null for projects without data

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** 0.1
**Closes:** D-55, D-56

**The problem (verified live):** brand-new DRAFT project with no team, no budget, no milestones scored 34/100 (Red) on the radiator. Cold-start pollution.

**Files:** `src/modules/project-registry/application/project-radiator.service.ts`, `radiator-scorers.ts`.

**Approach:** for each axis, define minimum-data requirements; if not met, return `{ score: null, reason: 'INSUFFICIENT_DATA' }`. UI shows `—` instead of a fake score. Health column on `/projects` likewise.

**Acceptance:** brand-new project shows `—` on health column and "Not enough data yet" per axis on the radiator chart.

---

### TASK 0.20 — PERSON360-STATUS: Fix status display for ACTIVE persons

**Sprint:** 0 · **Priority:** P0 · **Effort:** ½ session · **Prerequisites:** 0.1
**Closes:** D-45, D-49

**The problem (verified live):** newly created ACTIVE employee shows "Inactive" status + "Already inactive" CTA on Person 360. DB row IS active (filter by Inactive returns 0). Person 360 mis-derives status.

**Files:** `frontend/src/routes/people/EmployeeDetailsPlaceholderPage.tsx` + the header hook (`usePersonHeader.ts` or equivalent).

**Approach:** find the status-derivation logic; likely it's reading `terminatedAt` presence or some derived flag instead of `Person.employmentStatus`. Fix to read employmentStatus directly.

**Acceptance:** newly created person shows "Active" badge + "Deactivate / Terminate" CTAs (not "Already inactive").

---

### TASK 0.21 — POST-CREATE-REDIRECT: Redirect to new entity after Create

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** none
**Closes:** D-50

**The problem:** Create Project succeeds → form resets, no redirect, no "View Project" CTA. UX Law 3 violation.

**Files:** `frontend/src/routes/projects/CreateProjectPage.tsx` + `frontend/src/routes/people/AdminPeopleNewPage.tsx` + any other Create form.

**Approach:** on success, redirect to `/projects/:id` (or `/people/:id`). Optionally show a sticky banner with `[View project] [Create another]`.

**Acceptance:** Create succeeds → user lands on the new entity's detail page.

---

### TASK 0.22 — PRIORITY-ROUNDTRIP-TEST: Fix silent priority HIGH→MEDIUM drop

**Sprint:** 0 · **Priority:** P0 · **Effort:** ½ session · **Prerequisites:** 0.1
**Closes:** D-53

**The problem:** Create Project Step 2 set Priority HIGH, saved as MEDIUM. Form payload mismatch.

**Approach:** add a payload-roundtrip test (`Cypress`/`Playwright`): set every priority, save, verify DB row matches. Fix the form/DTO mismatch revealed.

**Acceptance:** roundtrip test passes for all 4 priority values.

---

### TASK 0.23 — CMD+K-PEOPLE: Wire People into the cmdk palette

**Sprint:** 0 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** none
**Closes:** D-68, D-69

**Files:** `frontend/src/components/common/CommandPalette.tsx`.

**Approach:** add a "People" section that calls `GET /org/people?q=<term>&limit=10` (debounced 200ms). Replace the pass-through filter with cmdk's native fuzzy filter for the static page list (so `acme` shows only Acme-matching projects).

**Acceptance:** typing "walker" shows Test E2E Walker (after task 0.16 created them with skills properly). Typing "acme" filters projects to Acme Portal only.

---

### TASK 0.24 — GLOBAL-KEYMAP-AUDIT: `?` opens cheatsheet, Escape closes overlays

**Sprint:** 0 · **Priority:** P2 · **Effort:** ½ session · **Prerequisites:** none
**Closes:** D-71

Audit `frontend/src/app/keyboard-shortcuts.tsx`. Ensure `?` is bound at document level (with input-focused guard). Ensure Escape closes any open Notification dropdown / Popover / MenuPopover / Modal.

---

### TASK 0.25 — PROJECT-CODE-CONVENTION: One ProjectCodeGenerator

**Sprint:** 0 · **Priority:** P2 · **Effort:** ½ session · **Prerequisites:** 0.1
**Closes:** D-52

Live shows seed projects use `IT-PROJ-001..020` while UI-created project got `PRJ-F9CF0C18`. Decide: sequential `IT-PROJ-NNN` for everything. Implement single `ProjectCodeGenerator` consumed by both seed and `CreateProjectService`.

---

### TASK 0.26 — SUBTITLE-SOURCE: Per-route subtitles or none

**Sprint:** 0 · **Priority:** P2 · **Effort:** ½ session · **Prerequisites:** none
**Closes:** D-28, D-51, D-60, D-67

Audit `useTitleBarActions` or wherever the subtitle is set. Per-route subtitle in route-manifest.ts (optional). When a route has no subtitle, render none — don't inherit.

---

### TASK 0.27 — SESSION-TTL: Document and tune session timeouts

**Sprint:** 0 · **Priority:** P2 · **Effort:** ½ session · **Prerequisites:** none
**Closes:** D-39

Verify JWT access token TTL + refresh policy. Recommend: access 30 min, refresh 8h, idle-extend on user activity. Add PlatformSettings:
- `auth.session.idleTimeoutMinutes Int = 30`
- `auth.session.absoluteTimeoutHours Int = 8`

Document in `docs/security/sessions.md`.

---

### TASK 0.28 — FILTER-URL-AUDIT: All Phase 20g filter params round-trip

**Sprint:** 0 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** none
**Closes:** D-48

Phase 20g items checked off but `?q=walker` doesn't populate the People search input. Walk every list page; assert URL params for q/status/dateRange/etc. all round-trip. Fix `useFilterParams` (or equivalent) gaps.

---

### Sprint 0 — DS plumbing (parallel with the above)

These items establish the **CI ratchet baselines** for the six design systems but **do not enforce yet**. They run in parallel with the user-visible tasks above.

- **DS-PLUMB-1**: Author skeleton docs (one each, ≤2 pages):
  - `docs/architecture/api-design-system.md`
  - `docs/architecture/authorization-design-system.md`
  - `docs/architecture/data-design-system.md`
  - `docs/architecture/customization-system.md`
  - `docs/architecture/data-consistency.md`
  - `docs/architecture/visual-design-system.md` (already exists; verify)

- **DS-PLUMB-2**: Build CI scripts (skeletons that always pass — promoted to ratchet in Sprint 1):
  - `scripts/check-api-conformance.cjs` + `scripts/api-conformance-baseline.json`
  - `scripts/check-authorization-conformance.cjs` + baseline
  - `scripts/check-no-hardcode.cjs` + baseline
  - `scripts/check-invariants.cjs` + baseline

- **DS-PLUMB-3**: Add to `package.json` scripts: `api:check`, `authz:check`, `no-hardcode:check`, `consistency:check`, `*:baseline` (for each).

---

# SPRINT 1 — "HR can hire properly"

**Demoable outcome:** HR opens `/people/add` → 3-step wizard with M365 prefill → save → Person 360 with Active status, History entry, RM auto-assigned, RM gets in-app notification.

---

### TASK P-01 — Person schema delta: employmentType, contract dates, photoUrl, resourceManagerId

**Sprint:** 1 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** 0.1, 0.2, 0.17
**Closes:** D-13, D-14, D-15, G3, G5, G6 (HARDEN_BRIEF §4.3)

**Schema delta:**
```prisma
enum EmploymentType {
  FTE
  CONTRACTOR
  INTERN
  VENDOR
}

model Person {
  // ... existing ...
  employmentType        EmploymentType?  @default(FTE)
  contractStartsOn      DateTime?        @db.Date
  contractEndsOn        DateTime?        @db.Date
  photoUrl              String?
  resourceManagerId     String?          @db.Uuid
  resourceManager       Person?          @relation("PersonResourceManager", fields: [resourceManagerId], references: [id])
  resourceManagedPeople Person[]         @relation("PersonResourceManager")
}
```

**Migration:** `expand` (additive, all nullable).

**Service:** extend `CreateEmployeeService.execute` with new fields + RM derivation rule (default = primary pool's `ownerPersonId`; null otherwise; reject self-assignment; reject `contractEndsOn < contractStartsOn`).

**DTO:** extend `CreateEmployeeRequestDto`, `PersonDirectoryItemDto`, `PersonDetailDto`.

**Acceptance:** see HARDEN_BRIEF §4.3 P-01.

**Prompt:**

```
Sprint 1 task P-01 from CLAUDE_CODE_TASKS.md and HARDEN_BRIEF §4.3.

Add to Person:
- employmentType: enum EmploymentType (FTE/CONTRACTOR/INTERN/VENDOR), default FTE
- contractStartsOn: Date?
- contractEndsOn: Date?
- photoUrl: String?
- resourceManagerId: String? @db.Uuid (self-relation "PersonResourceManager")

Schema delta exactly as in CLAUDE_CODE_TASKS.md or HARDEN_BRIEF §4.3 P-01.

Generate migration:
  docker compose exec backend npx prisma migrate dev --name p01_person_employment_contract_rm

Update:
  src/modules/organization/domain/entities/person.entity.ts
  src/modules/organization/application/create-employee.service.ts
  CreateEmployeeRequestDto, PersonDirectoryItemDto, PersonDetailDto

RM derivation rule: default = primary PersonResourcePoolMembership.pool.ownerPersonId; null otherwise.

Validation:
  - Reject if resourceManagerId === target.id (self-assignment)
  - Reject if contractEndsOn < contractStartsOn
  - Reject if employmentType is FTE and contractEndsOn is set (with warning, not block)

Tests:
  - test/organization/application/create-employee.service.spec.ts: 3 edge cases
  - Update fixtures everywhere PersonDirectoryRecord/PersonDetail types are used (CLAUDE.md pitfall #3)

Run: npm run verify:pr

CHANGELOG: "Add: employment type, contract dates, photo URL, resource manager on Person."
```

---

### TASK P-02 — "Add Employee" 3-step wizard with M365 prefill (HEADLINE)

**Sprint:** 1 · **Priority:** P0 · **Effort:** 2-3 sessions · **Prerequisites:** P-01
**Closes:** D-1 (legacy form), D-31, D-64, G1, G2

**See HARDEN_BRIEF §4.3 P-02 for full spec. Summary:**

3 steps, each ≤1 click to advance:
1. **Identify** — single search input → calls `GET /integrations/m365/lookup?q=` → up to 5 suggestions or "Skip — manual entry".
2. **Confirm core** — pre-filled card (name, email, displayName, photo, manager, employmentType, location, timezone). Edit as needed.
3. **Assign & finish** — Resource Manager (default per P-01 rule), Resource Pool, Grade, Contract end date (only if CONTRACTOR), Skills (Skill catalog Combobox), Starting cost rate (optional). Submit → Person + ResourcePoolMembership + ReportingLine + initial PersonSkill rows + initial PersonCostRate (if rate provided) + onboarding case (auto via 20b-08) + emits `employee.hired` (after 0.17) + RM gets in-app notification (after P-03).

**Acceptance:**
- [ ] 3 keystrokes → top suggestion → Enter → 2 clicks → Save = ≤5 interactions, ≤7 seconds.
- [ ] Playwright `e2e/tests/06-hr-people.spec.ts` extended with wizard happy path.
- [ ] Legacy `/admin/people/new` continues to work behind `?legacy=true` for one release.

**Files:**
- New: `frontend/src/routes/people/AddEmployeeWizardPage.tsx`
- New: `frontend/src/components/people/M365LookupStep.tsx`
- New: `frontend/src/components/people/ConfirmCoreStep.tsx`
- New: `frontend/src/components/people/AssignFinishStep.tsx`
- New: `frontend/src/lib/api/integrations-m365.ts` (extend)
- New: `src/modules/integrations/m365/presentation/m365-lookup.controller.ts`
- New: `src/modules/integrations/m365/application/lookup-m365-user.service.ts`

**Prompt:** (use the §12.3 prompt from HARDEN_BRIEF, paste in full).

---

### TASK P-03 — Notify Resource Manager on hire + assignment changes

**Sprint:** 1 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** P-01, 0.17
**Closes:** D-4, G4

**See HARDEN_BRIEF §4.3 P-03 for full spec. Summary:**

Add `assignmentTranslator.employeeHired(payload)` method (today's translator missing per HARDEN_WIRING_MAP §5):
```ts
public async employeeHired(payload: {
  personId: string;
  hiredAt: Date;
  hiredById: string;
  resourceManagerId?: string;
}): Promise<void> {
  await this.sendEmail('employee.hired', 'employee-hired-email', payload);
  if (payload.resourceManagerId) {
    this.createInAppNotification(
      payload.resourceManagerId,
      'employee.hired',
      `${payload.personName} has joined your pool`,
      undefined,
      `/people/${payload.personId}`,
    );
  }
  // Also notify HR
  for (const hrId of await this.lookupHrManagerIds(payload)) {
    this.createInAppNotification(hrId, 'employee.hired', ...);
  }
}
```

Wire in `CreateEmployeeService` (after 0.17 made the pipeline functional).

Add seeded email template `employee-hired-email` via the existing pattern.

**Acceptance:** Live: hire a person → assigned RM gets a bell badge increment within 30s. Email queue (`GET /api/notifications/queue`) shows the email.

---

### TASK F1.1-1.4 — Foundations: Transactions + IdempotencyKey middleware (DS PLUMBING)

**Sprint:** 1 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** 0.1, 0.17

See HARDEN_BRIEF §3.1 F1.

**Acceptance:**
- [ ] Every public mutation endpoint accepts `Idempotency-Key` header.
- [ ] Re-receiving the same key returns the cached response.
- [ ] At least 3 services wrap multi-step ops in `prisma.$transaction`.

---

### TASK F2.1-2.4 — Foundations: Outbox publisher + event catalog (DS PLUMBING)

**Sprint:** 1 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** 0.17

See HARDEN_BRIEF §3.2.

If 0.17 already created `OutboxEventPublisherService`, this task adds:
- `attempts` and `lastError` columns on `OutboxEvent`
- exponential backoff with `availableAt = now() + retryDelay`
- metrics: `outbox_pending_count`, `outbox_published_total`, `outbox_failed_total`
- `docs/architecture/event-catalog.md` enumerating every event with payload schema (per HARDEN_BRIEF Appendix C)

---

### TASK RBAC-1 — Author role-catalog.ts + action-catalog.ts; mass-replace role literals (begin)

**Sprint:** 1 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** none
**Closes:** D-NEW (no specific D-item; closes 1041 string literal liability per WIRING_MAP §12)

**Files to create:**
- `src/shared/auth/role-catalog.ts` (per WIRING_MAP §12.2 A)
- `src/shared/auth/action-catalog.ts` (per WIRING_MAP §12.2 B)

**Approach:**
- Author the catalogs.
- ESLint-style codemod to replace `'admin'` etc. with `ROLES.ADMIN` in `src/modules/`. Tool: `jscodeshift` or simple sed if patterns are clean.
- Don't migrate everything in one PR; baseline `check-authorization-conformance.cjs` `no-role-string-literal` rule at 1,041 → ratchet down each subsequent sprint.

**Acceptance:**
- [ ] Catalogs exist with ROLES constants + ROLE_GROUPS + ACTIONS.
- [ ] At least 100 of 1,041 violations migrated this sprint (baseline 1041 → 941).
- [ ] CI script `authz:check` baseline written.

---

### TASK RBAC-2 — `@RequireAction` decorator + ResponsibilityMatrix scaffold

**Sprint:** 1 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** RBAC-1, S-05 (sprint 6 — but scaffolds default behavior here)

See WIRING_MAP §12.2 C.

**Note:** S-05 (full ResponsibilityMatrix + admin UI) ships in Sprint 6. In Sprint 1, ship the **scaffold**: `@RequireAction(action)` reads default roles from `action-catalog.ts` only. ResponsibilityMatrix DB-backed override is a no-op until Sprint 6 lands.

This avoids the dependency cycle MA-13.

---

### TASK DDS-1 — Author data-design-system.md (DS PLUMBING)

**Sprint:** 1 · **Priority:** P2 · **Effort:** ½ session · **Prerequisites:** none

See WIRING_MAP §13.

---

### TASK CUST-1 — Author customization-system.md (DS PLUMBING)

**Sprint:** 1 · **Priority:** P2 · **Effort:** ½ session · **Prerequisites:** none

See WIRING_MAP §14.

---

### TASK ADS-1..5 — API Design System foundations

**Sprint:** 1 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** none

See WIRING_MAP §11.7.

- ADS-1: `docs/architecture/api-design-system.md`
- ADS-2: `scripts/check-api-conformance.cjs` + baseline
- ADS-3: `api:check` in `verify:pr`
- ADS-4: `IdempotencyKey` middleware (covered by F1.3)
- ADS-5: Global `HttpExceptionFilter` emitting standard error envelope

**Note** (per meta-audit MA-09 / D-76): **DO NOT introduce `/api/v1/` URL prefix this sprint.** That's a breaking change for 319 endpoints. Use `Api-Version` header instead. Defer URL versioning until v2 is genuinely needed.

---

### TASK CONS-1, 7, 8 — Consistency DS skeleton

**Sprint:** 1 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** F1, F2

See WIRING_MAP §15.4.

- CONS-1: `docs/architecture/data-consistency.md` with full INV register (per §15.1)
- CONS-7: outbox publisher reliability (covered by F2 + 0.17)
- CONS-8: idempotency middleware (covered by F1.3)

---

# SPRINT 2 — "PM has a real Approval Queue + StaffingRequest detail"

**Demoable outcome:** PM opens dashboard → sees "Pending Proposals" tile → clicks → Approval Queue with SLA badges → opens an SR → new redesigned StaffingRequestDetailPage shows stage strip + per-slot pipeline → can act in 1 click. Plus: legacy staffing endpoints deprecated.

---

### TASK S-01 (steps B-D) — Deprecate legacy staffing endpoints

**Sprint:** 2 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** 0.6
**Closes:** D-04 (continued)

See HARDEN_BRIEF §5.3 S-01.

**Approach:**
- Add `Deprecation: true; Sunset: <date>` headers via `LegacyEndpointInterceptor`.
- Log warning + emit `assignment_legacy_endpoint_call_total{route}` metric per call.
- Update Swagger description with `@deprecated`.
- Migrate FE call sites from legacy endpoints to canonical.
- Add baseline ratchet `scripts/check-no-legacy-staffing-api.cjs`.

**Acceptance:** zero non-test FE calls to legacy endpoints in Playwright runs. Baseline written.

---

### TASK 20c-15 — Split god dashboard pages

**Sprint:** 2 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** none

`ProjectManagerDashboardPage` (441 lines), `DirectorDashboardPage` (356), `HrDashboardPage` (400+) → split into per-tab components.

Required prerequisite for S-03 (we need room to mount new tiles + embedded queue).

---

### TASK S-02 — StaffingRequestDetailPage redesign (HEADLINE)

**Sprint:** 2 · **Priority:** P0 · **Effort:** 2-3 sessions · **Prerequisites:** S-01, 20c-15
**Closes:** G16, WO-4.12

See HARDEN_BRIEF §5.3 S-02 for full spec.

Key elements:
- Title bar with derivedStatus + primary CTA (via `useTitleBarActions`).
- Compact `<WorkflowStages>` strip (5 request statuses) + subtitle showing slot detail.
- **Slot pipeline panel** — per-slot card with candidate, status, SLA stage + due, "Act" button.
- Request details, cases, history all collapsible SectionCards.

**Acceptance:** PM can resolve a 5-slot SR through `/staffing-requests/:id` without losing context.

---

### TASK S-03 — RM/PM/DM/Director dashboard tiles (HEADLINE)

**Sprint:** 2 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** 20c-15, S-02
**Closes:** G17, G18, WO-4.14, WO-4.15

See HARDEN_BRIEF §5.3 S-03.

Tiles per dashboard:
- RM/PM/DM: "Pending Proposals" count + sparkline → click to `/assignments/queue?scope=team`.
- Director: "Director Approvals Waiting" + "24h SLA Breaches" + "Time-to-fill" sparkline.

Embedded approval queue panel (RM/PM/DM): `<DataView>` with action-table grammar; max 8 rows; "View all" → full queue.

---

### TASK S-13 — Resolve StaffingRequest status duality

**Sprint:** 2 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** S-01
**Closes:** D-11, G30

See HARDEN_BRIEF §5.3 S-13.

Decision: keep DB column as write-through cache. `DeriveStaffingRequestStatusService` is the only writer; called inside the same transaction as per-slot transitions.

Add `BackgroundReconcileService` (CONS-3) with the staffing-drift reconciler.

---

### TASK ADS-6, 9, 13 — API DS Pagination + Migrate Staffing endpoints + Deprecation interceptor

**Sprint:** 2 · **Priority:** P2 · **Effort:** 2 sessions · **Prerequisites:** ADS-1..5

- ADS-6: `PaginationParamsDto` + `PaginatedResponseDto<T>` generic. Roll out to top-10 list endpoints (people, projects, assignments, staffing-requests, cases, exceptions, ...).
- ADS-9: Migrate Staffing endpoints to standard envelope (alongside S-01).
- ADS-13: `LegacyEndpointInterceptor` (covered by S-01).

---

### TASK CONS-3 — `BackgroundReconcileService` + INV-A7 reconciler

**Sprint:** 2 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** F2

See WIRING_MAP §15.4.

Framework + first reconciler (INV-A7: StaffingRequest cache vs derived).

---

# SPRINT 3 — "Managers see team health, HR sees expirations"

**Demoable outcome:** RM/PM/DM/Director dashboards gain Pulse Trend cards (8-week mood per report); HR receives "X people: contract expiring in 14 days" alerts; Admin → Tenant Settings → Catalog page lets HR change thresholds without deploy.

---

### TASK P-05 — Contract-expiring + SPC-stale sweeps (HEADLINE)

**Sprint:** 3 · **Priority:** P0 · **Effort:** 1-2 sessions · **Prerequisites:** P-01, F2
**Closes:** G5, G8

See HARDEN_BRIEF §4.3 P-05.

Daily 06:00 sweep emits `person.contractExpiring` + `person.costRateStale` events. Recipients per `notifications.routing.people.lifecycle.roles`.

PlatformSettings:
- `people.contract.expiryWarningDays Int[] = [30, 14, 7]`
- `people.costRate.staleAfterMonths Int = 12`
- `flag.contractExpirySweepEnabled Bool = true`
- `flag.costRateStaleSweepEnabled Bool = true`

**Acceptance:** planted person with contract 7 days out fires alert; idempotency holds.

---

### TASK P-06 — Pulse rollup + manager declining-trend alert (HEADLINE)

**Sprint:** 3 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** F2, RBAC-4
**Closes:** G7

See HARDEN_BRIEF §4.3 P-06 (audience updated per J7: RM + PM + Director + HR).

Endpoints:
- `GET /api/pulse/team-summary?managerId=&weeks=8`
- `GET /api/pulse/org-summary?orgUnitId=&weeks=8`

Sweep weekly: 3 consecutive declining + latest ≤2 → emit `pulse.declineDetected`. Cooldown 4 weeks per person.

FE: `PulseTrendCard` on RM/PM/DM/Director/HR dashboards.

**Acceptance per J7:** scope test — RM only sees their pool's pulse; PM only their project's people's pulse; HR sees aggregate; Director sees portfolio.

---

### TASK CUST-5 — Tenant Settings → Catalog admin page (HEADLINE)

**Sprint:** 3 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** none
**Closes:** D-17, F7.1

See WIRING_MAP §14.5.

New admin route `/admin/tenant-settings`:
- Lists every `PlatformSetting` key with description, default, current value, last-edited-by, last-edited-at.
- Inline edit. Audit log on save.
- Search/filter by key prefix.

Driven by `PlatformSettingsService.DEFAULTS` map.

---

### TASK CUST-6 — Custom fields on Person + Project Edit forms

**Sprint:** 3 · **Priority:** P2 · **Effort:** 2 sessions · **Prerequisites:** none

See WIRING_MAP §14.5 + HARDEN_BRIEF §3.7 F7.2.

When tenant adds a `CustomFieldDefinition` (e.g., "Internal cost center" on Person):
- Field appears under "Custom" section on Edit form.
- Optional column on directory list (toggleable via Columns menu).
- Exportable + queryable in Report Builder.

---

### TASK RBAC-3 — `@RequireApprovals` decorator (foundation for P-07 dual-approval)

**Sprint:** 3 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** RBAC-2

Per WIRING_MAP §12.2 C. Multi-actor approval gate. Requires `Approval` row from at least N different actors with required role.

Used by P-07 (sprint 7) for the RM-initiated, HR + Director-approved release flow.

---

### TASK RBAC-4 — `PersonScopeService.canActorSee` central + retrofit list endpoints

**Sprint:** 3 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** RBAC-1

Per WIRING_MAP §12.2 D. Eight scope kinds (OWN/LINE/POOL/PROJECT_PM/PROJECT_DM/PROGRAM/ORG_UNIT/ALL).

Retrofit at minimum: `/people` directory, `/assignments` list, `/cases` list, `/projects` list. Each list endpoint pre-filters via the scope service.

---

### TASK CONS-9 — Saga / orchestrator pattern doc + P-07 reference impl skeleton

**Sprint:** 3 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** F2

Per WIRING_MAP §15.4.

Author `docs/architecture/saga-pattern.md`. Skeleton P-07 orchestrator (full impl in Sprint 7).

---

# SPRINT 4 — "Project governance is real"

**Demoable outcome:** PM creates project → submits for Director approval → Director approves on dashboard → ACTIVE. ProjectDashboardPage shows full Project Health KPI strip with 8 tiles. From PvA, PM approves work hours in 2 clicks. Cold-start radiator returns "Insufficient data" instead of fake red.

---

### TASK PM-01 — Director-approval gate on project activation (HEADLINE)

**Sprint:** 4 · **Priority:** P0 · **Effort:** 2-3 sessions · **Prerequisites:** RBAC-2, F2
**Closes:** D-12, D-62, G31

See HARDEN_BRIEF §6.3 PM-01 (with budget-change extension per J6).

Schema delta:
- `ProjectStatus` adds `PENDING_APPROVAL` (DM-4 enum-evolution playbook)
- new model `ProjectActivationApproval`

State machine:
- `DRAFT → PENDING_APPROVAL` (PM/Admin)
- `PENDING_APPROVAL → ACTIVE` (Director, OR PM_SOLO mode if Sprint 6 ResponsibilityMatrix says so — for now, hardcoded fallback)
- `PENDING_APPROVAL → DRAFT` (Director rejects with reason)

Endpoints:
- `POST /projects/:id/submit-for-approval`
- `POST /projects/:id/approve`
- `POST /projects/:id/reject`

**Budget-change extension (J6):** any `PUT /projects/:id/budget` that changes `capexBudget`/`opexBudget`/`vendorBudget` creates a `BudgetApproval(PENDING)`. Original value stays effective until approval.

**Note (per MA-13):** in Sprint 4 the resolver is a hardcoded fallback (Director); in Sprint 6 it consumes the full `ResponsibilityMatrix` (S-05).

---

### TASK PM-02 — Project Health KPI strip (HEADLINE)

**Sprint:** 4 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** 0.18, 0.19
**Closes:** G33, G34, G35

See HARDEN_BRIEF §6.3 PM-02.

8 clickable tiles on `ProjectDashboardPage`: Schedule (variance days), Budget ($ over/under EAC vs BAC), Scope (open CRs), People (over-allocated count), Risks (critical open), Time (timesheet submission %), Vendor (SLA breach count), Radiator (overall score).

Each tile click → relevant tab with appropriate filter.

---

### TASK PM-04 — Approve work-hours from project detail (HEADLINE)

**Sprint:** 4 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** none
**Closes:** D-20, D-39 (CLAUDE.md pitfall #14)

See HARDEN_BRIEF §6.3 PM-04.

Add per-row "Approve" / "Reject with reason" buttons on the Planned vs Actual section inside Project Detail Time tab. Approve calls existing `POST /timesheets/weeks/:weekId/approve`. Reject opens `ConfirmDialog` for reason.

**Acceptance:** PM resolves a Planned-vs-Actual issue into a timesheet approval in 2 clicks, never leaving project detail.

---

### TASK PM-03, PM-06 — Weekly status digest + Risk staleness sweep

**Sprint:** 4 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** F2

See HARDEN_BRIEF §6.3.

Both are cron sweeps. New events: `project.statusDigest`, `risk.stale`.

---

### TASK DDS-2, 3, 6 — Data DS: version + soft-delete + indexes

**Sprint:** 4 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** none

Per WIRING_MAP §13.3.

- DDS-2: add `version Int @default(1)` to remaining 73 aggregates (expand migration).
- DDS-3: standardize soft-delete: `archivedAt` + `archivedById` + `archivedReason` on state-bearing aggregates; backfill where missing.
- DDS-6: index audit + add missing FK indexes; partial indexes on `archivedAt IS NULL`.

After this sprint, the `aggregate-has-version` and `partial-index-on-archived` ratchets can be promoted from WARN to ERROR.

---

### TASK CUST-2, 3 — Risk thresholds + Radiator scorers to PlatformSetting

**Sprint:** 4 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** CUST-1

Per WIRING_MAP §14.5.

- CUST-2: `project-risk.service.ts` reads `project.risk.staleAfterDays.{HIGH,CRITICAL,MEDIUM,LOW}` instead of hardcoded 7/14/30/90.
- CUST-3: `radiator-scorers.ts` reads `RadiatorThresholdConfig` (extend existing partial coverage to all 16 axes).

---

### TASK CONS-2 — Postgres CHECK constraints

**Sprint:** 4 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** DDS-2

Per WIRING_MAP §15.4.

- INV-A1: `allocationPercent BETWEEN 0 AND 200`
- INV-A2: `validFrom < validTo` when both set
- (others as documented)

---

# SPRINT 4.5 — "In-app help and onboarding tour"

**Demoable outcome:** Any user opens `/help` → searchable Help Center. Press `?` → cheatsheet. Cmd+/ → palette includes Help search. First-login: 90s role-based tour. Per-page "?" affordance opens context article. Admin can edit help content per tenant.

---

### TASK DOC-02 — Help Center MVP (HEADLINE)

**Sprint:** 4.5 · **Priority:** P0 · **Effort:** 2-3 sessions · **Prerequisites:** RBAC-2

See HARDEN_BRIEF §13.3 DOC-02.

New models (per HARDEN_BRIEF §13.2): `HelpArticle`, `HelpTip`, `HelpFeedback`, `OnboardingTourProgress`.

New route `/help`. Search + categories + article reader. Admin edits via `/admin/help`.

---

### TASK DOC-03 — Per-role onboarding tour (HEADLINE)

**Sprint:** 4.5 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** DOC-02

See HARDEN_BRIEF §13.3 DOC-03.

Tours: `first-login-employee`, `first-login-pm`, `first-login-rm`, `first-login-director`, `first-login-hr`, `first-login-admin`.

90 seconds, 5-7 steps each, anchored to nav items via `<Popover>`. Skippable + resumable.

---

### TASK DOC-04 — Per-page "?" affordance + DOC-05 + DOC-06 + DOC-07

See HARDEN_BRIEF §13.3.

- DOC-04: `<TipTrigger />` "?" in every page title bar opens relevant article in a `<Drawer>`.
- DOC-05: Admin edits tips + articles, per-tenant overrides.
- DOC-06: External docs site via mkdocs-material under `docs/site/`.
- DOC-07: Empty-state editorial pass — every `<EmptyState>` has helpful copy + CTA.

---

# SPRINT 5 — "Cost is computable, utilization is visible"

**Demoable outcome:** Finance creates Rate Card → assignments resolve bill rate → revenue + margin per project visible. RM sees Org Utilization dashboard. Director sees burn-rate alerts and Portfolio P&L tile. Multi-currency reports consolidated to home currency.

---

### TASK C-01a — Bill rate via Rate Cards: schema + resolver (HEADLINE part 1)

**Sprint:** 5 · **Priority:** P0 · **Effort:** 2-3 sessions · **Prerequisites:** 0.13 (clients)
**Closes:** D-9, D-43, G43, J2

See HARDEN_BRIEF §7.3 C-01.

Schema: `RateCard` (TENANT/CLIENT/PROJECT scope) + `RateCardEntry` (role × grade × required skills × hourlyRate). Migration `expand` + small backfill.

`EffectiveBillRateResolver.resolve(assignmentId, atDate?)` with 5-layer precedence (assignment override > project card > client card > tenant card > fallback).

Pinning at booking: `BookAssignmentService` writes `appliedRateCardEntryId`.

---

### TASK C-01b — RateCard admin UI

**Sprint:** 5 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** C-01a

Admin → Rate Cards page: list cards, create new (scope + currency + dates + entries via inline editor), publish/unpublish, archive.

---

### TASK C-01c — Assignment FE integration

**Sprint:** 5 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** C-01a, C-01b

`AssignmentDetailsPage` shows resolved bill rate + source ("via Acme Corp Premium / P3 / React, AWS"). Override field (admin/finance only). Project Budget tab shows "Rate sources" panel.

---

### TASK C-03 — Org-level utilization metrics surface (HEADLINE)

**Sprint:** 5 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** C-01a
**Closes:** G45

See HARDEN_BRIEF §7.3 C-03.

`UtilizationRollupService` consuming `AssignmentBillabilityClassifier` (S-08). Per `{scope:'org'|'orgUnit'|'pool'|'team', scopeId, weekStart}` returns billable/productive/bench %.

Materialized view `mv_utilization_weekly` refreshed nightly.

Endpoint `GET /api/utilization?scope=&id=&weeks=`.

FE: dashboard panel on RM + Director with stacked-bar chart + target lines.

---

### TASK C-04 — Burn-rate / run-rate / overrun alerts (HEADLINE)

**Sprint:** 5 · **Priority:** P0 · **Effort:** 1-2 sessions · **Prerequisites:** C-01a
**Closes:** G46

See HARDEN_BRIEF §7.3 C-04.

`BudgetRollupService` nightly. New event `project.budget.overrunRisk` when `projectedOverrun > BAC × project.budget.overrunAlertPct`.

---

### TASK C-02 — Auto-EAC mode

**Sprint:** 5 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** C-04
**Closes:** G44

`EacCalculatorService` with two modes: `manual` (today, default per J5) and `auto-cpi` (`EAC = AC + (BAC - EV) / CPI`). Per-project setting `project.eac.mode`.

---

### TASK C-06 — Compensation PII protection

**Sprint:** 5 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** RBAC-5
**Closes:** G48

`@AuditRead({ category: 'compensation' })` decorator on cost-rate read endpoints. RM sees banded only; HR/Director/Admin see exact.

---

### TASK C-07 — Portfolio cost dashboard

**Sprint:** 5 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** C-01, C-04
**Closes:** G49

Director dashboard "Portfolio P&L" panel: total revenue (bill rate × hours), total cost (cost rate × hours), gross margin, margin % per project (sortable), top 3 at risk.

---

### TASK C-05 — Multi-currency FX snapshot

**Sprint:** 5 · **Priority:** P1 · **Effort:** 1 session · **Prerequisites:** C-01
**Closes:** G47

Schema: `FxRateSnapshot` table. Admin uploads daily CSV via Admin → FX Rates. Reports consolidate in tenant home currency using snapshot at booking.

---

### TASK DDS-4, 5 + RBAC-5 + CONS-4, 5 + CUST-4 (DS plumbing)

**Sprint:** 5 · **Priority:** P2

- DDS-4: enum candidates → MetadataDictionary.
- DDS-5: effective-dating helper applied to RateCard, PersonCostRate, ReportingLine.
- RBAC-5: `@AuditRead` decorator + AuditLog read-rows.
- CONS-4, 5: cost rollup + rate pinning reconcilers.
- CUST-4: enum migrations land via DDS-4.

---

# SPRINT 6 — "Staffing edge cases handled, planner is fast"

**Demoable outcome:** RM gets pre-breach SLA warnings at 50%/75%; cross-project clash blocks >100% allocations with override flow; planner cell click → inline % editor + drag-to-assign; per-director routing wired.

---

### TASK S-04 — Pre-breach SLA warnings (HEADLINE)

**Sprint:** 6 · **Priority:** P0 · **Effort:** 1-2 sessions · **Prerequisites:** F2
**Closes:** G19

See HARDEN_BRIEF §5.3 S-04.

`AssignmentSlaSweepService` extends to compute `pctElapsed` and emit `assignment.slaWarning` at each warning percent in `assignment.sla.warningPercents` (default `[50, 75]`). Idempotency via OutboxEvent natural key.

---

### TASK S-06 — Cross-project clash detection >100% (HEADLINE)

**Sprint:** 6 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** F1
**Closes:** G22

See HARDEN_BRIEF §5.3 S-06.

`ClashDetectionService` invoked on `BOOKED` transition + `create-project-assignment.service.ts`. `pg_advisory_xact_lock(personId)` prevents races.

3 resolutions: forceOverride (RM only), addAsOvertime (if OvertimePolicy allows), placeOnWaitingList.

---

### TASK SD-02 — Planner inline cell editor (HEADLINE)

**Sprint:** 6 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** none
**Closes:** D-72, G50

Per HARDEN_BRIEF §8.3 SD-02.

Click cell → input field appears in-place; type new % or paste candidate name; Enter saves. No modal.

---

### TASK SD-03 — Drag-to-assign (HEADLINE)

**Sprint:** 6 · **Priority:** P0 · **Effort:** 1-2 sessions · **Prerequisites:** SD-02

Per HARDEN_BRIEF §8.3 SD-03. Uses existing `@dnd-kit/core`.

---

### TASK SD-04 — Demand pipeline view

**Sprint:** 6 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** 0.13
**Closes:** G52

New route `/staffing-board/demand`. Card list ranked by revenue impact / start-date urgency / skill scarcity. URL-persisted sort.

---

### TASK S-05 — Configurable Responsibility Matrix (full impl)

**Sprint:** 6 · **Priority:** P1 · **Effort:** 3 sessions · **Prerequisites:** RBAC-2

See HARDEN_BRIEF §5.3 S-05.

Schema: `ResponsibilityRule`. `ResponsibilityResolver.resolve` with priority + scope match. Admin → Responsibility Matrix UI.

After this lands, PM-01 (Sprint 4) and P-07 (Sprint 7) **consume** the resolver instead of hardcoded fallback.

---

### TASK S-07 — Tentative booking + firmness

**Sprint:** 6 · **Priority:** P2 · **Effort:** 1-2 sessions · **Prerequisites:** none
**Closes:** G23

See HARDEN_BRIEF §5.3 S-07.

Add `firmness AssignmentFirmness @default(FIRM)` (TENTATIVE / SOFT / FIRM). Allocation rollups respect firmness.

---

### TASK S-08 — Onboarding-not-billable utilization classifier

**Sprint:** 6 · **Priority:** P0 · **Effort:** 1 session · **Prerequisites:** none
**Closes:** G21

See HARDEN_BRIEF §5.3 S-08.

`AssignmentBillabilityClassifier` table-driven mapping consumed by every utilization read. Closes the C-03 wiring gap.

---

### TASK S-09 — Proposal nudge sweep

**Sprint:** 6 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** F2
**Closes:** G29

See HARDEN_BRIEF §5.3 S-09.

---

### TASK S-11 — Case-from-staffing flow

**Sprint:** 6 · **Priority:** P2 · **Effort:** 1-2 sessions · **Prerequisites:** none
**Closes:** G25

See HARDEN_BRIEF §5.3 S-11.

---

### TASK SD-05 — Right-click "Suggest matches" + SD-09 visual alerts + DDS-7, 8 + CUST-4 + CONS spillover

**Sprint:** 6 · **Priority:** P2

Per HARDEN_BRIEF §8.3 + WIRING_MAP §13.3.

- DDS-7: drop legacy `Person.skillsets`, `Project.tags`, `Project.techStack` columns (DM-6b-1 follow-up).
- DDS-8: more Postgres CHECKs.

---

# SPRINT 7 — "Bench → demand → assignment, end-to-end fast"

**Demoable outcome:** Right-click suggest matches; scenario diff vs current; bench cohort with best-fit suggestions; RM-initiated release with HR + Director dual-approval ships; project closure checklist.

---

### TASK SD-06 — Scenario "compare vs current" diff (HEADLINE)

**Sprint:** 7 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** none
**Closes:** G54

Per HARDEN_BRIEF §8.3 SD-06.

---

### TASK SD-07 — Bench cohort view (HEADLINE)

**Sprint:** 7 · **Priority:** P1 · **Effort:** 1-2 sessions · **Prerequisites:** S-08
**Closes:** G56

Per HARDEN_BRIEF §8.3 SD-07.

---

### TASK P-07 — RM-initiated, HR + Director dual-approval Release flow (HEADLINE)

**Sprint:** 7 · **Priority:** P0 · **Effort:** 3-4 sessions · **Prerequisites:** RBAC-3, S-05, F2
**Closes:** G14, G13, J3

See HARDEN_BRIEF §4.3 P-07 (revised per J3).

Schema: `PersonReleaseRequest`, `PersonReleaseApproval`, `ReleaseApprovalDecision` enum, `OFFBOARDING_IN_PROGRESS` person status.

Endpoints: open / approve / reject / cancel / checklist-step / finalize.

UI: Release tab on Person 360 (RM/HR/Director). Approval queue extension.

PlatformSettings: `people.release.{requireDualApproval, requiredApprovalRoles, checklistTemplate, gracePeriodDays}`.

---

### TASK PM-09 — Project close workflow

**Sprint:** 7 · **Priority:** P1 · **Effort:** 2 sessions · **Prerequisites:** F2
**Closes:** G38

Per HARDEN_BRIEF §6.3 PM-09. Closure checklist: timesheets approved, assignments completed/cancelled, milestones complete/cancelled, risks resolved, retro filed, WorkEvidence reconciled.

---

### TASK PM-07 — Change Request decision SLA + budget linkage

**Sprint:** 7 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** F2
**Closes:** G42

Per HARDEN_BRIEF §6.3 PM-07.

---

### TASK PM-08 — Vendor SLA tracking surface

**Sprint:** 7 · **Priority:** P2 · **Effort:** 1 session · **Prerequisites:** F2
**Closes:** G36

Per HARDEN_BRIEF §6.3 PM-08.

---

### TASK ADS-10, 11 + RBAC catalog finalization

**Sprint:** 7 · **Priority:** P2

- ADS-10: Migrate Project endpoints to standard envelope.
- ADS-11: Migrate Cost endpoints to standard envelope.
- Continue ratcheting `no-role-string-literal` toward zero.

---

# SPRINT 8 — "Observable + matching v2 + signed off"

**Demoable outcome:** Director sees `/admin/monitoring` with metrics catalog (outbox lag, SLA breach rate, time-to-fill p50, response latency p95). Matching engine v2 opt-in available. Phase 20c clean code items land. All 6 DS ratchets at zero violations OR strictly ratcheting.

---

### TASK F8.1-3 — Observability: prom-client metrics catalog (HEADLINE)

**Sprint:** 8 · **Priority:** P0 · **Effort:** 2 sessions · **Prerequisites:** F2

See HARDEN_BRIEF §3.8.

Per-domain counters per HARDEN_BRIEF Appendix E. `/metrics` endpoint (admin-only). Trace IDs through OutboxEvent.payload.

Admin → Monitoring page shows the catalog with current values + sparklines.

---

### TASK S-10 — Matching engine v2 (gated)

**Sprint:** 8 · **Priority:** P1 · **Effort:** 2-3 sessions · **Prerequisites:** none
**Closes:** G27

Per HARDEN_BRIEF §5.3 S-10.

Add columns to Person: `domains String[]`, `languages String[]`, `certifications String[]`, `preferredTimezones String[]` (or normalize to `PersonAttribute` join).

Weighted scorer (skill+grade+domain+language+TZ+cert+conflict+cost). Weights in `assignment.matching.weights.*` PlatformSettings.

Gated by `flag.matchingEngineV2Enabled` (default false).

---

### TASK Phase 20c remaining

**Sprint:** 8 · **Priority:** P2 · **Effort:** 3-5 sessions

Per HARDEN_BRIEF §1.3:

- 20c-01 boundary violations
- 20c-02 LeaveRequestRepository
- 20c-03 rename in-memory-staffing-request.service.ts
- 20c-04 metadata Prisma calls
- 20c-06 split AuthService god (16 methods → 4 services)
- 20c-07 controller presentation logic extract
- 20c-08 forwardRef circular deps
- 20c-09 (full scope) DTOs for 25+ inline `@Body()` params
- 20c-10 typed Gateway generics (no `any`)
- 20c-11 dangerous `as unknown as` 12+ instances
- 20c-12 pagination on unbounded `findMany()`
- 20c-14 `fetchDashboard<T>` generic
- 20c-16 `usePersonSelector` hook extract
- 20c-18 boolean params refactor

---

### TASK ADS-12, 14, 15 + DS sunset

**Sprint:** 8 · **Priority:** P2

- ADS-12: Migrate Distribution Studio endpoints.
- ADS-14: Auto-generate FE API clients from OpenAPI.
- ADS-15: Cap 70 FE clients to 1 per backend module + remove duplicates.
- S-01 step E: legacy staffing endpoint deletion (sunset day).

---

### TASK Phase DS deferred + Phase CC remaining

**Sprint:** 8 · **Priority:** P2

Per HARDEN_BRIEF §1.3 (Phase DS + Phase CC): close out remaining DS-2-5 inline drawer migration, DS-3 form molecules, DS-4 DataView, DS-5 layouts, DS-6 docs, DS-7 enforcement; CC-9, CC-10, CC-11, CC-12, CC-13.

---

# Appendix A — Discrepancy register (D-01..D-84)

Compact reference. Full text in HARDEN_BRIEF §2 + HARDEN_WIRING_MAP §21.5.

| ID | Headline | Closing task |
|---|---|---|
| D-01 | Cred mismatch | 0.4 |
| D-02 | PublicId DI failure | **0.1** |
| D-03 | Schema drift | 0.2 |
| D-04 | Legacy + canonical staffing endpoints | S-01 (Sprint 0 audit + Sprint 2 deprecate + Sprint 8 sunset) |
| D-05 | Tracker says tests done | 0.3 |
| D-06 | Tenant RLS half-shipped | F6 (HOLD) |
| D-07 | publicId 2/10 aggregates | DM-2.5 ongoing |
| D-08 | Skills double-truth | P-04 / 0.16 |
| D-09 | No bill rate (cost-only enum) | C-01 (Sprint 5) |
| D-10 | Project tags double-truth | PM-05 (Sprint 4) |
| D-11 | StaffingRequest derived status drift | S-13 (Sprint 2) |
| D-12 | No Director-approval gate on project | PM-01 (Sprint 4) |
| D-13 | RM not first-class | P-01 (Sprint 1) |
| D-14 | Contract fields missing | P-01 (Sprint 1) |
| D-15 | Photo not first-class | P-01 (Sprint 1) |
| D-16 | Self-approval guard on case approval | F3.1 audit (Sprint 1) |
| D-17 | Tenant settings undiscoverable | CUST-5 (Sprint 3) |
| D-18 | Mood aggregation surface | P-06 (Sprint 3) |
| D-19 | Time alerts incomplete | 0.7 audit + P-09 (Sprint 3) |
| D-20 | No approve-hours from project detail | PM-04 (Sprint 4) |
| D-21 | StaffingRequest 5 vs Assignment 9 framing | S-02 doc (Sprint 2) |
| D-22 | Live URL typo | RESOLVED |
| D-23 | MUI v7 + custom CSS | informational |
| D-24 | "in-memory" service naming | 20c-03 (Sprint 8) |
| D-25 | DS deferred drawers | DS-5 phase |
| D-26 | CLAUDE.md stale | 0.4 |
| D-27 | Breadcrumb leak | **0.10** |
| D-28 | "New Admin" page title | 0.11 |
| D-29 | Russian-locale date pickers | 0.12 |
| D-30 | Form writes legacy Person.skillsets | **0.16** |
| D-31 | Person form missing fields | P-01 / P-02 |
| D-32 | SLA columns empty | 0.15 |
| D-33 | Director Dashboard missing tiles | S-03 (Sprint 2) + C-07 (Sprint 5) |
| D-34 | 0 open demand in seed | 0.13 |
| D-35 | All projects have empty Client | 0.13 |
| D-36 | Grade dictionary actual range | 0.14 |
| D-37 | Onboarding widget static | DOC-03 additive (Sprint 4.5) |
| D-38 | 7 base roles, not 8 | doc fix |
| D-39 | Session timeout aggressive | 0.27 |
| D-40 | Form data lost on session expiry | FE-FOUND-04 (Sprint 1) |
| D-41 | Grade range G7..G15 | 0.14 |
| D-42 | Line Manager native select w/ 200 options | FE-FOUND-05 (Sprint 1) |
| D-43 | Org Unit flat select | FE-FOUND-06 (Sprint 1) |
| D-44 | ConfirmDialog wording wrong | DOC-07 editorial pass (Sprint 4.5) |
| D-45 | Person 360 status display bug | **0.20** |
| D-46 | Skill data silently lost | **0.16** + P-04 |
| D-47 | History empty after hire | **0.17** |
| D-48 | URL filter `?q=` not read | 0.28 |
| D-49 | (covered by D-45) | 0.20 |
| D-50 | No redirect after Create | 0.21 |
| D-51 | Wrong subtitle on /projects/new | 0.26 |
| D-52 | Project code convention | 0.25 |
| D-53 | Priority HIGH→MEDIUM drop | **0.22** |
| D-54 | KPI vs Pulse contradiction | **0.18** |
| D-55 | Cold-start radiator | **0.19** |
| D-56 | Project list health column same fake | 0.19 |
| D-57 | Activate CTA only on Lifecycle tab | PM-01 polish (Sprint 4) |
| D-58 | No ConfirmDialog on Activate | DS conformance + PM-01 |
| D-59 | Activate audit silent | **0.17** |
| D-60 | Subtitle leak | 0.26 |
| D-61 | (dup of D-58) | — |
| D-62 | (dup of D-12) | — |
| D-63 | (dup of D-59) | — |
| D-64 | UX consistency gap | P-02 + DS shell |
| D-65 | Candidate-is-known pre-seed | S-02 doc |
| D-66 | Skill picker copy exemplary | DOC-07 |
| D-67 | Subtitle leak on staffing-requests/new | 0.26 |
| D-68 | Cmd+K no people search | 0.23 |
| D-69 | Cmd+K filter doesn't narrow | 0.23 |
| D-70 | Notification bell empty | **0.17** |
| D-71 | `?` cheatsheet | 0.24 |
| D-72 | Planner cell click read-only | SD-02 (Sprint 6) |
| D-73 | Supply 555% hidden in cell color | SD-09 (Sprint 6) |
| D-74 | (dup of D-27) | 0.10 |
| D-75 | CLAUDE.md says 53 models, actual 87 | 0.4 |
| D-76 | API versioning unclear | ADS-1 docs (Sprint 1) |
| D-77 | C-01 RateCard task oversized | split C-01a/b/c (Sprint 5) |
| D-78 | PM-01 → S-05 dep cycle | Sprint 4 hardcoded fallback; Sprint 6 consumes S-05 |
| D-79 | DDS-2 → idempotency ratchet ordering | ratchet WARN until Sprint 4 then ERROR |
| D-80 | Email bounce handling missing | future iteration |
| D-81 | File upload spec missing | future iteration |
| D-82 | i18n strategy missing | future iteration |
| D-83 | Data retention policy missing | future iteration |
| D-84 | Customer support / impersonation audit trail | future iteration |

---

# Appendix B — Six DS spines summary

| # | Spine | CI gate | Doc |
|---|---|---|---|
| 1 | UI / Visual DS (existing) | `tokens:check`, `ds:check` | `phase18-page-grammars.md`, `design-tokens.ts` |
| 2 | API DS | `api:check` (new) | `api-design-system.md` (new) |
| 3 | Authorization DS | `authz:check` (new) | `authorization-design-system.md` (new) |
| 4 | Data DS | `schema:check` extended | `data-design-system.md` (new) |
| 5 | Customization DS | `no-hardcode:check` (new) | `customization-system.md` (new) |
| 6 | Consistency DS | `consistency:check` (new) | `data-consistency.md` (new) |

Plus 3 cross-cutting non-DS layers: Observability, Test strategy, Migration discipline.

---

# Appendix C — Open questions resolved (J-decisions)

| # | Decision |
|---|---|
| **J1** | Multi-tenancy: HOLD. Each tenant gets own deployment. |
| **J2** | Bill rate: rate-card driven by role × grade × skills (C-01). |
| **J3** | Termination: RM initiates; HR + Director both approve (P-07). |
| **J4** | Director routing: configurable Responsibility Matrix per tenant (S-05). |
| **J5** | EAC mode default: manual (C-02). |
| **J6** | Project approvals: required on creation AND budget change (PM-01 extended). |
| **J7** | Pulse audience: RM + PM + Director + HR (P-06). |
| **J8** | Compensation banding: 5 bands P1-P5 mapped from G7-G15 grades (Appendix B map). |
| **J9** | Proposal slate: unlimited candidates. |
| **J10** | Live URL access from VSCode workstation: yes. |
| **J11** | Documentation, in-app tips, Help Center: first-class deliverables (Sprint 4.5). |

---

# Appendix D — File index by domain

Per HARDEN_BRIEF §Appendix F. Use it to find the right file fast.

---

# Final notes

**Honesty bar (per WIRING_MAP §21):** the catalog is necessarily incomplete. Another iteration of search will surface more D-items. The framework is designed for that — six CI ratchets keep the floor monotonic; reconcilers detect drift in real time; synthetic monitors catch regressions in scenarios A-E continuously.

**Working software bar (per WIRING_MAP §20):** every sprint ends with a named user role performing a named action they couldn't perform before, on the live stage, in ≤3 clicks, with a Playwright happy-path spec, in CHANGELOG.md.

**Rollback bar:** every PR description names env flag, reverse migration, or feature toggle. If you can't articulate one, you're not ready to ship.

**Build-never-fails bar:** `npm run verify:pr` green or no merge. Period.

That's the contract. Hand task 0.1 to Claude Code in VSCode and start.

— end —
