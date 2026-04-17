# DeliveryCentral — Claude Code Rules

These rules apply to every session in this repository. Read them before doing any work.

---

## 1. Session Start Protocol

Every session must begin with these steps, in order:

1. **Read the tracker:** `docs/planning/MASTER_TRACKER.md` — find the current phase and the first unchecked `[ ]` item.
2. **Read current state:** `docs/planning/current-state.md` — understand what is implemented vs outstanding.
3. **Read memory index:** check `/memory/MEMORY.md` for any session-specific notes from prior work.
4. **Identify the next task** — start from the first unchecked item in the lowest-numbered active phase. Do not skip ahead to a later phase unless all prior-phase items are checked.
5. **State the plan** — tell the user what you are about to implement (one sentence) before writing any code.

---

## 2. Tracker Workflow Rules

**The tracker file:** `docs/planning/MASTER_TRACKER.md`

- Mark each item `[x]` **immediately** when it is complete — not in batches at the end.
- Do not mark an item complete unless: (a) the code is written, (b) TypeScript compiles clean, (c) tests pass.
- If a tracker item turns out to already be implemented, mark it `[x]` with a note `_(already done)_` and move on.
- If an item is blocked or skipped, mark it `[-]` and add a one-line reason inline.
- After completing all items in a sub-phase, update the status summary table at the top of the tracker.
- Never reorder or remove items from the tracker — only check them off.

---

## 3. Implementation Standards

### Before writing code
- **Always read the file first.** Never edit a file you have not read in the current session.
- Understand existing patterns before adding new ones. Follow the pattern already in use.
- If two approaches exist in the codebase, use the more recent or more consistent one.

### Scope
- Implement exactly what the tracker item describes. No more, no less.
- Do not refactor surrounding code that is not part of the task.
- Do not add comments, docstrings, or type annotations to code you did not change.
- Do not add error handling for impossible scenarios. Trust internal guarantees.
- Do not add feature flags or backwards-compatibility shims.

### TypeScript
- Backend and frontend TypeScript must be clean after every change.
- Check backend: `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit`
- Check frontend: run via `npm --prefix frontend run test` (tests include type compilation)
- If a type error appears in a file you did not touch, investigate before assuming it is pre-existing — it may have been caused by your change.

### File creation
- Prefer editing an existing file over creating a new one.
- New files are only created when a tracker item explicitly requires a new page, component, hook, or API module.
- Never create `*.md` documentation files unless the task explicitly says to.

---

## 4. Codebase Patterns

### Backend (NestJS)
- Import alias: `@src/` maps to `src/`
- Module structure: `presentation/` (controllers), `application/` (services, DTOs), `infrastructure/` (repos)
- Guards: `@RequireRoles(...)` for role enforcement; `@AllowSelfScope({ param: '...' })` for ownership
- All endpoints under global prefix `/api`
- Prisma for all DB access — never raw SQL
- New Prisma migrations: `npx prisma migrate dev --name <migration-name>` (requires running DB)

### Frontend (React + Vite)
- Import alias: `@/` maps to `frontend/src/`
- **Hooks** in `src/features/` — one hook per domain concern
- **API modules** in `src/lib/api/` — one file per backend module
- **Pages** in `src/routes/<domain>/` — one file per route
- **Shared components** in `src/components/common/` — reusable across pages
- **Layout components** in `src/components/layout/`

### Auth / principal
- `useAuth()` returns `principal: { personId?, roles, ... } | null`
- `principal?.personId` is the logged-in person's UUID — use this, never a hardcoded UUID
- `principal?.roles` for RBAC checks in components
- Dashboard hooks that accept `initialPersonId` use the pattern:
  ```ts
  const [personId, setPersonId] = useState(initialPersonId ?? '');
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  useEffect(() => { if (initialPersonId !== undefined) setPersonId(initialPersonId); }, [initialPersonId]);
  // Guard in fetch effect:
  if (!personId) return;
  ```

### State management
- `useState` + `useEffect` for async data — no external state library
- `useState` only initializes once — always use `useEffect` to sync prop → state when the prop loads asynchronously
- Cleanup async effects with `let active = true; return () => { active = false; }`

### Approved external packages (install before using)
All MIT or Apache-2.0. Frontend: `npm install <pkg> --prefix frontend`. Backend: `npm install <pkg>`.

| Package | Purpose |
|---------|---------|
| `recharts` | All charts — bar, line, area, pie, donut, radar, gauge, treemap |
| `d3-org-chart` + `d3` | Interactive org chart |
| `cmdk` | Command palette (Cmd+K) |
| `sonner` | Toast notifications |
| `xlsx` (SheetJS CE) | XLSX export |
| `date-fns` | Date formatting |
| `@dnd-kit/core` | Drag-and-drop |

