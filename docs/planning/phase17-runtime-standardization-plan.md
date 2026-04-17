# Phase 17 — Runtime Optimization, UI Standardization & Release Gates

**Status:** In progress  
**Started:** 2026-04-14  
**Execution rule:** one PR per task group, merged in order from Epic A through Epic G

## PR groups

| PR | Epic | Priority | Scope | Status |
|----|------|----------|-------|--------|
| PR-17A | Epic A — Test runtime optimization | P0 | Backend Jest lane split, worker policy, CI ordering, runtime targets | Complete |
| PR-17B | Epic B — Playwright performance and stability | P0 | Role-based auth state, worker tuning, tag split, CI sharding | Complete |
| PR-17C | Epic C — UI standardization system | P1 | Canonical table and badge primitives, high-traffic migration, regression tests | Complete |
| PR-17D | Epic D — Token/theming unification | P1 | Single token source, CSS vars + MUI derivation, raw-color guardrail | Complete |
| PR-17E | Epic E — RBAC/navigation consistency | P1 | Shared route manifest, visibility/permission parity tests, persona smokes | Complete |
| PR-17F | Epic F — Dashboard read-model scaling | P1 | Precomputed read models, production path cleanup, performance budgets | Complete |
| PR-17G | Epic G — Operability and JTBD release gates | P1/P2 | SLO budgets, JTBD matrix, CI summaries, regression gates | Complete |

## Ordered acceptance criteria

### Epic A — Test runtime optimization

- Remove blanket `--runInBand` usage from root backend scripts where safe.
- Keep DB-coupled repository and integration suites serialized by default.
- Add `test:fast`, `test:db`, `test:slow`, `verify:pr`, and `verify:full`.
- Make Jest worker behavior configurable for CI and local runs.
- Reorder CI so fast lanes fail first and slower lanes run later.
- Document runtime targets for local and CI execution.

### Epic B — Playwright performance and stability

- Replace repeated login helpers with role-based `storageState` auth.
- Tune Playwright workers and environment controls in config.
- Tag specs into `@smoke`, `@critical`, and `@full`.
- Shard non-smoke suites in CI.
- Keep smoke as the merge gate.

### Epic C — UI standardization system

- Consolidate duplicate table primitives into one canonical API with variants.
- Consolidate status indicators into one canonical badge API.
- Migrate dashboard, projects, assignments, and people first.
- Reduce inline styles in favor of shared tokens and primitives.
- Add regression coverage for core design-system primitives.

### Epic D — Token/theming unification

- Create one design-token source of truth.
- Derive CSS variables and the MUI theme from that source.
- Remove duplicate hardcoded values.
- Add a guardrail blocking new raw color constants outside token files.

### Epic E — RBAC/navigation consistency

- Build one shared route manifest for router, sidebar, and permissions.
- Remove duplicated role arrays.
- Add tests for visible-but-forbidden and forbidden-but-visible mismatches.
- Add persona smoke checks for Employee, PM, RM, HR, Director, and Admin critical paths.

### Epic F — Dashboard read-model scaling

- Refactor dashboard query services to precomputed lookup maps.
- Remove in-memory repository dependencies from production read paths.
- Add scale benchmarks and runtime budgets.

### Epic G — Operability and JTBD release gates

- Define latency and error budgets for critical APIs and UI flows.
- Add CI gates for regressions on critical paths.
- Create a machine-readable JTBD matrix mapped to API, UI, and e2e assertions.
- Publish JTBD summaries in CI output.

## Runtime targets introduced in PR-17A

| Command | Local target | CI target |
|---------|--------------|-----------|
| `npm run test:fast` | <= 30s | <= 60s |
| `npm run test:db` | <= 90s | <= 180s |
| `npm run test:slow` | <= 60s | <= 120s |
| `npm run verify:pr` | <= 5m | <= 8m |
| `npm run verify:full` | <= 10m | <= 15m |

## Notes

- DB-coupled Jest suites stay serialized until the test database can be safely isolated per worker.
- Epic B depends on the CI lane split from Epic A so Playwright smoke and full coverage can be promoted independently.
- PR-17C now also includes the frontend container build hardening needed to keep the standardized UI surfaces shippable in production images.
- PR-17D introduces `frontend/src/styles/design-tokens.ts` as the single theme/token source and adds `npm run tokens:check` with a ratcheting baseline for existing raw-color debt.
- PR-17E now centralizes role/path visibility in `frontend/src/app/route-manifest.ts`, fixing the employee dashboard sidebar mismatch and adding parity/persona coverage in `frontend/src/app/route-manifest.test.tsx`.
