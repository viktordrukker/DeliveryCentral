# DeliveryCentral — QA & Product Research Guideline

_Audience: Anna Surkova, Alina Novikova, Ekaterina Vashurina, Ruslan Bogdanov._
_Last updated: 2026-05-21._

---

## 1. What DeliveryCentral is

DeliveryCentral is a **delivery-operations platform** for IT/professional-services companies: people, projects, staffing, time/cost, cases, audit, integrations. It replaces a stack of spreadsheets + ad-hoc tools with one system of record around four primary jobs:

| Job | Owned by | Where you start |
|-----|----------|-----------------|
| **Plan capacity** — who is free, when | Resource Manager | `/staffing-desk?view=planner` |
| **Staff a project** — fill a request with a person | PM + RM | `/staffing-desk?view=requests` |
| **Run the work** — track plan vs. actual, risks, milestones | PM + Delivery Manager | `/projects/:id`, `/dashboard` |
| **Govern the system** — RBAC, integrations, audit | Admin | `/admin/*` |

Your accounts are full `admin` — you can see and do everything any role can.

---

## 2. Your accounts (staging only)

| Tester | Email | Role |
|--------|-------|------|
| Anna Surkova | `qa.anna.surkova@deliverycentral.local` | admin |
| Alina Novikova | `qa.alina.novikova@deliverycentral.local` | admin |
| Ekaterina Vashurina | `qa.ekaterina.vashurina@deliverycentral.local` | admin |
| Ruslan Bogdanov | `qa.ruslan.bogdanov@deliverycentral.local` | admin |

- Initial passwords are shared **out-of-band** (Viktor will deliver them).
- `mustChangePw = true` — you will be forced to set a new password on first login. Pick a strong one.
- **Staging URL:** ask Viktor for the current staging host (it rotates with deploys).
- **Do NOT use these credentials anywhere else.** Staging only. There is no prod access bundled here.

---

## 3. Environment & data

- **Stand:** staging (`dc-staging-*` containers).
- **Data:** seeded `it-company` profile — 200 synthetic people, 40 projects, 5-year history. _All data is mocked._ Names, projects, and emails are fake.
- **Reset cadence:** the DB is **not** auto-reset between sessions. If you create test data, prefer prefixing names with `QA-` (e.g. project "QA-2026-05-21-anna-flow-1") so it is easy to find and clean up later.
- **Other test accounts** (use to verify role behavior — full list in `CLAUDE.md` §10):
  - PM: `lucas.reed@itco.local` / `ProjectMgrPass1!`
  - RM: `sophia.kim@itco.local` / `ResourceMgrPass1!`
  - HR: `diana.walsh@itco.local` / `HrManagerPass1!`
  - Director: `noah.bennett@itco.local` / `DirectorPass1!`
  - Employee: `ethan.brooks@itco.local` / `EmployeePass1!`
  - Dual-role RM+HR: `emma.garcia@itco.local` / `DualRolePass1!`
- **Impersonation:** admins have a "View as" feature (top bar → user menu → View as…). Use it to verify what each role sees without logging out. The audit log records every impersonation.

---

## 4. How to test — the working loop

For each session, work one **persona** at a time. The aim is realistic, scenario-based exploration — not exhaustive click-coverage.

1. **Pick a persona + job** from §1.
2. **Log in (or "View as") that persona.**
3. **Walk the happy path** end-to-end. Note any friction, confusing labels, or 2+ click detours.
4. **Walk one edge case** (empty data, filter to zero, slowest path, error case).
5. **Check the four UX guardrails** as you go:
   - Every page has a forward action (no dead-ends).
   - Filters survive a back-button round-trip.
   - Every KPI on a dashboard is clickable.
   - You never have to scroll to find the Approve / Resolve button.
6. **Log findings.** One GitHub Issue per finding. See §6 for the template.

### What to look for (priority order)