Do not install any package not on this list without asking first.

---

## 5. Testing Requirements

### After every frontend change
```bash
npm --prefix frontend run test
```
All 53 test files must pass. Never leave the suite in a failing state.

### After every backend change
```bash
node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit
```
Plus run relevant backend tests if the changed module has them:
```bash
npm run test:unit
npm run test:integration
```

### When adding new components or hooks
- Write a corresponding test file alongside the implementation.
- Test file lives at the same path as the component with `.test.tsx` / `.test.ts` suffix.
- Mock all API calls via `vi.mock('@/lib/api/...')`.
- Use `@testing-library/react` + `userEvent` for component tests.

### Do not break existing tests to make new code compile
- If a new field is added to a type that existing tests use, update the test fixtures.
- If a mock needs a new field, add it with a sensible default.
- Run the full test suite before declaring a task done.

---

## 6. Documentation Update Rules

### After each **tracker item** is complete
- Check the tracker item off in `docs/planning/MASTER_TRACKER.md`.
- Nothing else required for individual items.

### After each **sub-phase** is complete (e.g., 4a, 4b, 4c, 5)
- Update `docs/planning/current-state.md`:
  - Move newly implemented capabilities from "outstanding" to "implemented"
  - Update the `_Last updated:` date
  - Update the "Highest-value remaining gaps" list
- Update the status summary table in `docs/planning/MASTER_TRACKER.md`.
- Update the relevant memory file (or create one) for the phase.

### After each **phase** is complete (e.g., Phase 5, Phase 6)
- Update `docs/planning/current-state.md` comprehensively.
- Add or update the memory file for the phase.
- Update `MEMORY.md` index.

### Never edit `docs/planning/MASTER_TRACKER.md` except to
- Check off `[ ]` → `[x]` or mark `[-]`
- Update the status summary table
- Add an inline note to a blocked item

---

## 7. Phase Completion Checklist

Run this checklist before declaring any phase or sub-phase done:

- [ ] All tracker items for the phase are `[x]` or `[-]`
- [ ] `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit` — no errors
- [ ] `npm --prefix frontend run test` — all tests pass
- [ ] `docs/planning/current-state.md` updated
- [ ] `docs/planning/MASTER_TRACKER.md` status summary updated
- [ ] Memory file created or updated for the phase

---

## 8. Common Pitfalls — Do Not Repeat

These were discovered during Phases 1–3:

1. **`useState` does not sync props.** Always add `useEffect(() => { if (prop !== undefined) setState(prop); }, [prop])` when a prop loads asynchronously (e.g., from auth).

2. **Prisma `select` must include all accessed fields.** If you add `membership.resourcePool.name`, the Prisma select must have `{ id: true, name: true }` — not just `{ id: true }`.

3. **New required fields on shared types break all test fixtures.** When adding a field to `PersonDirectoryRecord`, `ProjectDetails`, or similar types, immediately search for all usages in test files and add the field there too.

4. **`window.confirm()` is banned for new destructive actions.** Use `ConfirmDialog` component instead. Existing `window.confirm()` calls should be replaced as they are encountered.

5. **Hardcoded UUIDs for default people are banned.** Use `principal?.personId` from `useAuth()`. If the principal is not loaded yet, initialize with `''` and guard the fetch.

6. **Hardcoded `asOf` dates are banned.** All date defaults must use `() => new Date().toISOString()` as the `useState` initializer.

7. **Never mock the real DB in backend integration tests.** Integration tests hit a real test database — this was intentional after a prior incident where mocked tests passed but a real migration failed.

8. **`@AllowSelfScope` is the correct mechanism for ownership checks.** Add it alongside `@RequireRoles` on controller methods where a person should only access their own data. Do not duplicate ownership logic in the service layer.

9. **`dist/` is owned by root** (built inside Docker). Cannot delete it locally. Use `node node_modules/typescript/bin/tsc --noEmit` for type checking — never `nest build` locally.

10. **Do not commit with `--no-verify`.** Fix failing hooks instead.

11. **All persistent data must be DB-backed (Prisma).** As of 2026-04-11, all domain repositories use Prisma. In-memory implementations exist only for: (a) external system adapters (Jira, M365, Radius), (b) webhook service (no Prisma model), (c) CaseSLA config (operational, not persistent). Never add new in-memory stores for persistent data.

