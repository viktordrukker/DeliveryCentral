# UX Contracts

A **UX contract** is a per-page specification of the page's user-visible behavior. It exists so that as the UI is rebuilt on the new design system (Phase DS), the **UX logic does not regress**. The visual chrome may change; click paths, validation, role gating, side effects, and copy may not.

## Why

Phase DS rebuilds atoms, surfaces, and feature blocks. Every migrated page touches dozens of components. Without a written contract, "I refactored ProjectsPage to use `<DataView>`" silently changes a default sort, drops a confirmation prompt, or breaks a URL filter — and reviewers can't catch it because nobody wrote down what was supposed to happen.

The contract is the source of truth for **what the page does**. The Playwright UX-regression spec at [`e2e/ux-regression/<route>.spec.ts`](../../../e2e/ux-regression/) is its executable mirror: every documented behavior is a test.

## Workflow

For every page touched by Phase DS:

1. **Author the contract first.** First commit of the migration PR is `docs/planning/ux-contracts/<route>.md`. Describes the *current* behavior, not the desired one.
2. **Author the spec.** First (or same) commit also adds `e2e/ux-regression/<route>.spec.ts` covering every behavior in the contract. Spec runs against the **current** app and is **green** before any code change.
3. **Migrate the page.** Refactor to new components. UI may change; UX must not.
4. **Re-run.** Both the unit suite (`npm --prefix frontend run test`) and the UX-regression suite (`npx playwright test e2e/ux-regression/<route>.spec.ts`) must remain green.
5. **Anything that changed deliberately** (e.g. a destructive button gains danger styling — a UX improvement) is called out in the PR description and the contract is updated in the same PR.

If the spec was already green pre-migration and is still green post-migration, **the page's UX is preserved by definition**. That is the only acceptance criterion that matters.

## What a contract documents

Every contract has the same eight sections. If a section is empty for a page, write `_None._` — never omit it.

1. **Route & roles** — URL, route component file, which roles can access (referenced from `frontend/src/app/route-manifest.ts`)
2. **Click paths** — every navigation the user can trigger (button → destination, row click → destination, link → destination)
3. **Form validation** — required fields, format constraints, cross-field rules, server-rejection display
4. **Confirmation prompts** — every confirm dialog: action, copy, with-reason, danger styling
5. **Toast / notification triggers** — every `toast.success/error/warning` or in-app notification
6. **Filters / sort / pagination / saved views** — every URL-persisted control, default value, restore-on-back behavior
7. **Empty / loading / error states** — copy and CTAs in each state
8. **Side effects** — API calls, audit log entries, analytics events, broadcast notifications triggered by each interaction

Use [_TEMPLATE.md](./_TEMPLATE.md) as the starting point. Use [DashboardPage.md](./DashboardPage.md) as a worked example.

## Contract authoring tips

- **Be exhaustive about behavior, terse about prose.** Bullet points and tables, not paragraphs.
- **Use exact strings.** "the success toast" is wrong; `toast.success('Project created')` is right. The spec asserts on these strings.
- **Reference files by markdown link** with line numbers when behavior is non-obvious (`[useProjects.ts:42](../../../frontend/src/features/projects/useProjects.ts#L42)`).
- **Don't speculate.** If the page has a behavior nobody documented, find it in the code and capture it.
- **Don't fix bugs in the contract.** If the page has a UX bug, document the bug; fix it as a separate PR with its own contract update.

## Authoring order (the 20)

DS-0 prioritizes these 20 contracts. The remaining ~119 routes get contracts authored just-in-time, immediately before each migration PR.

| # | Route | File | Page component |
|---|-------|------|----------------|
| 1 | `/dashboard` | `DashboardPage.md` | `frontend/src/routes/dashboard/DashboardPage.tsx` |
| 2 | `/projects` | `ProjectsPage.md` | `frontend/src/routes/projects/ProjectsPage.tsx` |
| 3 | `/projects/:id` | `ProjectDetailPage.md` | `frontend/src/routes/projects/ProjectDetailPage.tsx` |
| 4 | `/staffing-desk` | `StaffingDeskPage.md` | `frontend/src/routes/staffing-desk/StaffingDeskPage.tsx` |
| 5 | `/assignments` | `AssignmentsPage.md` | `frontend/src/routes/assignments/AssignmentsPage.tsx` |
| 6 | `/people` | `EmployeeDirectoryPage.md` | `frontend/src/routes/people/EmployeeDirectoryPage.tsx` |
| 7 | `/people/:id` | `EmployeeDetailsPage.md` | `frontend/src/routes/people/EmployeeDetailsPlaceholderPage.tsx` |
| 8 | `/teams` | `TeamsPage.md` | `frontend/src/routes/teams/TeamsPage.tsx` |
| 9 | `/teams/:id` | `TeamDashboardPage.md` | `frontend/src/routes/teams/TeamDashboardPage.tsx` |
| 10 | `/exceptions` | `ExceptionsPage.md` | `frontend/src/routes/exceptions/ExceptionsPage.tsx` |
| 11 | `/cases` | `CasesPage.md` | `frontend/src/routes/cases/CasesPage.tsx` |
| 12 | `/staffing-requests` | `StaffingRequestsPage.md` | `frontend/src/routes/staffing-requests/StaffingRequestsPage.tsx` |
| 13 | `/timesheets` | `TimesheetPage.md` | `frontend/src/routes/timesheets/TimesheetPage.tsx` |
| 14 | `/time-management` | `TimeManagementPage.md` | `frontend/src/routes/time-management/TimeManagementPage.tsx` |
| 15 | `/workload/planning` | `PlannedVsActualPage.md` | `frontend/src/routes/dashboard/PlannedVsActualPage.tsx` |
| 16 | `/resource-pools` | `ResourcePoolsPage.md` | `frontend/src/routes/resource-pools/ResourcePoolsPage.tsx` |
| 17 | `/dashboard/director` | `DirectorDashboardPage.md` | `frontend/src/routes/dashboard/DirectorDashboardPage.tsx` |
| 18 | `/dashboard/hr` | `HrDashboardPage.md` | `frontend/src/routes/dashboard/HrDashboardPage.tsx` |
| 19 | `/admin` | `AdminPanelPage.md` | `frontend/src/routes/admin/AdminPanelPage.tsx` |
| 20 | `/login` | `LoginPage.md` | `frontend/src/routes/auth/LoginPage.tsx` |