1. **Broken happy path** — a core flow (login, create project, staff a request, submit timesheet, run a report) fails or 500s. This is a P0 bug.
2. **Wrong data** — number on a dashboard ≠ the list it links to; KPI shows 7 but drilldown shows 5.
3. **RBAC leak / lockout** — a role sees something it shouldn't, or can't reach something it must.
4. **UX friction** — pages that violate one of the four guardrails above.
5. **Copy/labels** — confusing or inconsistent wording.
6. **Performance** — anything that takes >3s to load and isn't an export.
7. **Missing feature** — a job that the product clearly _wants_ to support but doesn't have a path for. File as a **feature proposal** (§6.B).

### What NOT to file

- Cosmetic pixel-tweaks unless they break readability or the design tokens (don't report "this card is 2px off"; do report "this status badge color is unreadable on dark mode").
- "It should work like Jira / Workday / SAP" — file a feature proposal with the **job to be done**, not a competitor comparison.
- Anything you can't reproduce on a second try with steps written down. Stop, re-run, write steps, then file.

---

## 5. Suggested test menu — first week

Run through these in any order. Each is ~20–40 min.

1. **PM happy path:** log in as `lucas.reed@itco.local` → open a project → add a risk → log an actual hour → mark a milestone done.
2. **RM happy path:** log in as `sophia.kim@itco.local` → open `/staffing-desk?view=planner` → run "Auto-match" for next 4 weeks → propose a candidate for one open request.
3. **HR happy path:** log in as `diana.walsh@itco.local` → review pending leave requests → approve one → check audit log shows the action.
4. **Director read-only walk:** log in as `noah.bennett@itco.local` → open every dashboard in the left nav → verify every KPI clicks through to a populated list.
5. **Employee walk:** `ethan.brooks@itco.local` → submit a timesheet for last week → check it appears in PM's approval queue.
6. **Admin tour:** with your own QA account → visit every page under `/admin/*` → confirm you can land on each one without error.
7. **Impersonation cross-check:** as admin, "View as" each of the personas above and re-walk one of their flows. Verify the audit trail.
8. **Edge: empty filters.** On any list page, filter to zero results — verify the empty state offers a forward action ("Clear filters", "Create new").
9. **Edge: deep link.** Copy the URL of a filtered list, paste in a new tab — filters must restore.
10. **Edge: back-button.** From a list, open a detail page, then press Back — your scroll position and filters must survive.

---

## 6. How to report findings → `docs/qa/GITHUB_ISSUE_GUIDE.md`

All findings go to **GitHub Issues** in `viktordrukker/DeliveryCentral`. See the companion guide for the step-by-step + templates.

Tag rules (short version):

- `type:bug` + severity (`P0`–`P3`) for defects.
- `type:feature` for proposals.
- `type:ux` for UX-law violations and friction.
- `area:<module>` (e.g. `area:staffing`, `area:dashboard`) so the right owner sees it.
- Always include: **steps**, **expected**, **actual**, **persona used**, **screenshot/video**, **URL**.

---

## 7. Etiquette

- **Stay on staging.** Do not poke at the prod host even if you find creds in chat.
- **Don't share your password.** Each account is per-person. Re-using one defeats the audit trail.
- **One finding per issue.** Don't bundle 5 unrelated bugs in one ticket — the assignee will close it and ask you to split.
- **Triage your own issues first.** Before filing, search for an existing open issue (`is:open <keyword>` in the repo). Avoid duplicates.
- **Reference your seed data.** If you used "QA-anna-2026-05-21" as a project name, mention it — makes reproduction trivial.

---

## 8. Quick links

| Where | Why |
|-------|-----|
| `docs/planning/MASTER_TRACKER.md` | What's actively being built — check before filing a feature proposal in case it's already scoped |
| `docs/planning/current-state.md` | What's implemented vs. outstanding |
| `docs/testing/MANUAL_TEST_PLAN.md` | 142 pre-written test cases — useful for systematic coverage |
| `docs/testing/exploratory-checklist.md` | Lightweight exploratory checklist |
| `.claude/rules/ux-laws.md` | The 10 UX laws — useful as a checklist when filing UX issues |

---

## 9. If you get stuck

Reach Viktor on the team channel. For credential/access problems include: the email you tried, the time, the staging URL, and a screenshot of the error. For data/state weirdness, also include the value of the URL bar (filters live there).