12. **`frontend/node_modules/.bin` and `@types/` are owned by root** (from Docker builds). Cannot `npm install` locally — use `docker compose exec frontend npm install <pkg>` or rebuild the container.

13. **`useAuth()` returns impersonated identity when active.** The admin "View as" feature overlays the impersonated person's `personId`, `displayName`, and `roles` onto `useAuth().principal`. All downstream code (dashboards, role guards, data hooks) automatically reflects the impersonated user.

14. **Project detail page has no CTA to approve work hours.** This is a known gap — the "Resolve" action from the Planned vs Actual dashboard cannot currently lead to an approval flow on the project detail page. Future work needed: add work-hour approval actions to `ProjectDetailsPlaceholderPage.tsx`.

15. **Modal components must not call hooks unconditionally.** When a modal uses `useAuth()` or other context hooks, wrap the inner component and only render it when `open` is true. This prevents "must be used within Provider" errors in tests and avoids unnecessary hook calls when the modal is hidden.

16. **Modal windows must follow the common theme.** Use `var(--color-surface)` for background, `var(--color-border)` for borders, `var(--shadow-modal)` for shadows, and `var(--color-text)` / `var(--color-text-muted)` for text. Never use raw `#fff` or `rgba()` in modal CSS — the `.confirm-dialog` class already uses tokens.

---

## 9. Design System & UI Standards

### Canonical reference page
`frontend/src/routes/dashboard/DashboardPage.tsx` (Workload Overview) is the gold-standard page. All dashboard and page redesign work must match its structure and visual language. Full code-level reference saved in memory at `reference-dashboard-design.md`.

### Dashboard page grammar (top to bottom)
1. **Title bar** — `useTitleBarActions()` injects filters + quick-action links + `<TipTrigger />`
2. **KPI strip** — `<div className="kpi-strip">` with `<Link className="kpi-strip__item">` children (NEVER `<button>`)
3. **Hero chart** — `<div className="dashboard-hero">` with `__header` (title + subtitle) and `__chart` child
4. **Action table** — `<div className="dash-action-section">` with `DataTable variant="compact"` inside
5. **Secondary analysis** — `SectionCard`s in inline grid (`repeat(2, minmax(0, 1fr))` — NOT `dashboard-grid` class which spans last child)
6. **Data freshness** — `<div className="data-freshness">` with timestamp + refresh button

### KPI strip rules
- Each item is a `<Link>` or `<a>` — never `<button>` (buttons get browser default styling)
- Left border color set via threshold helper: `style={{ borderLeft: '3px solid ${tc(val, warn, danger)}' }}`
- Contains: `TipBalloon`, `.kpi-strip__value`, `.kpi-strip__label`, optional `.kpi-strip__progress`, `.kpi-strip__context`, `.kpi-strip__sparkline`
- Threshold helper: `tc(val, warn, danger, higherIsBad=true)` returns `var(--color-status-active|warning|danger)`

### Required shared components (never reinvent)
| Component | Import | Usage |
|-----------|--------|-------|
| `DataTable` | `@/components/common/DataTable` | All tabular data. Use `variant="compact"` in dashboards. Never raw `<table>` in new page code. |
| `StatusBadge` | `@/components/common/StatusBadge` | All status indicators. Tones: `active`, `warning`, `danger`, `info`, `neutral`, `pending`. Variants: `dot`, `chip`, `text`, `score`. |
| `SectionCard` | `@/components/common/SectionCard` | All content section framing. Supports `title`, `collapsible`, `chartExport`. |
| `PageContainer` | `@/components/common/PageContainer` | Layout shell for every page. Use `testId` prop. |
| `EmptyState` | `@/components/common/EmptyState` | All empty-data states. Must include forward action (UX Law 2). |
| `ErrorState` | `@/components/common/ErrorState` | All error states. `description` prop. |
| `LoadingState` | `@/components/common/LoadingState` | All loading states. `variant="skeleton"` + `skeletonType="page"` for dashboards. |
| `TipBalloon` | `@/components/common/TipBalloon` | Contextual help tooltips. `arrow="left"` or `"top"`. |
| `ConfirmDialog` | `@/components/common/ConfirmDialog` | All destructive actions. Props: `open`, `onCancel`, `onConfirm(reason?)`, `message`, `title`. |
| `Sparkline` | `@/components/charts/Sparkline` | Mini trend lines in KPI cards. `data: number[]`, `height`, `width`, `color`. |

