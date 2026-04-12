> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# Agent Handoff

This document is a practical starting brief for the next AI agent working in this repository.

## Start here

Read these first:

1. [System overview](../architecture/000-system-overview.md)
2. [Current state](./current-state.md)
3. [Next steps roadmap](./next-steps-roadmap.md)
4. [Persona JTBDs](./persona-jtbds.md)

## Runtime commands

Supported local runtime is Docker-only.

Core commands:

```powershell
Copy-Item .env.example .env
docker compose build
docker compose run --rm migrate
docker compose --profile tools run --rm seed
docker compose up -d backend frontend
```

Useful commands:

```powershell
docker compose ps
docker compose logs -f backend
docker compose exec -T backend npm run platform:self-check
docker compose exec -T backend npm run platform:operator-drills
```

Useful URLs:

- frontend: `http://localhost:5173`
- health: `http://localhost:3000/api/health`
- readiness: `http://localhost:3000/api/readiness`
- diagnostics: `http://localhost:3000/api/diagnostics`
- docs: `http://localhost:3000/api/docs`

## Testing commands

### Backend focused test

```powershell
docker compose run --rm backend npm test -- --runTestsByPath <path-to-spec> --runInBand --forceExit --detectOpenHandles
```

### Frontend focused test

```powershell
docker compose run --rm --no-deps frontend npm test -- <path-to-spec>
```

### Validation / readiness

```powershell
docker compose exec -T backend npm run platform:self-check
docker compose exec -T backend sh -lc "SELF_CHECK_INCLUDE_TEST_BASELINE=true npm run platform:self-check"
```

## Areas with strongest code/docs alignment

These are relatively safe starting points because code, tests, UI, and docs already exist together:

- employee lifecycle and reporting-line management
- assignment lifecycle and override flows
- project lifecycle and override flows
- team management and team dashboard
- role-specific dashboards
- business audit, monitoring, and exception queue
- notifications admin and recent outcomes
- Jira/M365/RADIUS integrations admin and reconciliation review
- UAT packs, release-readiness checks, and operator drills

## Areas where planning should be careful

### Identity and auth maturity

Do not assume a real external identity provider is already integrated.

What exists:

- bearer-token auth
- preserved RBAC semantics
- local/test token helpers

What remains:

- provider-backed OIDC/JWKS integration
- fuller self-scope enforcement
- better frontend session behavior for protected routes

Read:

- [Authentication](../security/authentication.md)
- [RBAC](../security/rbac.md)

### Supporting subsystem durability

Core business contexts are durable, but supporting subsystems still deserve careful verification.

Check module wiring and docs before assuming a subsystem is fully production-depth:

- [Organization module](../../src/modules/organization/organization.module.ts)
- [Assignments module](../../src/modules/assignments/assignments.module.ts)
- [Project Registry module](../../src/modules/project-registry/project-registry.module.ts)
- [Work Evidence module](../../src/modules/work-evidence/work-evidence.module.ts)
- [Notifications module](../../src/modules/notifications/notifications.module.ts)

### Team, org, and project boundaries

Do not casually merge:

- `Team`
- `OrgUnit`
- `Project`

Those boundaries are now explicitly modeled in runtime behavior, UI, and docs.

Read:

- [Team management](../domains/team-management.md)
- [Team dashboard](../domains/team-dashboard.md)
- [Project lifecycle](../domains/project-lifecycle.md)
- [Organization](../domains/organization.md)

## Recommended task selection heuristics

Choose work that:

- deepens operator usefulness rather than re-adding already-finished UI
- extends an existing test or validation layer instead of inventing a new one
- preserves API contracts unless a change is truly necessary
- respects bounded-context ownership
- keeps docs, self-checks, and runtime wiring aligned

Prefer tasks that unlock more future work:

- provider-grade auth integration
- exception and reconciliation operator actions
- durable supporting-subsystem hardening
- cross-context read-model optimization
- rollout/UAT evidence automation

## Practical rules for future changes

- keep configuration environment-driven
- keep local runtime Docker-only
- update docs for meaningful feature or operational changes
- preserve source-of-truth boundaries:
  - assignments are staffing truth
  - work evidence is observational truth
  - integrations are read-only inputs or isolated outbound transport boundaries
- avoid pushing business rules into transports, monitoring helpers, or provider adapters

## Suggested first checks before editing

1. Inspect the target module wiring.
2. Inspect existing docs in `docs/api`, `docs/domains`, `docs/ui`, and `docs/testing`.
3. Search for an existing spec in `test/` or `frontend/src/**/*.test.tsx`.
4. Reuse existing scenario runners, self-check scripts, and UAT packs before adding new scaffolding.

## Good next-agent tasks

- integrate provider-backed OIDC/JWKS auth while preserving RBAC
- add exception and reconciliation review actions with auditability
- tighten notification runtime durability and visibility under restart
- improve filtered linking between dashboards, exceptions, audit, and project conflict views
- extend browser-level UAT and rollout evidence generation
- optimize high-value dashboard and investigation read paths under scale

## Risk note

The repo now has broad operational coverage.

The main planning risk is no longer "missing features." It is assuming the remaining work is only polish.

For this codebase, the safer stance is:

- trust implemented contracts and tests
- verify live module wiring and validation scripts
- prioritize operational depth over new surface area
