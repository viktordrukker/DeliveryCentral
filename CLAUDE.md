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

---

## 9. Seed Data Reference

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
| `frontend/src/app/navigation.ts` | All routes + `allowedRoles` definitions |
| `frontend/src/app/auth-context.tsx` | Auth context + impersonation overlay |
| `frontend/src/app/impersonation-context.tsx` | Admin "View as" impersonation state |
| `frontend/src/lib/labels.ts` | Enum → human label maps |
| `frontend/src/lib/api/` | All frontend API clients |
| `frontend/src/features/dashboard/` | All dashboard hooks |
| `src/modules/identity-access/application/` | RBAC guard, roles decorator, self-scope decorator |
| `prisma/schema.prisma` | DB schema (53 models) |
| `prisma/seed.ts` | Seed script (5 profiles: demo, phase2, bank-scale, life-demo, investor-demo) |
