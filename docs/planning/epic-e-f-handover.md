# Epic E/F Handover

**Date:** 2026-04-14  
**Repo:** `/home/drukker/DeliveryCentral`  
**Audience:** next implementation agent for Phase 17 Epics E and F

## Current state

- Epic A is complete.
- Epic B is complete.
- Epic C is complete on the frontend standardization path.
- Epic D is complete for token/theming unification.
- Epic E is in progress.
- Epic F has not started.

## What changed before handoff

### Epic D foundation now in place

- Shared token source lives in [frontend/src/styles/design-tokens.ts](/home/drukker/DeliveryCentral/frontend/src/styles/design-tokens.ts:1).
- MUI theme and CSS variable application now derive from the same source:
  - [frontend/src/app/theme.ts](/home/drukker/DeliveryCentral/frontend/src/app/theme.ts:1)
  - [frontend/src/main.tsx](/home/drukker/DeliveryCentral/frontend/src/main.tsx:1)
  - [frontend/src/app/App.tsx](/home/drukker/DeliveryCentral/frontend/src/app/App.tsx:1)
  - [frontend/src/routes/settings/AccountSettingsPage.tsx](/home/drukker/DeliveryCentral/frontend/src/routes/settings/AccountSettingsPage.tsx:1)
- Duplicate theme token blocks were removed from [frontend/src/styles/global.css](/home/drukker/DeliveryCentral/frontend/src/styles/global.css:1).
- Raw-color guardrail is active through:
  - [scripts/check-design-tokens.cjs](/home/drukker/DeliveryCentral/scripts/check-design-tokens.cjs:1)
  - [scripts/design-token-baseline.json](/home/drukker/DeliveryCentral/scripts/design-token-baseline.json:1)
  - root script `npm run tokens:check`

### Epic E foundation now in place

- Shared route/permission/nav manifest lives in [frontend/src/app/route-manifest.ts](/home/drukker/DeliveryCentral/frontend/src/app/route-manifest.ts:1).
- [frontend/src/app/navigation.ts](/home/drukker/DeliveryCentral/frontend/src/app/navigation.ts:1) is now a thin re-export shim.
- Router consumes manifest role groups in [frontend/src/app/router.tsx](/home/drukker/DeliveryCentral/frontend/src/app/router.tsx:1).
- Sidebar visibility now uses the same access rules in [frontend/src/components/layout/SidebarNav.tsx](/home/drukker/DeliveryCentral/frontend/src/components/layout/SidebarNav.tsx:1).
- Added parity/persona tests in [frontend/src/app/route-manifest.test.tsx](/home/drukker/DeliveryCentral/frontend/src/app/route-manifest.test.tsx:1).

## Important bug already fixed

- Employee dashboard nav visibility was mismatched before handoff.
- Router allowed `employee` to access `/dashboard/employee`, but sidebar visibility logic excluded `employee`.
- This is now fixed through the shared manifest and test coverage.

## Verified before handoff

- `npm run tokens:check`
- `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.app.json --noEmit`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test -- src/app/route-manifest.test.tsx src/app/App.test.tsx src/components/common/common.test.tsx`

## Known gaps

### Epic E

- Manifest centralization is in place, but not every role-sensitive page has been fully normalized onto shared helpers yet.
- There are still scattered role arrays and role checks outside the central manifest, especially in route/page-level UI logic.
- Persona smoke checks were added at the unit/parity level, but the requested full persona smoke path coverage is not complete yet.
- Playwright MCP validation was attempted but blocked by an MCP browser transport issue, so there is still room for live UI persona verification once the browser tool is healthy.

### Epic F

- No dashboard read-model scaling changes have been implemented yet.
- No benchmark budgets were added yet for dashboard service/query paths.
- No production-path cleanup has been done yet for in-memory repo dependencies in dashboard read flows.

## Recommended next steps for Epic E

1. Audit remaining role arrays and direct role checks outside [frontend/src/app/route-manifest.ts](/home/drukker/DeliveryCentral/frontend/src/app/route-manifest.ts:1).
2. Replace duplicated access logic with shared helpers from the manifest module.
3. Add tests for:
   - visible-but-forbidden mismatches
   - forbidden-but-hidden mismatches
   - route-manifest coverage for critical detail/create/admin routes
4. Add persona smoke coverage for:
   - Employee
   - Project Manager
   - Resource Manager
   - HR Manager
   - Director
   - Admin
5. Once Playwright MCP/browser transport is working again, run live nav/access sanity checks against the local stack.

## Recommended discovery path for Epic F

Start by locating dashboard query/read services and identifying where production code still depends on in-memory aggregation or repeated linear lookups.

Likely search prompts:

- `rg -n "dashboard" src frontend/src`
- `rg -n "in-memory|InMemory|Map\\(|reduce\\(|find\\(" src/modules src`
- `rg -n "query service|read model|projection" src/modules`

Areas likely worth checking first:

- backend dashboard application/query services
- director/hr/resource-manager/project-manager dashboard endpoints
- any adapter layer returning prejoined or repeatedly scanned collections
- performance tests around dashboard runtime, especially [test/performance/workload-dashboard.performance.spec.ts](/home/drukker/DeliveryCentral/test/performance/workload-dashboard.performance.spec.ts:1)

## Suggested Epic F execution order

1. Identify production dashboard read paths with repeated lookup scans.
2. Refactor hot paths to precomputed maps/indexes.
3. Remove in-memory repository dependencies from production read flows.
4. Add or tighten performance tests and runtime budgets.
5. Verify with scale-oriented seeded scenarios.

## Constraints to preserve

- Keep the one-PR-per-task-group sequencing from the Phase 17 tracker.
- Do not undo the new route manifest structure.
- Do not relax `tokens:check`; if new raw-color exceptions are unavoidable, update the baseline intentionally and explain why.
- Preserve the current frontend/container build path, which is already working.

## Reference tracker

- [docs/planning/phase17-runtime-standardization-plan.md](/home/drukker/DeliveryCentral/docs/planning/phase17-runtime-standardization-plan.md:1)