### Color tokens (never use raw hex in page files)
- **Status:** `var(--color-status-active)` green, `var(--color-status-warning)` amber, `var(--color-status-danger)` red, `var(--color-status-info)` cyan, `var(--color-status-neutral)` grey
- **Text:** `var(--color-text)` primary, `var(--color-text-muted)` secondary, `var(--color-text-subtle)` tertiary
- **Surfaces:** `var(--color-surface)` main, `var(--color-surface-alt)` alternate/header bg, `var(--color-bg)` page bg
- **Borders:** `var(--color-border)` standard, `var(--color-border-strong)` emphasis
- **Accent:** `var(--color-accent)` links and primary brand
- **Charts:** `var(--color-chart-1)` through `var(--color-chart-8)` — use sequentially for multi-series
- **Shadows:** `var(--shadow-card)`, `var(--shadow-dropdown)`, `var(--shadow-modal)`
- **Spacing:** `var(--space-1)` 4px through `var(--space-10)` 40px
- Token source: `frontend/src/styles/design-tokens.ts` (single source of truth, drives both CSS vars and MUI theme)
- Guardrail: `npm run tokens:check` must pass — blocks new raw hex outside token files
- Baseline: `scripts/design-token-baseline.json` — update intentionally if raw hex is unavoidable (e.g., chart library requirement)

### Tabular numbers
```ts
const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };
```
Use on all numeric table columns.

### Dashboard compact tables
Inside dashboard pages, compact data sections use `<table className="dash-compact-table">` — this is the established pattern for dashboard-embedded tables. `DataTable` is used for the primary action table only.

### Action table column pattern (from DashboardPage)
`#` (28px) → Severity (`StatusBadge variant="dot"`, 88px) → Category (140px) → Entity (fontWeight 500, flex) → Code (text-muted, 72px) → Impact (fontSize 11, 220px) → Portfolio % (right, 90px) → Status (`StatusBadge`, 80px) → Suggested Action (fontSize 11, 170px) → Go link (accent, 40px)

### Pagination in action section
Place inside `dash-action-section__summary`:
```html
<button className="button button--secondary button--sm" disabled={page<=1}>←</button>
<span style={{ fontSize: 11 }}>Page {n} of {total}</span>
<button className="button button--secondary button--sm" disabled={page>=total}>→</button>
```

### Hero chart height gotcha
`dashboard-hero__chart` is `flex: 1; min-height: 0`. Recharts `<ResponsiveContainer height="100%">` needs explicit parent height. For vertical bar charts: `style={{ minHeight: Math.max(300, rows * 50) }}` on the `__chart` div.

### RBAC in UI
- All role arrays centralized in `frontend/src/app/route-manifest.ts` — never define local role arrays
- Use `hasAnyRole(userRoles, ROLE_CONSTANT)` from route-manifest for role checks
- Use `canAccessRoute(path, roles)` for route visibility checks

### No mock data in app code
Never insert mock, fake, or placeholder data into the application or frontend code. If a page needs data to render, the data must come from the database via the seed script. Use `docker compose exec -e SEED_PROFILE=phase2 backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"` to populate. If the seed is missing data for a feature, add it to the seed script — not to the app.

### Dropdown selectors — standard style
All dropdown selectors in title bars and filter bars must use the `<select className="field__control">` pattern (matching `PersonSelect`). Never use `<input>` + `<datalist>` — it produces inconsistent browser-native UI. Wrap in `<label className="field"><span className="field__label">Label</span><select ...>`.

### Action section summary bar — standard layout
The `dash-action-section__summary` bar at the bottom of every action/detail section must follow this centered layout:
```
left label (flex: 1 1 0, text-align: left) | centered pagination | right label (flex: 1 1 0, text-align: right)
```
Pagination is always shown (even on page 1 of 1). Use the `PaginationBar` pattern: `← Page N of M →` centered between the left summary text and right context text. This is the standard for all `dash-action-section` components.

### Page grammars (Phase 18)
Every page must conform to one of 8 grammars documented in `docs/planning/phase18-page-grammars.md`:
1. Decision Dashboard — dashboards
2. List-Detail Workflow — directories and registries
3. Detail Surface — entity detail pages
4. Create/Edit Form — creation and editing flows
5. Operational Queue — triage and approval surfaces
6. Analysis Surface — reports
7. Admin Control Surface — admin/config pages
8. Auth Form — login/reset flows

### UX Laws (enforced — see `.claude/rules/ux-laws.md`)
Key ones for design work: Law 2 (no dead-end screens), Law 3 (no context loss after actions), Law 4 (action-data adjacency within 200px), Law 5 (filter persistence via URL), Law 9 (every KPI is a clickable drilldown).

