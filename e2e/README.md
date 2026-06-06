# DeliveryCentral E2E Test Suite

Playwright-driven end-to-end tests for the DeliveryCentral platform. Specs live next to this README in `e2e/` and run via the root-level `playwright.config.ts`.

## Layout

```
e2e/
├── auth.setup.ts            # Per-role login + storageState capture
├── fixtures/                # Shared fixtures (auth state, demo identifiers)
├── helpers/                 # Test helpers
├── tests/                   # Standard E2E specs
├── phase2/                  # Phase 2 role-based journey specs
├── ux-laws/                 # UX-law assertions
├── ux-regression/           # UX regression specs
├── v2/                      # V2 visual-regression baseline (see below)
└── workload-happy-path.spec.ts
```

## Running locally

```bash
# Default (spawns local backend + frontend, runs chromium project):
npx playwright test

# Specific spec:
npx playwright test e2e/workload-happy-path.spec.ts

# Smoke-only (skip the auth.setup project, useful when CI auth flake-rerun):
PLAYWRIGHT_SMOKE_ONLY=true npx playwright test
```

## V2 Playwright Baseline

Visual-regression net for the C0 cutover. Captures 30 critical pages × 4 viewports = 120 PNG snapshots against the v2-staging deployment.

### Files

- `e2e/v2/routes.json` — manifest of 30 routes + 4 viewports
- `e2e/v2/baseline.spec.ts` — single spec that iterates the manifest
- `e2e/v2/snapshots/` — snapshot artefacts directory. `.png` files are gitignored; the workflow uploads them as a CI artefact.
- `.github/workflows/v2-playwright-baseline.yml` — manual `workflow_dispatch` trigger

### Run against v2-staging from CI

The expected execution path. Triggers from the Actions UI or:

```bash
gh workflow run v2-playwright-baseline.yml \
  -f base_url=https://deliverit-test-v2.agentic.uz \
  -f api_base=https://deliverit-test-v2.agentic.uz/api \
  -f sample_person_id=<personId> \
  -f sample_project_id=<projectId> \
  -f sample_position_id=<positionId> \
  -f update_snapshots=false
```

Pass `update_snapshots=true` only when intentionally re-baselining. Outputs the `v2-baseline-snapshots` artifact (snapshots + Playwright HTML report + diff images, 30-day retention).

### Run locally against v2-staging

```bash
PLAYWRIGHT_V2_BASELINE=true \
V2_STAGING_BASE_URL=https://deliverit-test-v2.agentic.uz \
PLAYWRIGHT_API_BASE=https://deliverit-test-v2.agentic.uz/api \
V2_BASELINE_PERSON_ID=<id> \
V2_BASELINE_PROJECT_ID=<id> \
V2_BASELINE_POSITION_ID=<id> \
npx playwright test --project=v2-baseline
```

Setting `PLAYWRIGHT_V2_BASELINE=true` disables the local `webServer` so the spec hits the configured staging origin directly.

### Auth

The spec authenticates as `admin@deliverycentral.local` (universal access). Role-specific RBAC screens can be added later by updating `routes.json` `role` fields and adding a per-role login fixture.

### Updating the baseline

1. Run the workflow with `update_snapshots=true`.
2. Download the `v2-baseline-snapshots` artefact.
3. Inspect the PNGs; if they reflect intended UI, commit the selected `.png` files into `e2e/v2/snapshots/` and push.
4. Subsequent workflow runs without `update_snapshots` will diff against the committed baseline and fail on regressions (>2% pixel ratio).

### Sample-ID resolution

Routes containing `{personId}` / `{projectId}` / `{positionId}` placeholders are skipped if the corresponding env var is empty. Always pass these IDs when invoking the workflow to cover detail routes.
