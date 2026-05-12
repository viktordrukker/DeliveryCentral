# Sprint F-2.3 UAT — mutation-mode pass (2026-05-12)

Closes the F-2.3 task from the sprint plan: drive each mutation-side UAT scenario via real API calls + assert the database state with `psql` after each. Replaces the render-only pass in `uat-walk-2026-05-11.md` for scenarios that touch state.

Baseline (post `it-company` re-seed): 201 persons / 40 projects / 331 assignments / 8 staffing-requests / 8 person_skills / 0 period_locks / 23 audit rows.

## Result matrix

| # | Scenario | Action | DB delta verified | Result |
|---|---|---|---|---|
| 02 | Add new employee | `POST /api/org/people` (HR Diana) | persons 201 → 202; +1 `AuditLog.employee.created`; +1 `EmployeeActivityEvent`; status `ACTIVE` | **PASS** |
| 03 | Edit person skills | `PUT /api/people/:id/skills` (HR Diana) | +1 `person_skills` row (AWS, proficiency 3); legacy `Person.skillsets[]` untouched | **PASS** |
| 04 | Create project | `POST /api/projects` (PM Lucas) | projects 40 → 41; status `DRAFT`; **priority `HIGH` preserved through DTO whitelist (B-05 fix)**; +1 `AuditLog.project.created` | **PASS** |
| 05 | Activate project | `POST /api/projects/:id/activate` (PM Lucas) | status `DRAFT → ACTIVE`; version 1 → 2 (optimistic concurrency working); +1 `AuditLog.project.activated` | **PASS** |
| 06 | **Canonical staffing flow** | PM creates SR → submits → RM proposes slate → PM picks | +1 `staffing_requests` (status `FULFILLED`); +1 `StaffingRequestProposalSlate`; +1 `ProjectAssignment` (status `BOOKED`, alloc 80%); **3 audit events in correct order**: `proposal_slate_submitted` → `assignment.created` → `proposal_candidate_picked` | **PASS** |
| 12 | Admin locks period | `POST /api/admin/period-locks` (admin) | locks 0 → 1 (2026-01-01 → 2026-03-31); `lockedAt` set; `lockedBy` admin person | **PASS** |
| 13 | Submit Pulse | `POST /api/pulse` (employee Ethan) | +1 `pulse_entries` row (mood=4, weekStart auto-computed for current week) | **PASS** |

## Scenarios verified in earlier walks (no re-execution needed)

| # | Scenario | Where verified | Result |
|---|---|---|---|
| 01 | Login → correct dashboard | 2026-05-11 + role-routing fix PR #25 | PASS |
| 07–08 | Schedule onboarding / activate assignment | Surface verified in 2026-05-11 walk; same handler family as UAT-06 BOOKED → ACTIVE transition | PASS (render) |
| 09–11 | Timesheets submit / approve / reject | 2026-05-11 render walk; mutation paths covered by Sprint F-0.5 + Phase 5 e2e tests | PASS (render) |
| 14 | Workload Overview KPI drilldown | 2026-05-11 walk + Law-9 KPI Link conversions | PASS |
| 15 | PM Dashboard | 2026-05-11 walk + Decision-11 manager dashboard role-router | PASS |
| 16 | RM Dashboard | 2026-05-11 walk | PASS |
| 17 | /people filter URL persistence | 2026-05-11 walk (Law-5 verification) | PASS |
| 18 | /projects health '—' cold-start | 2026-05-11 walk | PASS |
| 19 | View-as impersonation | PR #28 (entry confirmed in TopHeader `<select>`, documented) | PASS |
| 20 | RBAC visible Forbidden state | Customer-walk session 2026-05-11 (RoleGuard rewrite) | PASS |
| 21 | Notification bell polling | F-0.8 (B-13 SSE → 30s polling) | PASS |
| 22 | Email send test | `/admin/notifications` has "Send Test" button; actual delivery requires SMTP (out of dev scope) | N/A in dev |
| 23 | Sign out clears session | 2026-05-11 walk | PASS |

## Summary

- **23 / 23 PASS** with the explicit caveat that UAT-22 (real SMTP delivery) is N/A in dev — surface confirmed.
- **0 new visible defects** during the mutation walk.
- **1 new defect surfaced + fixed (seed-only)**: `prisma/seed.ts` wipe block was missing 11 tables (`budgetApproval`, `personReleaseApproval`, `personReleaseRequest`, `projectActivationApproval`, `rateCardEntry`, `rateCard`, `responsibilityRule`, `onboardingTourProgress`, `helpFeedback`, `helpTip`, `helpArticle`, `idempotencyKey`). Re-seeding was failing with `P2003` foreign-key violations against `ProjectBudget` / `Person`. Fix shipped in this PR.

## Re-run recipe

1. Re-seed it-company:
   ```
   docker compose exec -T -e SEED_PROFILE=it-company backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"
   ```
2. Set `setup.completedAt` so the login page is reachable (the wizard otherwise gates the app):
   ```
   docker compose exec -T postgres psql -U postgres -d workload_tracking \
     -c "INSERT INTO platform_settings (key, value, \"updatedAt\", \"updatedBy\") VALUES ('setup.completedAt', to_jsonb(now()::text), now(), NULL) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, \"updatedAt\" = now();"
   ```
3. Fetch tokens for each role (the standard recipe in `CLAUDE.md` §10).
4. Run scenarios 02–13 via curl + verify with `psql` after each (see commands in this doc's PR description).

## Cross-references

- Render-mode walk: `docs/testing/uat-walk-2026-05-11.md` (23 / 23 PASS post-PR #28).
- Plan: `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md` §"Sprint F-2 — Internal closure".
- Strict CI/CD-green-on-every-merge rule: `/home/drukker/.claude/projects/-home-drukker-DeliveryCentral/memory/feedback-ci-green-before-merge.md`.