### Design system documentation maintenance
When changing any design pattern, component API, page grammar, token, or CSS class:
- Update `docs/planning/phase18-page-grammars.md` if a grammar changes
- Update `docs/planning/phase18-refactor-standards.md` if a primitive or verification rule changes
- Update `docs/planning/phase18-standardization-changelog.md` with a log entry for the affected page
- Update `docs/planning/phase18-route-jtbd-audit.md` if routes, personas, or grammar assignments change
- Update `scripts/design-token-baseline.json` if new raw colors are unavoidable
- Update `docs/testing/slo-budgets.json` if latency/error budgets change
- Update `docs/testing/jtbd-matrix.json` if JTBD-to-test mappings change
- When redesigning a page: update its entry in the standardization changelog and verify it against the Phase 18 verification template (Section 2 of `phase18-refactor-standards.md`)

---

## 10. Seed Data Reference

Phase 2 seed profile creates the canonical test dataset. It seeds ALL DB-backed entities including metadata dictionaries, notification infrastructure, platform settings, skills, timesheets, pulse entries, case steps, and in-app notifications. Seed command:
```bash
docker compose exec -e SEED_PROFILE=phase2 backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"
```

Key test accounts (full list in `docs/planning/current-state.md`):
| Role | Email | Password |
|------|-------|----------|
| admin | admin@deliverycentral.local | DeliveryCentral@Admin1 |
| director | noah.bennett@example.com | DirectorPass1! |
| hr_manager | diana.walsh@example.com | HrManagerPass1! |
| resource_manager | sophia.kim@example.com | ResourceMgrPass1! |
| project_manager | lucas.reed@example.com | ProjectMgrPass1! |
| delivery_manager | carlos.vega@example.com | DeliveryMgrPass1! |
| employee | ethan.brooks@example.com | EmployeePass1! |

---

## 10. Key File Locations

| File | Purpose |
|------|---------|
| `docs/planning/MASTER_TRACKER.md` | Single source of truth for all outstanding work |
| `docs/planning/current-state.md` | What is implemented vs outstanding |
| `docs/testing/MANUAL_TEST_PLAN.md` | Comprehensive manual test plan (142 tests) |
| `docs/planning/DELIVERY_CENTRAL_PRODUCT_BACKLOG.md` | Original backlog (read-only reference) |
| **Design system & standards** | |
| `frontend/src/styles/design-tokens.ts` | Single source of truth for color, spacing, and shadow tokens |
| `frontend/src/styles/global.css` | All CSS classes (kpi-strip, dashboard-hero, dash-action-section, etc.) |
| `frontend/src/app/route-manifest.ts` | Centralized route/role/nav manifest — all role constants and access helpers |
| `scripts/check-design-tokens.cjs` | Raw-color guardrail (`npm run tokens:check`) |
| `scripts/design-token-baseline.json` | Allowed raw-color exceptions (ratcheting baseline) |
| `docs/planning/phase18-page-grammars.md` | 8 canonical page grammars with structural zones |
| `docs/planning/phase18-refactor-standards.md` | Shared primitives checklist, verification template, context continuity |
| `docs/planning/phase18-route-jtbd-audit.md` | Route-to-JTBD mapping for all 60+ routes |
| `docs/planning/phase18-standardization-changelog.md` | Per-page standardization status log |
| `docs/testing/slo-budgets.json` | API latency and UI performance budgets |
| `docs/testing/jtbd-matrix.json` | Machine-readable JTBD-to-test mapping per persona |
| `.claude/rules/ux-laws.md` | 10 UX operating laws enforced on every UI change |
| **Application core** | |
| `frontend/src/app/auth-context.tsx` | Auth context + impersonation overlay |
| `frontend/src/app/impersonation-context.tsx` | Admin "View as" impersonation state |
| `frontend/src/lib/labels.ts` | Enum → human label maps |
| `frontend/src/lib/api/` | All frontend API clients |
| `frontend/src/features/dashboard/` | All dashboard hooks + selectors |
| `frontend/src/components/common/` | All shared UI primitives (DataTable, StatusBadge, SectionCard, etc.) |
| `frontend/src/routes/dashboard/DashboardPage.tsx` | **Canonical dashboard reference** (Workload Overview) |
| `src/modules/identity-access/application/` | RBAC guard, roles decorator, self-scope decorator |
| `prisma/schema.prisma` | DB schema (53 models) |
| `prisma/seed.ts` | Seed script (5 profiles: demo, phase2, bank-scale, life-demo, investor-demo) |
